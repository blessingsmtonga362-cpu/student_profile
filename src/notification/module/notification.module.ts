import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StudentNotificationController } from '../controller/studentNotification.controller';
import { StudentNotificationService } from '../service/studentNotification.service';
import { StudentNotification } from '../entity/studentNotification.entity';
import { EmailModule } from '../../email/email.module';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentNotification]),
    EventEmitterModule.forRoot(),
    EmailModule, 
    forwardRef(() => UserModule), 
  ],
  controllers: [StudentNotificationController],
  providers: [StudentNotificationService],
  exports: [StudentNotificationService],
})
export class NotificationModule {}