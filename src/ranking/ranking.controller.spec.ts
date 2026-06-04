import { Test, TestingModule } from '@nestjs/testing';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { RankingCriteriaService } from './services/ranking-criteria.service';

describe('RankingController', () => {
  let controller: RankingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RankingController],
      providers: [
        {
          provide: RankingService,
          useValue: {},
        },
        {
          provide: RankingCriteriaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<RankingController>(RankingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
