import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveRankingCriteriaTemplateDto } from '../dto/ranking-criteria.dto';
import { RankingCriteriaTemplate } from '../entities/ranking-criteria-template.entity';
import {
  cloneDefaultCriteria,
  RankingCriteriaConfig,
  ScoreBand,
} from '../ranking-criteria.defaults';

@Injectable()
export class RankingCriteriaService {
  constructor(
    @InjectRepository(RankingCriteriaTemplate)
    private readonly templateRepository: Repository<RankingCriteriaTemplate>,
  ) {}

  getDefaultCriteria() {
    return {
      id: 'default',
      name: 'Default criteria',
      isDefault: true,
      isActive: false,
      criteria: cloneDefaultCriteria(),
    };
  }

  async getTemplates() {
    const templates = await this.templateRepository.find({
      order: { createdAt: 'DESC' },
    });
    const hasActiveTemplate = templates.some((template) => template.isActive);

    return {
      defaultCriteria: {
        ...this.getDefaultCriteria(),
        isActive: !hasActiveTemplate,
      },
      templates,
      limit: 5,
    };
  }

  async getActiveCriteria(): Promise<RankingCriteriaConfig> {
    const activeTemplate = await this.templateRepository.findOne({
      where: { isActive: true },
    });

    return activeTemplate?.criteria ?? cloneDefaultCriteria();
  }

  async saveTemplate(dto: SaveRankingCriteriaTemplateDto) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Template name is required');
    }

    const criteria = this.validateCriteria(dto.criteria);
    const templateCount = await this.templateRepository.count();

    if (templateCount >= 5) {
      throw new BadRequestException('You can save up to 5 custom criteria templates only');
    }

    const template = this.templateRepository.create({
      name: dto.name.trim(),
      criteria,
      isActive: false,
    });

    const saved = await this.templateRepository.save(template);
    if (dto.activate) {
      return this.activateTemplate(saved.id);
    }

    return saved;
  }

  async activateTemplate(id: string) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Criteria template not found');
    }

    await this.templateRepository
      .createQueryBuilder()
      .update(RankingCriteriaTemplate)
      .set({ isActive: false })
      .execute();
    template.isActive = true;
    return this.templateRepository.save(template);
  }

  async useDefaultCriteria() {
    await this.templateRepository
      .createQueryBuilder()
      .update(RankingCriteriaTemplate)
      .set({ isActive: false })
      .execute();
    return this.getDefaultCriteria();
  }

  async deleteTemplate(id: string) {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException('Criteria template not found');
    }

    await this.templateRepository.delete(id);
    return { success: true, message: 'Criteria template deleted successfully' };
  }

  private validateCriteria(criteria: RankingCriteriaConfig): RankingCriteriaConfig {
    if (!criteria || typeof criteria !== 'object') {
      throw new BadRequestException('Criteria configuration is required');
    }

    const overallTotal =
      criteria.academic.maximumScore +
      criteria.familyBackground.maximumScore +
      criteria.educationBackground.maximumScore +
      criteria.integrityCheck.maximumScore +
      criteria.disability.maximumScore;

    if (overallTotal !== 100) {
      throw new BadRequestException(`Main section maximums must add up to 100. They currently add to ${overallTotal}`);
    }

    this.assertSectionTotal('Family background', criteria.familyBackground.maximumScore, [
      criteria.familyBackground.parentStatusMaximum,
      criteria.familyBackground.monthlyIncomeMaximum,
      criteria.familyBackground.siblingMaximum,
      criteria.familyBackground.educationBurdenMaximum,
    ]);

    this.assertSectionTotal('Education background', criteria.educationBackground.maximumScore, [
      criteria.educationBackground.primaryFeeMaximum,
      criteria.educationBackground.secondaryFeeMaximum,
      criteria.educationBackground.fundingMaximum,
    ]);

    this.assertSectionTotal('Data integrity', criteria.integrityCheck.maximumScore, [
      criteria.integrityCheck.registrationNumberScore,
      criteria.integrityCheck.nationalIdScore,
      criteria.integrityCheck.parentIdScore,
      criteria.integrityCheck.deathVerificationScore,
      criteria.integrityCheck.requiredDocumentsScore,
    ]);

    this.assertSectionTotal('Disability', criteria.disability.maximumScore, [
      criteria.disability.disabilityScore,
    ]);

    if (criteria.disability.noDisabilityScore !== 0) {
      throw new BadRequestException('No disability score must remain 0');
    }

    this.assertBands('Family income', criteria.familyBackground.incomeBands, criteria.familyBackground.monthlyIncomeMaximum);
    this.assertBands('Sibling dependents', criteria.familyBackground.siblingBands, criteria.familyBackground.siblingMaximum);
    this.assertBands('Education burden', criteria.familyBackground.educationBurdenBands, criteria.familyBackground.educationBurdenMaximum);
    this.assertBands('Primary fees', criteria.educationBackground.primaryFeeBands, criteria.educationBackground.primaryFeeMaximum);
    this.assertBands('Secondary fees', criteria.educationBackground.secondaryFeeBands, criteria.educationBackground.secondaryFeeMaximum);
    this.assertNamedScores('Parent status', criteria.familyBackground.parentStatusScores, criteria.familyBackground.parentStatusMaximum);
    this.assertNamedScores('Funding source', criteria.educationBackground.fundingScores, criteria.educationBackground.fundingMaximum);

    return criteria;
  }

  private assertSectionTotal(label: string, maximum: number, parts: number[]) {
    if (!Number.isFinite(maximum) || maximum < 0) {
      throw new BadRequestException(`${label} maximum must be a positive number`);
    }

    const total = parts.reduce((sum, part) => sum + Number(part || 0), 0);
    if (total !== maximum) {
      throw new BadRequestException(`${label} sub-sections must add up to ${maximum}`);
    }
  }

  private assertBands(label: string, bands: ScoreBand[], maximumScore: number) {
    if (!Array.isArray(bands) || bands.length === 0) {
      throw new BadRequestException(`${label} must have at least one row`);
    }

    bands.forEach((band, index) => {
      if (!Number.isFinite(band.minimum) || band.minimum < 0) {
        throw new BadRequestException(`${label} row ${index + 1} has an invalid minimum`);
      }
      if (band.maximum !== null && (!Number.isFinite(band.maximum) || band.maximum < band.minimum)) {
        throw new BadRequestException(`${label} row ${index + 1} has an invalid maximum`);
      }
      if (!Number.isFinite(band.score) || band.score < 0 || band.score > maximumScore) {
        throw new BadRequestException(`${label} row ${index + 1} has an invalid score`);
      }
    });
  }

  private assertNamedScores(label: string, rows: Array<{ score: number }>, maximumScore: number) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new BadRequestException(`${label} must have at least one row`);
    }

    rows.forEach((row, index) => {
      if (!Number.isFinite(row.score) || row.score < 0 || row.score > maximumScore) {
        throw new BadRequestException(`${label} row ${index + 1} has an invalid score`);
      }
    });
  }
}
