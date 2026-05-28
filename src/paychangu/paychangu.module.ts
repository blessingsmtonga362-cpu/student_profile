import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaychanguPaymentsController } from '../payments/paychangu-payments.controller';
import { PaymentsService } from '../payments/payments.service';
import { User } from '../user/entities/user.entity';
import { PaychanguWebhookController } from '../webhooks/paychangu-webhook.controller';
import { PaychanguPaymentIntent } from './entities/paychangu-payment-intent.entity';
import { PaychanguService } from './paychangu.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([User, PaychanguPaymentIntent]),
  ],
  controllers: [PaychanguPaymentsController, PaychanguWebhookController],
  providers: [PaychanguService, PaymentsService],
  exports: [PaychanguService, PaymentsService],
})
export class PaychanguModule {}
