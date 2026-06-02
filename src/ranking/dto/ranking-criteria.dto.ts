import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { RankingCriteriaConfig } from '../ranking-criteria.defaults';

export class SaveRankingCriteriaTemplateDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsObject()
  criteria: RankingCriteriaConfig;

  @IsOptional()
  @IsBoolean()
  activate?: boolean;
}
