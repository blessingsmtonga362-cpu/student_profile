import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalDetails, Disability } from '../../application/entities/personal_details.entity';
import { DisabilityScoreDto, DisabilityScoreInputDto } from '../dto/ranking-score.dto';

@Injectable()
export class DisabilityService {
  private readonly logger = new Logger(DisabilityService.name);

  constructor(
    @InjectRepository(PersonalDetails)
    private readonly personalDetailsRepository: Repository<PersonalDetails>,
  ) {}

  async calculateScore(input: DisabilityScoreInputDto): Promise<DisabilityScoreDto> {
    let disabilityStatus = input.disability;

    if (!disabilityStatus) {
      try {
        const personalDetails = await this.personalDetailsRepository.findOne({ where: { userId: input.userId } });
        disabilityStatus = personalDetails?.disability;
      } catch (error) {
        this.logger.error(`Error fetching disability status for user ${input.userId}`, error);
        return {
          hasDisability: false,
          disabilityType: null,
          score: 0,
          maximumScore: 7,
          isFlagged: true,
          flagReason: 'Unable to verify disability status',
        };
      }
    }

    const normalizedDisability = this.normalizeDisability(disabilityStatus);
    const hasDisability = normalizedDisability !== Disability.NONE && !!normalizedDisability;

    return {
      hasDisability,
      disabilityType: hasDisability ? normalizedDisability : null,
      score: hasDisability ? 7 : 0,
      maximumScore: 7,
      isFlagged: false,
      flagReason: null,
    };
  }

  private normalizeDisability(disability: Disability | string | undefined): Disability | null {
    if (!disability) return Disability.NONE;
    if (Object.values(Disability).includes(disability as Disability)) return disability as Disability;

    switch (String(disability).trim().toUpperCase()) {
      case 'PHYSICAL':
        return Disability.PHYSICAL;
      case 'VISUAL':
        return Disability.VISUAL;
      case 'HEARING':
        return Disability.HEARING;
      case 'SPEECH':
        return Disability.SPEECH;
      case 'INTELLECTUAL':
        return Disability.INTELLECTUAL;
      case 'OTHER':
        return Disability.OTHER;
      default:
        return Disability.NONE;
    }
  }
}
