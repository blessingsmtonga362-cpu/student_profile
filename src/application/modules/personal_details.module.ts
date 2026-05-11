import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalDetailController } from '../controllers/personal_details.controller';
import { PersonalDetailService } from '../services/personal_details.service';
import { PersonalDetails } from '../entities/personal_details.entity';
import { FileModule } from '../../file/file.module';
import { AdminModule } from 'src/admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PersonalDetails]),
    FileModule,
    forwardRef(() => AdminModule),
  ],
  controllers: [PersonalDetailController],
  providers: [PersonalDetailService],
  exports: [PersonalDetailService],
})
export class PersonalDetailModule {}
