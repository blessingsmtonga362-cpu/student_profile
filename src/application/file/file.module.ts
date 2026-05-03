import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { DocumentVerificationService } from '../../file/document-verification.service';
import { VerificationLog } from '../entities/verification-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationLog])],
  providers: [FileService, DocumentVerificationService],
  exports: [FileService, DocumentVerificationService],
})
export class FileModule {}