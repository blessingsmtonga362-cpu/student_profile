
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewModule } from './modules/review.module';  // ✅ Import ReviewModule
import { PersonalDetails } from './entities/personal_details.entity';
import { AcademicDetails } from './entities/academic_details.entity';
import { Family } from './entities/family.entity';
import { Education } from './entities/education.entity';
import { ApplicationSubmission } from './entities/application_submission.entity';
import { PersonalDetailController } from './controllers/personal_details.controller';
import { AcademicDetailController } from './controllers/academic_details.controller';
import { FamilyController } from './controllers/family.controller';
import { EducationController } from './controllers/education.controller';
import { DocumentUploadController } from './controllers/document-upload.controller';
import { PersonalDetailService } from './services/personal_details.service';
import { AcademicDetailService } from './services/academic_details.service';
import { FamilyService } from './services/family.service';
import { EducationService } from './services/education.service';
import { DocumentUploadService } from './services/document-upload.service';
import { FileModule } from '../file/file.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonalDetails, 
      AcademicDetails, 
      Family, 
      Education, 
      ApplicationSubmission
    ]),
    FileModule,
    UserModule,
    AuthModule,
    ReviewModule,  //  Import ReviewModule
  ],
  controllers: [
    PersonalDetailController, 
    AcademicDetailController, 
    FamilyController,
    EducationController,
    DocumentUploadController,
    // ReviewController is now in ReviewModule
  ],
  providers: [
    PersonalDetailService, 
    AcademicDetailService, 
    FamilyService,
    EducationService,
    DocumentUploadService,
    // ReviewService and ApplicationSubmissionService are now in ReviewModule
  ],
  exports: [
    PersonalDetailService, 
    AcademicDetailService, 
    FamilyService,
    EducationService,
  ],
})
export class ApplicationModule {}