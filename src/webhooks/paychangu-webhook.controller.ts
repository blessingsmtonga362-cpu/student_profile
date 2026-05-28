import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PaychanguService } from '../paychangu/paychangu.service';
import type { WebhookPayload } from '../paychangu/dto/paychangu-responses.dto';
import { PaymentsService } from '../payments/payments.service';

@Controller('webhooks/paychangu')
export class PaychanguWebhookController {
  constructor(
    private readonly paychanguService: PaychanguService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: WebhookPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const signature = this.getSignature(headers);
    const isValid = this.paychanguService.handleWebhook(payload, signature);

    if (!isValid) {
      throw new UnauthorizedException('Invalid PayChangu webhook signature.');
    }

    const data = payload.data ?? {};

    await this.paymentsService.updatePaychanguIntentFromWebhook({
      transactionId:
        data.transaction_id ?? payload.transaction_id ?? payload.tx_ref,
      reference:
        data.reference ?? data.tx_ref ?? payload.reference ?? payload.tx_ref,
      status: data.status ?? payload.status,
      raw: payload,
    });

    return { received: true };
  }

  private getSignature(
    headers: Record<string, string | string[] | undefined>,
  ): string {
    const value =
      headers['x-paychangu-signature'] ??
      headers['paychangu-signature'] ??
      headers['x-signature'] ??
      headers.signature;

    return Array.isArray(value) ? value[0] : (value ?? '');
  }
}
