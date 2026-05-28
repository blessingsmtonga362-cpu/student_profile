import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PaychanguIntentStatus,
  PaychanguPaymentIntent,
} from '../paychangu/entities/paychangu-payment-intent.entity';
import { PaychanguService } from '../paychangu/paychangu.service';
import { User } from '../user/entities/user.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly paychanguService: PaychanguService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PaychanguPaymentIntent)
    private readonly paychanguIntentRepository: Repository<PaychanguPaymentIntent>,
  ) {}

  async initiatePayChanguBatchPayment(
    amount: number,
    studentIds: string[],
    returnUrl: string,
    cancelUrl: string,
  ) {
    const students = await this.userRepository.find({
      where: { id: In(studentIds) },
      select: ['id'],
    });

    if (students.length !== studentIds.length) {
      const foundIds = new Set(students.map((student) => student.id));
      const missingIds = studentIds.filter(
        (studentId) => !foundIds.has(studentId),
      );

      throw new NotFoundException(
        `Selected student(s) not found: ${missingIds.join(', ')}`,
      );
    }

    this.ensureAmountMatchesExpectedTotal(amount, studentIds.length);

    const payment = await this.paychanguService.initializePayment(
      amount,
      studentIds,
      returnUrl,
      cancelUrl,
    );

    const intent = this.paychanguIntentRepository.create({
      amount: amount.toFixed(2),
      currency: 'MWK',
      studentIds,
      batchSize: studentIds.length,
      transactionId: payment.transaction_id,
      reference: payment.reference,
      paymentUrl: payment.payment_url,
      status: PaychanguIntentStatus.PENDING,
      rawResponse: payment,
    });

    await this.paychanguIntentRepository.save(intent);

    return {
      payment_url: payment.payment_url,
      transaction_id: payment.transaction_id,
      reference: payment.reference,
      intent_id: intent.id,
    };
  }

  async verifyAndUpdatePaychanguPayment(transactionId: string) {
    const verification =
      await this.paychanguService.verifyPayment(transactionId);
    const intent = await this.findPaychanguIntent(
      transactionId,
      verification.reference,
    );

    if (intent) {
      intent.status = this.toIntentStatus(verification.status);
      intent.rawResponse = verification.raw;
      intent.verifiedAt = new Date();
      await this.paychanguIntentRepository.save(intent);
    }

    return verification;
  }

  async updatePaychanguIntentFromWebhook(payload: {
    transactionId?: string;
    reference?: string;
    status?: string;
    raw: unknown;
  }) {
    const intent = await this.findPaychanguIntent(
      payload.transactionId,
      payload.reference,
    );

    if (!intent) {
      this.logger.warn(
        `No PayChangu intent found for transaction ${payload.transactionId ?? 'unknown'} / reference ${
          payload.reference ?? 'unknown'
        }.`,
      );
      return null;
    }

    intent.status = this.toIntentStatus(payload.status);
    intent.rawResponse = payload.raw;
    intent.verifiedAt = new Date();

    return this.paychanguIntentRepository.save(intent);
  }

  private ensureAmountMatchesExpectedTotal(
    amount: number,
    studentCount: number,
  ): void {
    const perStudentFee = Number(
      this.configService.get<string>('PAYCHANGU_STUDENT_FEE_AMOUNT'),
    );

    if (!Number.isFinite(perStudentFee) || perStudentFee <= 0) {
      return;
    }

    const expectedTotal = perStudentFee * studentCount;

    if (Number(amount.toFixed(2)) !== Number(expectedTotal.toFixed(2))) {
      throw new BadRequestException(
        `Amount mismatch. Expected MWK ${expectedTotal.toFixed(2)} for ${studentCount} student(s).`,
      );
    }
  }

  private async findPaychanguIntent(
    transactionId?: string,
    reference?: string,
  ) {
    if (transactionId) {
      const byTransactionId = await this.paychanguIntentRepository.findOne({
        where: { transactionId },
      });

      if (byTransactionId) {
        return byTransactionId;
      }
    }

    if (reference) {
      return this.paychanguIntentRepository.findOne({ where: { reference } });
    }

    return null;
  }

  private toIntentStatus(status?: string): PaychanguIntentStatus {
    switch (this.paychanguService.normalizeStatus(status)) {
      case 'success':
        return PaychanguIntentStatus.SUCCESS;
      case 'failed':
        return PaychanguIntentStatus.FAILED;
      default:
        return PaychanguIntentStatus.PENDING;
    }
  }
}
