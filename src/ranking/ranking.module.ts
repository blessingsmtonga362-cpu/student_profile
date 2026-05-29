import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { AcademicPerformanceService } from './services/academic-performance.service';
import { EducationBackgroundService } from './services/education-background.service';
import { FamilyBackgroundService } from './services/family-background.service';
import { DisabilityService } from './services/disability.service';
import { IntegrityCheckService } from './services/integrity-check.service';
import { Family } from '../application/entities/family.entity';
import { Education } from '../application/entities/education.entity';
import { PersonalDetails } from '../application/entities/personal_details.entity';
import { User } from '../user/entities/user.entity';
import { VerificationLog } from '../application/entities/verification-log.entity';
import { ProfileData } from '../application/entities/profile_data';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Family,
      Education,
      PersonalDetails,
      User,
      VerificationLog,
      ProfileData,
    ]),
  ],
  controllers: [RankingController],
  providers: [
    RankingService,
    AcademicPerformanceService,
    EducationBackgroundService,
    FamilyBackgroundService,
    DisabilityService,
    IntegrityCheckService,
  ],
  exports: [RankingService],
})
export class RankingModule {}
