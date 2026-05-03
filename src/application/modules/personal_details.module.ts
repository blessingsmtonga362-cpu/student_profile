import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalDetailController } from '../controllers/personal_details.controller';
import { PersonalDetailService } from '../services/personal_details.service';
import { PersonalDetails } from '../entities/personal_details.entity';
import { FileModule } from '../../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalDetails]),
    FileModule,
  ],
  controllers: [PersonalDetailController],
  providers: [PersonalDetailService],
  exports: [PersonalDetailService, TypeOrmModule.forFeature([PersonalDetails])],
})
export class PersonalDetailModule {}