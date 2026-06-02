import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { DisbursementTransfer } from './entities/disbursement-transfer.entity';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { NotificationModule } from '../notification/module/notification.module';
import { SponsorAllocation } from '../sponsor/entities/sponsor-allocation.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([DisbursementTransfer, SponsorAllocation]),
    UserModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
