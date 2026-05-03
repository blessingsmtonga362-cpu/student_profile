import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentUploadController } from '../controllers/document-upload.controller';
import { FileModule } from '../../file/file.module';
import { PersonalDetailModule } from './personal_details.module';
import { FamilyModule } from './family.module';

@Module({
  imports: [
    FileModule,
    PersonalDetailModule,
    FamilyModule,
  ],
  controllers: [DocumentUploadController],
})
export class DocumentUploadModule {}