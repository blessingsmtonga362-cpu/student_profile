import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalDetails } from '../../application/entities/personal_details.entity';
import { VerificationLog } from '../../application/entities/verification-log.entity';
import { IntegrityCheckScoreDto, IntegrityCheckScoreInputDto } from '../dto/ranking-score.dto';
import { RankingCriteriaConfig } from '../ranking-criteria.defaults';

@Injectable()
export class IntegrityCheckService {
  private readonly logger = new Logger(IntegrityCheckService.name);

  constructor(
    @InjectRepository(PersonalDetails)
    private readonly personalDetailsRepository: Repository<PersonalDetails>,
    @InjectRepository(VerificationLog)
    private readonly _verificationLogRepository: Repository<VerificationLog>,
    private readonly configService: ConfigService,
  ) {}

  async calculateScore(input: IntegrityCheckScoreInputDto, criteria?: RankingCriteriaConfig): Promise<IntegrityCheckScoreDto> {
    const integrityCriteria = criteria?.integrityCheck;
    const flagReasons: string[] = [];
    const regNumberScore = await this.checkRegistrationNumber(input.registrationNumber, flagReasons, integrityCriteria?.registrationNumberScore ?? 1);
    const nationalIdScore = await this.checkNationalId(input.nationalId, flagReasons, integrityCriteria?.nationalIdScore ?? 1);
    const parentIdScore = await this.checkParentId(
      input.parentNationalId,
      input.deceasedParentNationalIds,
      flagReasons,
      integrityCriteria?.parentIdScore ?? 2,
    );
    const deathVerificationScore = await this.checkDeathVerification(
      input.nationalId || input.registrationNumber,
      input.isDeceased,
      flagReasons,
      integrityCriteria?.deathVerificationScore ?? 2,
    );
    const documentsScore = await this.checkRequiredDocuments(
      input.userId,
      input.requiredDocumentsSubmitted,
      flagReasons,
      integrityCriteria?.requiredDocumentsScore ?? 2,
    );

    const totalScore =
      regNumberScore + nationalIdScore + parentIdScore + deathVerificationScore + documentsScore;

    return {
      registrationNumberMatch: regNumberScore,
      nationalIdVerified: nationalIdScore,
      parentIdVerified: parentIdScore,
      deathVerificationConsistent: deathVerificationScore,
      requiredDocuments: documentsScore,
      totalScore,
      maximumScore: integrityCriteria?.maximumScore ?? 8,
      isFlagged: flagReasons.length > 0,
      flagReason: flagReasons.length > 0 ? flagReasons.join('; ') : null,
      details: {
        registrationNumberMatched: regNumberScore > 0,
        nationalIdVerified: nationalIdScore > 0,
        parentIdVerified: parentIdScore > 0,
        deathVerificationConsistent: deathVerificationScore === (integrityCriteria?.deathVerificationScore ?? 2),
        allRequiredDocuments: documentsScore === (integrityCriteria?.requiredDocumentsScore ?? 2),
      },
    };
  }

  private async checkRegistrationNumber(registrationNumber: string | undefined, flagReasons: string[], successScore: number): Promise<number> {
    if (!registrationNumber?.trim()) {
      flagReasons.push('Registration number not provided');
      return 0;
    }

    const normalized = registrationNumber.trim();
    if (!/^[A-Z0-9-]{3,30}$/i.test(normalized)) {
      flagReasons.push('Registration number format is invalid');
      return 0;
    }

    try {
      const url = `${this.getUnimaApiBaseUrl()}/student-data/${encodeURIComponent(normalized)}`;
      const resp = await this.fetchWithTimeout(url);

      if (resp.status === 404) {
        flagReasons.push('Registration number not found in school database');
        return 0;
      }

      if (!resp.ok) {
        flagReasons.push('Unable to verify registration number with school API');
        return 0;
      }

      // UNIMA API returns an empty body (not 404) when a student is not found
      const text = await resp.text();
      if (!text || text.trim() === '' || text.trim() === 'null') {
        flagReasons.push('Registration number not found in school database');
        return 0;
      }

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        flagReasons.push('Unable to verify registration number with school API');
        return 0;
      }

      if ((json.registrationNumber || '').toString().trim().toLowerCase() !== normalized.toLowerCase()) {
        flagReasons.push('Registration number mismatch with school database');
        return 0;
      }

      return successScore;
    } catch {
      flagReasons.push('Error verifying registration number with school API');
      return 0;
    }
  }

  private async checkNationalId(nationalId: string | undefined, flagReasons: string[], successScore: number): Promise<number> {
    if (!nationalId?.trim()) {
      flagReasons.push('National ID not provided');
      return 0;
    }

    const normalized = nationalId.trim();
    if (!this.isValidNationalIdFormat(normalized)) {
      flagReasons.push('National ID format is invalid');
      return 0;
    }

    try {
      const resp = await this.fetchWithTimeout(`${this.getNrbApiBaseUrl()}/nrb/${encodeURIComponent(normalized)}`);
      if (resp.status === 404) {
        flagReasons.push('National ID not found in NRB database');
        return 0;
      }
      if (!resp.ok) {
        flagReasons.push('Unable to verify National ID with NRB');
        return 0;
      }

      const json = await resp.json();
      // NRB API returns { nationalId, fullName, status: "alive" | "deceased" }
      // A record exists if nationalId is present in the response
      const exists = Boolean(json?.nationalId || json?.nationalIdNumber || json?.id);

      if (!exists) {
        flagReasons.push('National ID not found in NRB response');
        return 0;
      }

      return successScore;
    } catch {
      flagReasons.push('Error verifying National ID with NRB');
      return 0;
    }
  }

  private async checkParentId(parentNationalId: string | undefined, deceasedParentNationalIds: string[] | undefined, flagReasons: string[], successScore: number): Promise<number> {
    const livingParentId = parentNationalId?.trim();
    const deceasedParentIds = (deceasedParentNationalIds ?? []).map((id) => id?.trim()).filter((id): id is string => !!id);

    if (!livingParentId && deceasedParentIds.length === 0) {
      flagReasons.push('Parent national ID not provided or verified');
      return 0;
    }

    const idsToCheck = [
      ...(livingParentId ? [{ id: livingParentId, shouldBeDeceased: false }] : []),
      ...deceasedParentIds.map((id) => ({ id, shouldBeDeceased: true })),
    ];

    if (idsToCheck.some(({ id }) => !this.isValidNationalIdFormat(id))) {
      flagReasons.push('Parent national ID format is invalid');
      return 0;
    }

    try {
      for (const { id, shouldBeDeceased } of idsToCheck) {
        const record = await this.fetchNrbRecord(id);
        if (!record) {
          flagReasons.push(`Parent national ID ${id} not found in NRB database`);
          return 0;
        }

        const status = (record.status || '').toString().trim().toLowerCase();
        if (shouldBeDeceased && status !== 'deceased') {
          flagReasons.push(`Parent national ID ${id} is not marked deceased in NRB`);
          return 0;
        }
        if (!shouldBeDeceased && status === 'deceased') {
          flagReasons.push(`Living parent or guardian national ID ${id} is marked deceased in NRB`);
          return 0;
        }
      }

      return successScore;
    } catch {
      flagReasons.push('Error verifying parent national ID with NRB');
      return 0;
    }
  }

  private async checkDeathVerification(nationalIdOrRegistration: string | undefined, isDeceased: boolean | undefined, flagReasons: string[], successScore: number): Promise<number> {
    if (isDeceased === true) {
      flagReasons.push('Student is marked as deceased');
      return 0;
    }

    try {
      let nationalId: string | null = null;

      if (nationalIdOrRegistration?.trim()) {
        if (this.isValidNationalIdFormat(nationalIdOrRegistration.trim())) {
          nationalId = nationalIdOrRegistration.trim();
        } else {
          const resp = await this.fetchWithTimeout(`${this.getUnimaApiBaseUrl()}/student-data/${encodeURIComponent(nationalIdOrRegistration.trim())}`);
          if (resp.ok) {
            const text = await resp.text();
            if (text && text.trim() !== '' && text.trim() !== 'null') {
              try {
                const json = JSON.parse(text);
                nationalId = json.nationalId || json.nationalIdNumber || null;
              } catch {
                // ignore parse error
              }
            }
          }
        }
      }

      if (!nationalId) {
        flagReasons.push('Unable to fetch national ID for death verification');
        return 0;
      }

      const resp = await this.fetchWithTimeout(`${this.getNrbApiBaseUrl()}/nrb/${encodeURIComponent(nationalId)}`);
      if (resp.status === 404) {
        flagReasons.push('NRB record not found for death verification');
        return 0;
      }
      if (!resp.ok) {
        flagReasons.push('Unable to verify death status with NRB');
        return 0;
      }

      const json = await resp.json();
      if ((json.status || '').toString().trim().toLowerCase() === 'deceased') {
        flagReasons.push('NRB indicates person is deceased');
        return 0;
      }

      return successScore;
    } catch {
      flagReasons.push('Error verifying death status');
      return 0;
    }
  }

  private async checkRequiredDocuments(userId: string, requiredDocumentsSubmitted: boolean | undefined, flagReasons: string[], successScore: number): Promise<number> {
    if (requiredDocumentsSubmitted !== undefined) {
      return requiredDocumentsSubmitted ? successScore : 0;
    }

    try {
      const personalDetails = await this.personalDetailsRepository.findOne({ where: { userId } });
      if (!personalDetails) {
        flagReasons.push('Personal details not found');
        return 0;
      }

      const hasStudentId = !!personalDetails.studentIdPdfUrl;
      const hasNationalId = !!personalDetails.nationalIdPdfUrl;

      if (hasStudentId && hasNationalId) return successScore;
      if (hasStudentId || hasNationalId) {
        flagReasons.push('Required documents are missing');
        return Math.floor(successScore / 2);
      }

      flagReasons.push('Required documents are missing');
      return 0;
    } catch (error) {
      this.logger.error(`Error checking documents for user ${userId}`, error);
      flagReasons.push('Unable to verify documents');
      return 0;
    }
  }

  private isValidNationalIdFormat(nationalId: string): boolean {
    return /^[A-Z0-9]{3,50}$/i.test(nationalId);
  }

  private async fetchNrbRecord(nationalId: string): Promise<any | null> {
    const resp = await this.fetchWithTimeout(`${this.getNrbApiBaseUrl()}/nrb/${encodeURIComponent(nationalId)}`);
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`NRB returned ${resp.status}`);
    return resp.json();
  }

  private getUnimaApiBaseUrl(): string {
    return this.configService.get<string>('UNIMA_API_URL')
      || this.configService.get<string>('STUDENT_DATA_API_URL', 'http://localhost:3004');
  }

  private getNrbApiBaseUrl(): string {
    return this.configService.get<string>('NRB_DAME_API_URL')
      || this.configService.get<string>('NRB_API_URL', 'http://localhost:3005');
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      return await fetch(url, { method: 'GET', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}
