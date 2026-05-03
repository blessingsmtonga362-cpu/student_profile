import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EducationController } from '../controllers/education.controller';
import { EducationService } from '../services/education.service';
import { Education } from '../entities/education.entity';
import { FileModule } from '../../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Education]),
    FileModule,
  ],
  controllers: [EducationController],
  providers: [EducationService],
  exports: [EducationService, TypeOrmModule.forFeature([Education])],
})
export class EducationModule {}