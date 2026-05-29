import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileData } from 'src/application/entities/profile_data';
import { ReviewModule } from 'src/application/modules/review.module';
import { AcademicDetails } from 'src/application/entities/academic_details.entity';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { NotificationModule } from 'src/notification/module/notification.module';
import { ApplicationSubmission } from 'src/application/entities/application_submission.entity';
import { UserModule } from 'src/user/user.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RankingModule } from 'src/ranking/ranking.module';
@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [
    TypeOrmModule.forFeature([
      ProfileData,
      VerificationLog,
      ApplicationSubmission,
    ]),
    forwardRef(() => ReviewModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => UserModule),
    RankingModule,
  ],
  exports: [AdminService],
})
export class AdminModule {}
