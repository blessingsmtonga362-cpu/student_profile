import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { SponsorAllocation } from './entities/sponsor-allocation.entity';
import { SponsorService } from './sponsor.service';
import { SponsorController } from './sponsor.controller';
import { ProfileData } from 'src/application/entities/profile_data';
import { AcademicDetails } from 'src/application/entities/academic_details.entity';
import { FileModule } from 'src/file/file.module';
import { ReviewModule } from 'src/application/modules/review.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsor, SponsorAllocation, ProfileData, AcademicDetails]),
    FileModule,
    forwardRef(() => ReviewModule),
    UserModule,
  ],
  controllers: [SponsorController],
  providers: [SponsorService],
  exports: [SponsorService],
})
export class SponsorModule {}
