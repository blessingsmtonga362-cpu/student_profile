import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileService } from './file.service';
import { DocumentVerificationService } from './document-verification.service';
import { VerificationLog } from '../application/entities/verification-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VerificationLog])],
  providers: [FileService, DocumentVerificationService],
  exports: [FileService, DocumentVerificationService],
})
export class FileModule {}