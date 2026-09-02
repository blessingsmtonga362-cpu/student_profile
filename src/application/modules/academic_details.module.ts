import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicDetailController } from '../controllers/academic_details.controller';
import { AcademicDetailService } from '../services/academic_details.service';
import { AcademicDetails } from '../entities/academic_details.entity';
import { FileModule } from '../../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademicDetails]), 
    FileModule,
  ],
  controllers: [AcademicDetailController],
  providers: [AcademicDetailService],
  exports: [AcademicDetailService, TypeOrmModule.forFeature([AcademicDetails])],
})
export class AcademicDetailModule {}