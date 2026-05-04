import { Module } from '@nestjs/common';
import { ReviewController } from '../controllers/review.controller';
import { PersonalDetailModule } from './personal_details.module';
import { AcademicDetailModule } from './academic_details.module';
import { FamilyModule } from './family.module';
import { EducationModule } from './education.module';

@Module({
  imports: [
    PersonalDetailModule,
    AcademicDetailModule,
    FamilyModule,
    EducationModule,
  ],
  controllers: [ReviewController],
})
export class ReviewModule {}