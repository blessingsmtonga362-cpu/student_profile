import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StudentNotificationController } from '../controller/studentNotification.controller';
import { StudentNotificationService } from '../service/studentNotification.service';
import { StudentNotification } from '../entity/studentNotification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentNotification]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [StudentNotificationController],
  providers: [StudentNotificationService],
  exports: [StudentNotificationService],
})
export class NotificationModule {}