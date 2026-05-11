import { Module, forwardRef } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileData } from 'src/application/entities/profile_data';
import { ReviewModule } from 'src/application/modules/review.module';

@Module({
  controllers: [AdminController],
  providers: [AdminService],
  imports: [TypeOrmModule.forFeature([ProfileData]), forwardRef(() => ReviewModule)],
  exports: [AdminService]
})
export class AdminModule {}
