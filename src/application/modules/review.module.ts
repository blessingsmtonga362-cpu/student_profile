import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewController } from '../controllers/review.controller';
import { StudentController } from '../controllers/student.controller';
import { ReviewService } from '../services/review.service';
import { PersonalDetailService } from '../services/personal_details.service';
import { FamilyService } from '../services/family.service';
import { EducationService } from '../services/education.service';
import { ApplicationSubmissionService } from '../services/application_submission.service';
import { PersonalDetails } from '../entities/personal_details.entity';
import { Family } from '../entities/family.entity';
import { Education } from '../entities/education.entity';
import { ApplicationSubmission } from '../entities/application_submission.entity';
import { UserModule } from '../../user/user.module';
import { AdminModule } from '../../admin/admin.module';
import { NotificationModule } from '../../notification/module/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonalDetails,
      Family,
      Education,
      ApplicationSubmission,
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => AdminModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [ReviewController, StudentController],
  providers: [
    PersonalDetailService,
    FamilyService,
    EducationService,
    ReviewService,
    ApplicationSubmissionService,
  ],
  exports: [
    ReviewService,
    ApplicationSubmissionService,
  ],
})
export class ReviewModule {}
