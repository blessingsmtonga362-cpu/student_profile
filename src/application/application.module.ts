
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalDetails } from './entities/personal_details.entity';
import { AcademicDetails } from './entities/academic_details.entity';
import { Family } from './entities/family.entity';
import { Education } from './entities/education.entity';
import { PersonalDetailService } from './services/personal_details.service';
import { AcademicDetailService } from './services/academic_details.service';
import { FamilyService } from './services/family.service';
import { EducationService } from './services/education.service';
import { PersonalDetailController } from './controllers/personal_details.controller';
import { AcademicDetailController } from './controllers/academic_details.controller';
import { FamilyController } from './controllers/family.controller';
import { EducationController } from './controllers/education.controller';
import { DocumentUploadController } from './controllers/document-upload.controller';
import { FileModule } from '../file/file.module';
import { ReviewController } from './controllers/review.controller';
import { ReviewService } from './services/reviewService';
import { DocumentUploadService } from './services/document-upload.service';
//import { StudentNotificationController} from 'src/notification/controller/studentNotification.controller';
//import { NotificationModule } from 'src/notification/module/studentNotification.module';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalDetails, AcademicDetails, Family, Education]),
    FileModule,
    //NotificationModule,
    UserModule,
    AuthModule,
  ],
  controllers: [
    PersonalDetailController, 
    AcademicDetailController, 
    FamilyController,
    EducationController,
    DocumentUploadController,
    ReviewController,
    //StudentNotificationController,
  ],
  providers: [
    PersonalDetailService, 
    AcademicDetailService, 
    FamilyService,
    EducationService,
    ReviewService,
    DocumentUploadService,
    //StudentNotificationController,

  ],
  exports: [
    PersonalDetailService, 
    AcademicDetailService, 
    FamilyService,
    EducationService,
    ReviewService,
    DocumentUploadService,
    //StudentNotificationController,
  ],
})
export class ApplicationModule {}