import { Module, forwardRef } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileData } from 'src/application/entities/profile_data';
import { ReviewModule } from 'src/application/modules/review.module';
import { AcademicDetails } from 'src/application/entities/academic_details.entity';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { NotificationModule } from 'src/notification/module/notification.module';
import { UserModule } from 'src/user/user.module';
import { RankingModule } from 'src/ranking/ranking.module';
import { ApplicationSubmission } from 'src/application/entities/application_submission.entity';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [
    TypeOrmModule.forFeature([ProfileData, AcademicDetails, VerificationLog, ApplicationSubmission,]),
    forwardRef(() => ReviewModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => UserModule),
     forwardRef(() => ReviewModule),
    NotificationModule,
    UserModule,
    RankingModule,
  ],
  exports: [AdminService]
})
export class AdminModule {}
