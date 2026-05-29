import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { InitiatePaychanguPaymentDto } from './dto/initiate-paychangu-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments/paychangu')
export class PaychanguPaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('initiate')
  async initiatePayment(@Body() dto: InitiatePaychanguPaymentDto) {
    return this.paymentsService.initiatePayChanguBatchPayment(
      dto.amount,
      dto.studentIds,
      dto.returnUrl,
      dto.cancelUrl,
    );
  }

  @Get('verify/:transactionId')
  async verifyPayment(@Param('transactionId') transactionId: string) {
    return this.paymentsService.verifyAndUpdatePaychanguPayment(transactionId);
  }

  @Get('return')
  async handleReturn(
    @Query('transaction_id') transactionId: string,
    @Query('tx_ref') txRef: string,
    @Query('reference') reference: string,
    @Res() response: Response,
  ) {
    const idToVerify = transactionId ?? txRef ?? reference;

    if (idToVerify) {
      await this.paymentsService.verifyAndUpdatePaychanguPayment(idToVerify);
    }

    return response.redirect(
      this.getFrontendRedirectUrl('success', idToVerify),
    );
  }

  @Get('cancel')
  handleCancel(
    @Query('transaction_id') transactionId: string,
    @Query('tx_ref') txRef: string,
    @Query('reference') reference: string,
    @Res() response: Response,
  ) {
    return response.redirect(
      this.getFrontendRedirectUrl(
        'cancel',
        transactionId ?? txRef ?? reference,
      ),
    );
  }

  private getFrontendRedirectUrl(
    status: 'success' | 'cancel',
    transactionId?: string,
  ): string {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const redirectUrl = new URL('/payments/paychangu/result', frontendUrl);

    redirectUrl.searchParams.set('status', status);

    if (transactionId) {
      redirectUrl.searchParams.set('transaction_id', transactionId);
    }

    return redirectUrl.toString();
  }
}
