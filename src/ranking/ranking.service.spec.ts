import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Family } from '../application/entities/family.entity';
import { Education } from '../application/entities/education.entity';
import { PersonalDetails } from '../application/entities/personal_details.entity';
import { ProfileData } from '../application/entities/profile_data';
import { User } from '../user/entities/user.entity';
import { RankingService } from './ranking.service';
import { AcademicPerformanceService } from './services/academic-performance.service';
import { DisabilityService } from './services/disability.service';
import { EducationBackgroundService } from './services/education-background.service';
import { FamilyBackgroundService } from './services/family-background.service';
import { IntegrityCheckService } from './services/integrity-check.service';
import { RankingCriteriaService } from './services/ranking-criteria.service';

describe('RankingService', () => {
  let service: RankingService;
  const mockRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        {
          provide: AcademicPerformanceService,
          useValue: {},
        },
        {
          provide: FamilyBackgroundService,
          useValue: {},
        },
        {
          provide: EducationBackgroundService,
          useValue: {},
        },
        {
          provide: IntegrityCheckService,
          useValue: {},
        },
        {
          provide: DisabilityService,
          useValue: {},
        },
        {
          provide: RankingCriteriaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: getRepositoryToken(Family),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Education),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(PersonalDetails),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ProfileData),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
