import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  DisbursementTransfer,
  TransferStatus,
} from './entities/disbursement-transfer.entity';
import {
  InitiateTransferResponse,
  TransferHistoryResponse,
  TransferResponse,
  TransferStatusResponse,
} from './dto/transfer.dto';
import {
  NotificationPriority,
  NotificationType,
  UserRole,
} from '../notification/entity/studentNotification.entity';
import { StudentNotificationService } from '../notification/service/studentNotification.service';
import { SponsorAllocation } from '../sponsor/entities/sponsor-allocation.entity';

// Known Malawi MoMo operator ref_ids from PayChangu
const OPERATORS = {
  TNM: '27494cb5-ba9e-437f-a114-4e7a7686bcca',   // 09x numbers
  AIRTEL: '20be6c20-adeb-4b5b-a7ba-0769820df4fb', // 08x numbers
} as const;

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRepository(DisbursementTransfer)
    private readonly transferRepo: Repository<DisbursementTransfer>,
    @InjectRepository(SponsorAllocation)
    private readonly allocationRepo: Repository<SponsorAllocation>,
    @Inject(forwardRef(() => StudentNotificationService))
    private readonly notificationService: StudentNotificationService,
  ) {}

  // ── Initiate a single mobile money payout ──────────────────────────────────

  async initiateTransfer(
    phone: string,
    amount: number,
    name: string,
    sponsorName?: string,
  ): Promise<InitiateTransferResponse> {
    const normalizedPhone = this.normalizePhone(phone);
    const operatorRefId = this.detectOperator(normalizedPhone);
    const chargeId = this.generateChargeId();
    const reference = `DISB-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // ── Pre-flight: check wallet balance (live mode only) ────────────────────
    await this.assertSufficientBalance(amount);

    const isSandbox = this.configService
      .get<string>('PAYCHANGU_MODE', 'sandbox')
      .toLowerCase() !== 'live';

    const payload = {
      mobile: normalizedPhone,
      mobile_money_operator_ref_id: operatorRefId,
      amount: String(amount),
      charge_id: chargeId,
      first_name: name.split(' ')[0] ?? name,
      last_name: name.split(' ').slice(1).join(' ') || undefined,
      // Sandbox-only: forces the simulated transaction to succeed without
      // requiring a real wallet balance. Omitted in live mode.
      ...(isSandbox && { transaction_status: 'successful' }),
    };

    let rawResponse: unknown = null;
    let provider: string | null = null;
    let refId: string | null = null;
    let status = TransferStatus.PENDING;

    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          status: string;
          message: string;
          data?: {
            charge_id?: string;
            ref_id?: string;
            status?: string;
            mobile?: string;
            mobile_money?: { name?: string };
            authorization?: { provider?: string };
          };
        }>(
          `${this.getBaseUrl()}/mobile-money/payouts/initialize`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.getSecretKey()}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      rawResponse = response.data;
      const data = response.data.data ?? {};
      refId = data.ref_id ?? null;
      provider =
        data.mobile_money?.name ??
        data.authorization?.provider ??
        this.operatorName(operatorRefId);

      const apiStatus = (data.status ?? response.data.status ?? '').toLowerCase();
      status = this.normalizeStatus(apiStatus);
    } catch (error) {
      this.logger.error('PayChangu payout failed', error);
      rawResponse = (error as AxiosError)?.response?.data ?? null;
      status = TransferStatus.FAILED;
      this.handlePaychanguError(error, 'initiate payout');
    }

    // Persist the transfer record
    const transfer = this.transferRepo.create({
      chargeId,
      refId: refId ?? undefined,
      reference,
      phone: normalizedPhone,
      name,
      amount: amount.toFixed(2),
      currency: 'MWK',
      provider: provider ?? undefined,
      operatorRefId,
      status,
      sponsorName: sponsorName ?? undefined,
      rawResponse,
    });

    const saved = await this.transferRepo.save(transfer);

    // Notify the student that they have received a disbursement (non-blocking)
    if (status === TransferStatus.SUCCESS || status === TransferStatus.PENDING) {
      this.notifyStudentDisbursement(normalizedPhone, name, amount, sponsorName, reference).catch(
        (err) => this.logger.warn(`Could not send disbursement notification: ${(err as Error).message}`),
      );
    }

    return {
      success: true,
      message: 'Transfer initiated successfully.',
      data: this.toResponse(saved),
    };
  }

  // ── Notify student of disbursement ────────────────────────────────────────

  private async notifyStudentDisbursement(
    phone: string,
    name: string,
    amount: number,
    sponsorName: string | undefined,
    reference: string,
  ): Promise<void> {
    // Normalise the phone to the 10-digit local format for comparison
    const localPhone = phone.startsWith('0') ? phone : phone.replace(/^\+?265/, '0');

    // Find the PersonalDetails record whose payment phone matches
    const personalDetails = await this.allocationRepo.manager
      .getRepository('personal_details')
      .createQueryBuilder('pd')
      .where('pd.payment_phone_number = :phone OR pd.phone_number = :phone', { phone: localPhone })
      .getOne()
      .catch(() => null) as { userId?: string } | null;

    const userId = personalDetails?.userId;
    if (!userId) return;

    // Confirm this student has a sponsor allocation
    const allocation = await this.allocationRepo.findOne({ where: { userId } });
    if (!allocation) return;

    const sponsorPart = sponsorName ? ` from ${sponsorName}` : '';
    const formattedAmount = `MWK ${amount.toLocaleString()}`;

    await this.notificationService.createNotification({
      userId,
      userRole: UserRole.STUDENT,
      title: 'Disbursement Received',
      message: `You have received a payment of ${formattedAmount}${sponsorPart}. Reference: ${reference}.`,
      type: NotificationType.MONEY_RECEIVED,
      priority: NotificationPriority.HIGH,
      metadata: { reference, amount, phone, sponsorName: sponsorName ?? null },
    });
  }

  // ── Get status of a single transfer by reference ───────────────────────────

  async getTransferStatus(reference: string): Promise<TransferStatusResponse> {
    const transfer = await this.transferRepo.findOne({ where: { reference } });

    if (!transfer) {
      throw new NotFoundException(`No transfer found with reference "${reference}".`);
    }

    // If still pending, try to refresh from PayChangu using chargeId
    if (transfer.status === TransferStatus.PENDING && transfer.chargeId) {
      await this.refreshFromPaychangu(transfer);
    }

    return {
      success: true,
      message: 'Transfer status retrieved.',
      data: this.toResponse(transfer),
    };
  }

  // ── Get full transfer history ──────────────────────────────────────────────

  async getTransferHistory(): Promise<TransferHistoryResponse> {
    const transfers = await this.transferRepo.find({
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: transfers.map((t) => this.toResponse(t)),
      total: transfers.length,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async refreshFromPaychangu(transfer: DisbursementTransfer): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{
          status: string;
          data?: { status?: string; ref_id?: string; mobile_money?: { name?: string } };
        }>(
          `${this.getBaseUrl()}/mobile-money/payments/${encodeURIComponent(transfer.chargeId)}details`,
          {
            headers: { Authorization: `Bearer ${this.getSecretKey()}` },
            timeout: 15000,
          },
        ),
      );

      const data = response.data.data ?? {};
      const apiStatus = (data.status ?? '').toLowerCase();
      transfer.status = this.normalizeStatus(apiStatus);
      if (data.ref_id) transfer.refId = data.ref_id;
      if (data.mobile_money?.name) transfer.provider = data.mobile_money.name;
      transfer.rawResponse = response.data;

      await this.transferRepo.save(transfer);
    } catch {
      // Non-fatal — return whatever we have stored
    }
  }

  /**
   * Normalise a Malawi phone number to the 10-digit local format (0XXXXXXXXX)
   * that PayChangu expects for the `mobile` field (9 significant digits after
   * the leading 0, e.g. "0991234567").
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');

    // Local format 0XXXXXXXXX (10 digits) — already correct
    if (digits.startsWith('0') && digits.length === 10) {
      return digits;
    }

    // International without + prefix: 265XXXXXXXXX (12 digits)
    if (digits.startsWith('265') && digits.length === 12) {
      return `0${digits.slice(3)}`;
    }

    // International with + prefix: +265XXXXXXXXX
    if (phone.startsWith('+') && digits.startsWith('265') && digits.length === 12) {
      return `0${digits.slice(3)}`;
    }

    // Bare 9-digit number without leading 0 (e.g. "991234567")
    if (!digits.startsWith('0') && !digits.startsWith('265') && digits.length === 9) {
      return `0${digits}`;
    }

    throw new BadRequestException(
      `Invalid phone number "${phone}". Use format 0991234567 or +265991234567.`,
    );
  }

  /** Detect operator from Malawi phone prefix (expects 0XXXXXXXXX format) */
  private detectOperator(localPhone: string): string {
    // 09xx = Airtel, 08xx = TNM
    if (localPhone.startsWith('09')) return OPERATORS.AIRTEL;
    if (localPhone.startsWith('08')) return OPERATORS.TNM;
    // Default to Airtel if unknown
    return OPERATORS.AIRTEL;
  }

  private operatorName(refId: string): string {
    if (refId === OPERATORS.TNM) return 'TNM Mpamba';
    if (refId === OPERATORS.AIRTEL) return 'Airtel Money';
    return 'Mobile Money';
  }

  private normalizeStatus(status: string): TransferStatus {
    if (['success', 'successful', 'completed', 'paid'].includes(status)) {
      return TransferStatus.SUCCESS;
    }
    if (['failed', 'cancelled', 'canceled', 'declined', 'error'].includes(status)) {
      return TransferStatus.FAILED;
    }
    return TransferStatus.PENDING;
  }

  private generateChargeId(): string {
    return `CHG-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  }

  private toResponse(t: DisbursementTransfer): TransferResponse {
    return {
      id: t.id,
      reference: t.reference,
      phone: t.phone,
      name: t.name,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status as 'pending' | 'success' | 'failed',
      provider: t.provider ?? null,
      externalReference: t.refId ?? null,
      sponsorName: t.sponsorName ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private getSecretKey(): string {
    const key =
      this.configService.get<string>('PAYCHANGU_SECRET_KEY') ??
      this.configService.get<string>('PAYCHANGU_API_KEY');

    if (!key?.trim()) {
      throw new UnauthorizedException('PAYCHANGU_SECRET_KEY is not configured.');
    }

    return key;
  }

  private getBaseUrl(): string {
    const mode = this.configService
      .get<string>('PAYCHANGU_MODE', 'sandbox')
      .toLowerCase();

    return mode === 'live'
      ? 'https://api.paychangu.com'
      : 'https://api.paychangu.com'; // sandbox uses same base URL for payouts
  }

  private handlePaychanguError(error: unknown, action: string): never {
    const axiosError = error as AxiosError<{
      message?: string | Record<string, string[]>;
      error?: string;
      data?: null;
      status?: string;
    }>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const raw = axiosError.response.data;

      // Flatten validation errors like { mobile: ["Enter a valid..."] }
      let message: string;
      if (raw?.message && typeof raw.message === 'object') {
        message = Object.entries(raw.message)
          .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
          .join('; ');
      } else {
        message =
          (raw?.message as string | undefined) ??
          raw?.error ??
          `PayChangu failed to ${action}.`;
      }

      // Insufficient funds — give a clear, actionable message
      if (
        typeof message === 'string' &&
        message.toLowerCase().includes('insufficient')
      ) {
        const mode = this.configService
          .get<string>('PAYCHANGU_MODE', 'sandbox')
          .toLowerCase();
        const hint =
          mode !== 'live'
            ? ' Top up your test wallet at dashboard.paychangu.com → Settings → Test Mode → Wallet.'
            : ' Please fund your PayChangu wallet before initiating payouts.';
        this.logger.error(`PayChangu ${action} failed — insufficient funds.${hint}`);
        throw new ServiceUnavailableException(`Insufficient PayChangu wallet balance.${hint}`);
      }

      this.logger.error(`PayChangu ${action} failed with HTTP ${status}: ${message}`);
      throw new ServiceUnavailableException(message);
    }

    if (error instanceof Error) {
      this.logger.error(`PayChangu ${action} failed: ${error.message}`, error.stack);
    }

    throw new ServiceUnavailableException(`Unable to ${action} through PayChangu.`);
  }

  /**
   * Fetch the current MWK wallet balance and throw a clear error if it is
   * lower than the requested payout amount.
   * Skipped entirely in sandbox/test mode — PayChangu simulates the balance.
   */
  private async assertSufficientBalance(amount: number): Promise<void> {
    const mode = this.configService
      .get<string>('PAYCHANGU_MODE', 'sandbox')
      .toLowerCase();

    // Sandbox simulates transactions — no real balance required
    if (mode !== 'live') return;

    try {
      const response = await firstValueFrom(
        this.httpService.get<{
          status: string;
          data?: { main_balance?: string; environment?: string };
        }>(
          `${this.getBaseUrl()}/wallet-balance?currency=MWK`,
          {
            headers: { Authorization: `Bearer ${this.getSecretKey()}` },
            timeout: 10000,
          },
        ),
      );

      const mainBalance = parseFloat(
        response.data?.data?.main_balance ?? '0',
      );
      const environment = response.data?.data?.environment ?? 'unknown';

      this.logger.log(
        `PayChangu wallet balance (${environment}): MWK ${mainBalance.toLocaleString()}`,
      );

      if (mainBalance < amount) {
        throw new ServiceUnavailableException(
          `Insufficient PayChangu wallet balance. ` +
          `Available: MWK ${mainBalance.toLocaleString()}, ` +
          `Required: MWK ${amount.toLocaleString()}. ` +
          `Please fund your PayChangu wallet.`,
        );
      }
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.warn(
        `Could not verify wallet balance before payout: ${(err as Error).message}`,
      );
    }
  }
}
