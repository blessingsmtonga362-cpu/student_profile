import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationSubmission } from 'src/application/entities/application_submission.entity';
import { ProfileData } from 'src/application/entities/profile_data';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { ReviewModule } from 'src/application/modules/review.module';
import { NotificationModule } from 'src/notification/module/notification.module';
import { ApplicationSubmission } from 'src/application/entities/application_submission.entity';
import { ProfileData } from 'src/application/entities/profile_data';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { ReviewModule } from 'src/application/modules/review.module';
import { NotificationModule } from 'src/notification/module/notification.module';
import { RankingModule } from 'src/ranking/ranking.module';
import { UserModule } from 'src/user/user.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { RankingModule } from 'src/ranking/ranking.module';
import { UserModule } from 'src/user/user.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';


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
