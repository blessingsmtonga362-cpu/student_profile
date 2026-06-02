import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { firstValueFrom } from 'rxjs';
import {
  InitializePaymentResponse,
  PaychanguInitializeApiResponse,
  PaychanguVerifyApiResponse,
  VerifyPaymentResponse,
  WebhookPayload,
} from './dto/paychangu-responses.dto';

@Injectable()
export class PaychanguService {
  private readonly logger = new Logger(PaychanguService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async initializePayment(
    amount: number,
    selectedStudentIds: string[],
    returnUrl: string,
    cancelUrl: string,
  ): Promise<InitializePaymentResponse> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    if (!selectedStudentIds.length) {
      throw new BadRequestException('At least one student must be selected.');
    }

    const apiKey = this.getApiKey();
    const reference = this.generateReference();
    const callbackUrl = this.configService.get<string>(
      'PAYCHANGU_CALLBACK_URL',
      `${this.configService.get<string>('BACKEND_URL', 'http://localhost:3001')}/webhooks/paychangu`,
    );

    const merchantId = this.configService.get<string>('PAYCHANGU_MERCHANT_ID');

    const payload = {
      amount,
      currency: 'MWK',
      email: this.configService.get<string>(
        'PAYCHANGU_ADMIN_EMAIL',
        'admin@school.com',
      ),
      ...(merchantId ? { merchant_id: merchantId } : {}),
      callback_url: callbackUrl,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      custom_reference: reference,
      metadata: {
        student_ids: selectedStudentIds,
        batch_size: selectedStudentIds.length,
        payment_type: 'student_batch_payment' as const,
      },
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<PaychanguInitializeApiResponse>(
          `${this.getBaseUrl()}/payment/initialize`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        ),
      );

      const data = response.data.data ?? {};
      const paymentUrl = data.payment_url ?? data.checkout_url;
      const transactionId = data.transaction_id ?? data.tx_ref ?? reference;
      const responseReference = data.reference ?? data.tx_ref ?? reference;

      if (!paymentUrl || !transactionId) {
        this.logger.error(
          `Unexpected PayChangu initialize response: ${JSON.stringify(response.data)}`,
        );
        throw new ServiceUnavailableException(
          'PayChangu did not return a payment URL.',
        );
      }

      return {
        payment_url: paymentUrl,
        transaction_id: transactionId,
        reference: responseReference,
      };
    } catch (error) {
      this.handlePaychanguError(error, 'initialize payment');
    }
  }

  async verifyPayment(transactionId: string): Promise<VerifyPaymentResponse> {
    if (!transactionId?.trim()) {
      throw new BadRequestException('Transaction ID is required.');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<PaychanguVerifyApiResponse>(
          `${this.getBaseUrl()}/payment/verify/${encodeURIComponent(transactionId)}`,
          {
            headers: {
              Authorization: `Bearer ${this.getApiKey()}`,
            },
            timeout: 15000,
          },
        ),
      );

      const data = response.data.data ?? {};

      return {
        transaction_id: data.transaction_id ?? data.tx_ref ?? transactionId,
        reference: data.reference ?? data.tx_ref,
        status: this.normalizeStatus(data.status ?? response.data.status),
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata,
        raw: response.data,
      };
    } catch (error) {
      this.handlePaychanguError(error, 'verify payment');
    }
  }

  handleWebhook(payload: WebhookPayload, signature: string): boolean {
    if (!this.verifyWebhookSignature(payload, signature)) {
      this.logger.warn('Rejected PayChangu webhook with invalid signature.');
      return false;
    }

    const transactionId =
      payload.data?.transaction_id ?? payload.transaction_id ?? payload.tx_ref;
    const status = payload.data?.status ?? payload.status;

    this.logger.log(
      `Accepted PayChangu webhook for transaction ${transactionId ?? 'unknown'} with status ${
        status ?? 'unknown'
      }.`,
    );

    return true;
  }

  normalizeStatus(status?: string): 'success' | 'failed' | 'pending' | string {
    const normalized = status?.toLowerCase();

    if (
      ['successful', 'success', 'completed', 'paid'].includes(normalized ?? '')
    ) {
      return 'success';
    }

    if (
      ['failed', 'cancelled', 'canceled', 'declined', 'error'].includes(
        normalized ?? '',
      )
    ) {
      return 'failed';
    }

    return normalized ?? 'pending';
  }

  private verifyWebhookSignature(
    payload: WebhookPayload,
    signature: string,
  ): boolean {
    const webhookSecret = this.configService.get<string>(
      'PAYCHANGU_WEBHOOK_SECRET',
    );

    if (!webhookSecret?.trim()) {
      this.logger.error('PAYCHANGU_WEBHOOK_SECRET is not configured.');
      return false;
    }

    if (!signature?.trim()) {
      return false;
    }

    const expected = createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    const provided = signature.replace(/^sha256=/i, '').trim();

    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
  }

  private getApiKey(): string {
    const apiKey =
      this.configService.get<string>('PAYCHANGU_API_KEY') ??
      this.configService.get<string>('PAYCHANGU_SECRET_KEY');

    if (!apiKey?.trim()) {
      throw new UnauthorizedException('PAYCHANGU_API_KEY is not configured.');
    }

    return apiKey;
  }

  private getBaseUrl(): string {
    const mode = this.configService
      .get<string>('PAYCHANGU_MODE', 'sandbox')
      .toLowerCase();

    return mode === 'live'
      ? 'https://api.paychangu.com'
      : 'https://sandbox.paychangu.com';
  }

  private generateReference(): string {
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();

    return `BATCH_${Date.now()}_${random}`;
  }

  private handlePaychanguError(error: unknown, action: string): never {
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string;
    }>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const message =
        axiosError.response.data?.message ??
        axiosError.response.data?.error ??
        `PayChangu failed to ${action}.`;

      this.logger.error(
        `PayChangu ${action} failed with HTTP ${status}: ${message}`,
      );
      throw new ServiceUnavailableException(message);
    }

    if (error instanceof Error) {
      this.logger.error(
        `PayChangu ${action} failed: ${error.message}`,
        error.stack,
      );
    } else {
      this.logger.error(`PayChangu ${action} failed with an unknown error.`);
    }

    throw new ServiceUnavailableException(
      `Unable to ${action} through PayChangu.`,
    );
  }
}
