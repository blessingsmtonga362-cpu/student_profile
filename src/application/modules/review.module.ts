// src/application/modules/review.module.ts
import { Module } from '@nestjs/common';
import { ReviewController } from '../controllers/review.controller';
import { PersonalDetailModule } from './personal_details.module';
import { AcademicDetailModule } from './academic_details.module';
import { FamilyModule } from './family.module';
import { EducationModule } from './education.module';
import { UserModule } from '../../user/user.module';
import { ReviewService } from '../services/reviewService';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    forwardRef(() => PersonalDetailModule),
    AcademicDetailModule,
    FamilyModule,
    EducationModule,
    UserModule,
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports:[ReviewService]
})
export class ReviewModule {}