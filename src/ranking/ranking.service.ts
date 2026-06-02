import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Family } from '../application/entities/family.entity';
import { Education, EducationLevel } from '../application/entities/education.entity';
import { PersonalDetails } from '../application/entities/personal_details.entity';
import { ProfileData } from '../application/entities/profile_data';
import { User } from '../user/entities/user.entity';
import { Role } from '../auth/role.enum';
import {
  AdminDashboardPaginatedDto,
  AdminDashboardRankingDto,
  ComprehensiveStudentScoreDto,
  ComprehensiveStudentScoreInputDto,
  EducationBackgroundScoreDto,
  EducationBackgroundScoreInputDto,
  FamilyBackgroundScoreDto,
  FamilyBackgroundScoreInputDto,
  MonthlyIncomeScoreLookupDto,
  NrbVerificationDto,
  SchoolStudentScoreDto,
} from './dto/ranking-score.dto';
import { AcademicPerformanceService } from './services/academic-performance.service';
import { DisabilityService } from './services/disability.service';
import { EducationBackgroundService } from './services/education-background.service';
import { FamilyBackgroundService } from './services/family-background.service';
import { IntegrityCheckService } from './services/integrity-check.service';
import { RankingCriteriaService } from './services/ranking-criteria.service';
import { RankingCriteriaConfig } from './ranking-criteria.defaults';

type SchoolStudentRecord = {
  name?: string;
  registrationNumber?: string;
  GPA?: string | number | null;
  department?: string | null;
  yearOfStudy?: number | null;
  status?: string | null;
};

type NrbRecord = {
  nationalId?: string;
  fullName?: string;
  status?: string | null;
};

@Injectable()
export class RankingService {
  constructor(
    private readonly academicPerformanceService: AcademicPerformanceService,
    private readonly familyBackgroundService: FamilyBackgroundService,
    private readonly educationBackgroundService: EducationBackgroundService,
    private readonly integrityCheckService: IntegrityCheckService,
    private readonly disabilityService: DisabilityService,
    private readonly rankingCriteriaService: RankingCriteriaService,
    private readonly configService: ConfigService,
    @InjectRepository(Family)
    private readonly familyRepository: Repository<Family>,
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
    @InjectRepository(PersonalDetails)
    private readonly personalDetailsRepository: Repository<PersonalDetails>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProfileData)
    private readonly profileRepository: Repository<ProfileData>,
  ) {}

  async calculateStudentAcademicScore(gpa: number | null | undefined) {
    const criteria = await this.rankingCriteriaService.getActiveCriteria();
    return this.academicPerformanceService.calculateScore(gpa, criteria);
  }

  async getLookupTableData() {
    return this.academicPerformanceService.getLookupTableData();
  }

  async calculateFamilyBackgroundScore(input: FamilyBackgroundScoreInputDto): Promise<FamilyBackgroundScoreDto> {
    const criteria = await this.rankingCriteriaService.getActiveCriteria();
    return this.familyBackgroundService.calculateScore(input, criteria);
  }

  async calculateFamilyBackgroundScoreForUser(userId: string): Promise<FamilyBackgroundScoreDto> {
    const family = await this.familyRepository.findOne({ where: { userId } });
    if (!family) throw new NotFoundException(`Family background for user ${userId} was not found`);

    const criteria = await this.rankingCriteriaService.getActiveCriteria();
    return this.familyBackgroundService.calculateScore({
      parentalStatus: family.parentalStatus,
      fatherMonthlyIncome: family.fatherMonthlyIncome,
      motherMonthlyIncome: family.motherMonthlyIncome,
      parentMonthlyIncome: family.parentMonthlyIncome,
      guardianMonthlyIncome: family.guardianMonthlyIncome,
      numberOfSiblings: family.numberOfSiblings,
      siblingsInPrimary: family.siblingsInPrimary,
      siblingsInSecondary: family.siblingsInSecondary,
      siblingsInTertiary: family.siblingsInTertiary,
    }, criteria);
  }

  async getMonthlyIncomeLookupTableData(): Promise<MonthlyIncomeScoreLookupDto[]> {
    const criteria = await this.rankingCriteriaService.getActiveCriteria();
    return criteria.familyBackground.incomeBands.map((band) => ({
      minimumIncome: band.minimum,
      maximumIncome: band.maximum,
      score: band.score,
      isFlagged: band.isFlagged ?? false,
    }));
  }

  async calculateEducationBackgroundScore(input: EducationBackgroundScoreInputDto): Promise<EducationBackgroundScoreDto> {
    const criteria = await this.rankingCriteriaService.getActiveCriteria();
    return this.educationBackgroundService.calculateScore(input, criteria);
  }

  async calculateEducationBackgroundScoreForUser(userId: string): Promise<EducationBackgroundScoreDto> {
    const educationRecords = await this.educationRepository.find({ where: { userId }, order: { yearCompleted: 'DESC' } });
    if (educationRecords.length === 0) throw new NotFoundException(`Education records for user ${userId} were not found`);

    const primary = educationRecords.find((record) => record.educationLevel === EducationLevel.PRIMARY);
    const secondary = educationRecords.find((record) => record.educationLevel === EducationLevel.SECONDARY);

    const criteria = await this.rankingCriteriaService.getActiveCriteria();
    return this.educationBackgroundService.calculateScore({
      primary: primary ? {
        tuitionFees: primary.tuitionFees,
        whoPaidFees: primary.whoPaidFees,
        certificateUrl: primary.certificateUrl,
        isVerified: primary.isVerified,
      } : null,
      secondary: secondary ? {
        tuitionFees: secondary.tuitionFees,
        whoPaidFees: secondary.whoPaidFees,
        certificateUrl: secondary.certificateUrl,
        isVerified: secondary.isVerified,
      } : null,
    }, criteria);
  }

  async scoreStudentFromSchoolDatabase(registrationNumber: string, criteria?: RankingCriteriaConfig): Promise<SchoolStudentScoreDto> {
    const activeCriteria = criteria ?? await this.rankingCriteriaService.getActiveCriteria();
    const normalizedRegistrationNumber = registrationNumber?.trim();
    if (!normalizedRegistrationNumber) {
      return {
        registrationNumber: '',
        foundInSchoolDatabase: false,
        isRegistered: false,
        schoolStatus: null,
        gpa: null,
        academicScore: 0,
        isFlagged: true,
        flagReason: 'Registration number is required',
        studentName: null,
        department: null,
        yearOfStudy: null,
      };
    }

    const student = await this.fetchSchoolStudentByRegistrationNumber(normalizedRegistrationNumber);
    if (!student) {
      return {
        registrationNumber: normalizedRegistrationNumber,
        foundInSchoolDatabase: false,
        isRegistered: false,
        schoolStatus: null,
        gpa: null,
        academicScore: 0,
        isFlagged: true,
        flagReason: 'Student was not found in the school database',
        studentName: null,
        department: null,
        yearOfStudy: null,
      };
    }

    const schoolStatus = student.status?.trim().toLowerCase() ?? null;
    const isRegistered = schoolStatus === 'registered';
    const gpa = this.parseSchoolGpa(student.GPA);

    if (!isRegistered) {
      return {
        registrationNumber: student.registrationNumber ?? normalizedRegistrationNumber,
        foundInSchoolDatabase: true,
        isRegistered: false,
        schoolStatus,
        gpa,
        academicScore: 0,
        isFlagged: true,
        flagReason: `Student is not currently registered. School status: ${schoolStatus ?? 'unknown'}`,
        studentName: student.name ?? null,
        department: student.department ?? null,
        yearOfStudy: student.yearOfStudy ?? null,
      };
    }

    const scoreResult = this.academicPerformanceService.calculateScore(gpa, activeCriteria);
    return {
      registrationNumber: student.registrationNumber ?? normalizedRegistrationNumber,
      foundInSchoolDatabase: true,
      isRegistered: true,
      schoolStatus,
      gpa,
      academicScore: scoreResult.score,
      isFlagged: scoreResult.isFlagged,
      flagReason: scoreResult.flagReason,
      studentName: student.name ?? null,
      department: student.department ?? null,
      yearOfStudy: student.yearOfStudy ?? null,
    };
  }

  async verifyNationalIdFromNrb(nationalId: string): Promise<NrbVerificationDto> {
    const normalizedNationalId = nationalId?.trim();
    if (!normalizedNationalId) {
      return {
        nationalId: '',
        foundInNrbDatabase: false,
        fullName: null,
        status: null,
        isDeceased: false,
        isFlagged: true,
        flagReason: 'National ID is required',
      };
    }

    const record = await this.fetchNrbRecordByNationalId(normalizedNationalId);
    if (!record) {
      return {
        nationalId: normalizedNationalId,
        foundInNrbDatabase: false,
        fullName: null,
        status: null,
        isDeceased: false,
        isFlagged: true,
        flagReason: 'National ID was not found in the NRB database',
      };
    }

    const status = record.status?.trim().toLowerCase() ?? null;
    const isDeceased = status === 'deceased';

    return {
      nationalId: record.nationalId ?? normalizedNationalId,
      foundInNrbDatabase: true,
      fullName: record.fullName ?? null,
      status,
      isDeceased,
      isFlagged: isDeceased,
      flagReason: isDeceased ? 'NRB indicates this person is deceased' : null,
    };
  }

  async checkExternalStudentDataConnection() {
    // Test UNIMA API by hitting the /student-data endpoint (returns empty list when no data, not 404)
    const url = `${this.getUnimaApiBaseUrl()}/student-data`;
    return this.checkConnection(url);
  }

  async checkNrbConnection() {
    // Test NRB API by hitting /nrb which lists all records
    const url = `${this.getNrbApiBaseUrl()}/nrb`;
    return this.checkConnection(url);
  }

  async checkAllExternalConnections() {
    const [schoolDatabase, nrbDatabase] = await Promise.all([
      this.checkExternalStudentDataConnection(),
      this.checkNrbConnection(),
    ]);

    return { schoolDatabase, nrbDatabase, connected: schoolDatabase.connected && nrbDatabase.connected };
  }

  async getAdminDashboardRankings(page = 1, pageSize = 50): Promise<AdminDashboardPaginatedDto> {
    const rankings = await this.refreshAllRankings();
    const total = rankings.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;

    return {
      data: rankings.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async calculateComprehensiveStudentScore(input: ComprehensiveStudentScoreInputDto): Promise<ComprehensiveStudentScoreDto> {
    const user = await this.userRepository.findOne({ where: { id: input.userId } });
    if (!user) throw new NotFoundException(`User ${input.userId} not found`);

    const personalDetails = await this.personalDetailsRepository.findOne({ where: { userId: input.userId } });
    if (!personalDetails) throw new NotFoundException(`Personal details for user ${input.userId} not found`);
    const criteria = await this.rankingCriteriaService.getActiveCriteria();

    const schoolAcademicResult = input.gpa === null || input.gpa === undefined
      ? await this.scoreStudentFromSchoolDatabase(personalDetails.registrationNumber, criteria).catch(() => ({
          academicScore: 0,
          isFlagged: true,
          flagReason: 'Unable to verify student against the school database',
          gpa: null,
        }))
      : null;

    const academicResult = schoolAcademicResult
      ? { score: schoolAcademicResult.academicScore ?? 0, isFlagged: schoolAcademicResult.isFlagged ?? false, flagReason: schoolAcademicResult.flagReason ?? null }
      : this.academicPerformanceService.calculateScore(input.gpa, criteria);

    const familyResult = input.familyBackgroundInput
      ? this.familyBackgroundService.calculateScore(input.familyBackgroundInput, criteria)
      : await this.calculateFamilyBackgroundScoreForUser(input.userId).catch(() => ({
          parentStatusScore: 0,
          monthlyIncomeScore: 0,
          siblingScore: 0,
          educationBurdenScore: 0,
          educationBurdenWeightedTotal: 0,
          currentScore: 0,
          maximumScore: criteria.familyBackground.maximumScore,
          isFlagged: true,
          flagReason: 'Family records not found',
          parentalStatus: null,
          assessedMonthlyIncome: null,
          numberOfSiblings: null,
          siblingsInPrimary: null,
          siblingsInSecondary: null,
          siblingsInTertiary: null,
        }));

    const educationResult = input.educationBackgroundInput
      ? this.educationBackgroundService.calculateScore(input.educationBackgroundInput, criteria)
      : await this.calculateEducationBackgroundScoreForUser(input.userId).catch(() => ({
          primaryScore: 0,
          secondaryScore: 0,
          fundingScore: 0,
          totalScore: 0,
          maximumScore: criteria.educationBackground.maximumScore,
          isFlagged: true,
          flagReason: 'Education records not found',
          primaryFees: null,
          secondaryFees: null,
          primaryFunding: null,
          secondaryFunding: null,
        }));

    const familyDetailsForIntegrity = await this.familyRepository.findOne({ where: { userId: input.userId } }).catch(() => null);

    const integrityResult = await this.integrityCheckService.calculateScore({
      userId: input.userId,
      registrationNumber: input.integrityCheckInput?.registrationNumber || personalDetails.registrationNumber,
      nationalId: input.integrityCheckInput?.nationalId || personalDetails.nationalIdNumber,
      parentNationalId: input.integrityCheckInput?.parentNationalId || this.getLivingParentNationalId(familyDetailsForIntegrity),
      deceasedParentNationalIds: input.integrityCheckInput?.deceasedParentNationalIds || this.getDeceasedParentNationalIds(familyDetailsForIntegrity),
      isDeceased: input.integrityCheckInput?.isDeceased,
      requiredDocumentsSubmitted: input.integrityCheckInput?.requiredDocumentsSubmitted,
    }, criteria);

    const disabilityResult = await this.disabilityService.calculateScore({
      userId: input.userId,
      disability: input.disabilityInput?.disability,
    }, criteria);

    const totalScore =
      academicResult.score +
      familyResult.currentScore +
      educationResult.totalScore +
      integrityResult.totalScore +
      disabilityResult.score;
    const maximumTotalScore =
      criteria.academic.maximumScore +
      criteria.familyBackground.maximumScore +
      criteria.educationBackground.maximumScore +
      criteria.integrityCheck.maximumScore +
      criteria.disability.maximumScore;
    const overallPercentage = Math.round((totalScore / maximumTotalScore) * 100);

    const flagReasons = [
      academicResult.isFlagged && academicResult.flagReason ? `Academic: ${academicResult.flagReason}` : null,
      familyResult.isFlagged && familyResult.flagReason ? `Family: ${familyResult.flagReason}` : null,
      educationResult.isFlagged && educationResult.flagReason ? `Education: ${educationResult.flagReason}` : null,
      integrityResult.isFlagged && integrityResult.flagReason ? `Integrity: ${integrityResult.flagReason}` : null,
      disabilityResult.isFlagged && disabilityResult.flagReason ? `Disability: ${disabilityResult.flagReason}` : null,
    ].filter((reason): reason is string => Boolean(reason));

    return {
      userId: input.userId,
      firstName: personalDetails.firstName,
      lastName: personalDetails.lastName,
      registrationNumber: personalDetails.registrationNumber,
      academicScore: this.toScoreComponent(academicResult.score, criteria.academic.maximumScore),
      familyBackgroundScore: this.toScoreComponent(familyResult.currentScore, criteria.familyBackground.maximumScore),
      educationBackgroundScore: this.toScoreComponent(educationResult.totalScore, criteria.educationBackground.maximumScore),
      integrityCheckScore: this.toScoreComponent(integrityResult.totalScore, criteria.integrityCheck.maximumScore),
      disabilityScore: this.toScoreComponent(disabilityResult.score, criteria.disability.maximumScore),
      totalScore,
      maximumTotalScore,
      overallPercentage,
      isFlagged: flagReasons.length > 0,
      flagReasons,
    };
  }

  async refreshAllRankings(): Promise<AdminDashboardRankingDto[]> {
    const users = await this.userRepository.find({ where: { role: Role.User } });
    if (users.length === 0) return [];
    const criteria = await this.rankingCriteriaService.getActiveCriteria();

    const userIds = users.map((user) => user.id);
    const [personalDetails, families, educationRecords, profiles] = await Promise.all([
      this.personalDetailsRepository.find({ where: { userId: In(userIds) } }),
      this.familyRepository.find({ where: { userId: In(userIds) } }),
      this.educationRepository.find({ where: { userId: In(userIds) } }),
      this.profileRepository.find({ where: { userId: In(userIds) } }),
    ]);

    const personalMap = new Map(personalDetails.map((row) => [row.userId, row]));
    const familyMap = new Map(families.map((row) => [row.userId, row]));
    const profileMap = new Map(profiles.map((row) => [row.userId, row]));
    const educationMap = new Map<string, Education[]>();

    educationRecords.forEach((record) => {
      const list = educationMap.get(record.userId) ?? [];
      list.push(record);
      educationMap.set(record.userId, list);
    });

    const rankings: AdminDashboardRankingDto[] = [];

    for (const user of users) {
      const personalDetail = personalMap.get(user.id);
      if (!personalDetail) continue;

      const family = familyMap.get(user.id);
      const educations = educationMap.get(user.id) ?? [];

      const academicScore = await this.scoreStudentFromSchoolDatabase(personalDetail.registrationNumber, criteria).catch(() => ({
        registrationNumber: personalDetail.registrationNumber,
        foundInSchoolDatabase: false,
        isRegistered: false,
        schoolStatus: null,
        gpa: null,
        academicScore: 0,
        isFlagged: true,
        flagReason: 'Unable to verify student against the school database',
        studentName: null,
        department: null,
        yearOfStudy: null,
      }));

      const familyScore = family
        ? this.familyBackgroundService.calculateScore({
            parentalStatus: family.parentalStatus,
            fatherMonthlyIncome: family.fatherMonthlyIncome,
            motherMonthlyIncome: family.motherMonthlyIncome,
            parentMonthlyIncome: family.parentMonthlyIncome,
            guardianMonthlyIncome: family.guardianMonthlyIncome,
            numberOfSiblings: family.numberOfSiblings,
            siblingsInPrimary: family.siblingsInPrimary,
            siblingsInSecondary: family.siblingsInSecondary,
            siblingsInTertiary: family.siblingsInTertiary,
          }, criteria)
        : {
            parentStatusScore: 0,
            monthlyIncomeScore: 0,
            siblingScore: 0,
            educationBurdenScore: 0,
            educationBurdenWeightedTotal: 0,
            currentScore: 0,
            maximumScore: criteria.familyBackground.maximumScore,
            isFlagged: true,
            flagReason: 'Family data not found',
            parentalStatus: null,
            assessedMonthlyIncome: null,
            numberOfSiblings: null,
            siblingsInPrimary: null,
            siblingsInSecondary: null,
            siblingsInTertiary: null,
          };

      const primary = educations.find((e) => e.educationLevel === EducationLevel.PRIMARY);
      const secondary = educations.find((e) => e.educationLevel === EducationLevel.SECONDARY);
      const educationScore = primary || secondary
        ? this.educationBackgroundService.calculateScore({
            primary: primary ? {
              tuitionFees: primary.tuitionFees,
              whoPaidFees: primary.whoPaidFees,
              certificateUrl: primary.certificateUrl,
              isVerified: primary.isVerified,
            } : null,
            secondary: secondary ? {
              tuitionFees: secondary.tuitionFees,
              whoPaidFees: secondary.whoPaidFees,
              certificateUrl: secondary.certificateUrl,
              isVerified: secondary.isVerified,
            } : null,
          }, criteria)
        : {
            primaryScore: 0,
            secondaryScore: 0,
            fundingScore: 0,
            totalScore: 0,
            maximumScore: criteria.educationBackground.maximumScore,
            isFlagged: true,
            flagReason: 'Education data not found',
            primaryFees: null,
            secondaryFees: null,
            primaryFunding: null,
            secondaryFunding: null,
          };

      const integrityScore = await this.integrityCheckService.calculateScore({
        userId: user.id,
        registrationNumber: personalDetail.registrationNumber,
        nationalId: personalDetail.nationalIdNumber,
        parentNationalId: this.getLivingParentNationalId(family),
        deceasedParentNationalIds: this.getDeceasedParentNationalIds(family),
      }, criteria);

      const disabilityScore = await this.disabilityService.calculateScore({
        userId: user.id,
        disability: personalDetail.disability,
      }, criteria);

      const totalScore =
        academicScore.academicScore +
        familyScore.currentScore +
        educationScore.totalScore +
        integrityScore.totalScore +
        disabilityScore.score;
      const maximumTotalScore =
        criteria.academic.maximumScore +
        criteria.familyBackground.maximumScore +
        criteria.educationBackground.maximumScore +
        criteria.integrityCheck.maximumScore +
        criteria.disability.maximumScore;
      const overallPercentage = maximumTotalScore > 0 ? Math.round((totalScore / maximumTotalScore) * 100) : 0;
      const primaryFlagReason =
        academicScore.flagReason ||
        familyScore.flagReason ||
        educationScore.flagReason ||
        integrityScore.flagReason ||
        disabilityScore.flagReason ||
        null;

      rankings.push({
        rank: 0,
        studentId: user.id,
        firstName: personalDetail.firstName,
        lastName: personalDetail.lastName,
        registrationNumber: personalDetail.registrationNumber,
        email: user.email,
        programOfStudy: academicScore.department ?? 'Programme not available',
        yearOfStudy: academicScore.yearOfStudy ?? 0,
        totalScore,
        academicScore: academicScore.academicScore,
        familyBackgroundScore: familyScore.currentScore,
        educationBackgroundScore: educationScore.totalScore,
        integrityCheckScore: integrityScore.totalScore,
        disabilityScore: disabilityScore.score,
        overallPercentage,
        isFlagged:
          academicScore.isFlagged ||
          familyScore.isFlagged ||
          educationScore.isFlagged ||
          integrityScore.isFlagged ||
          disabilityScore.isFlagged,
        primaryFlagReason,
        hasDisability: disabilityScore.hasDisability,
        disabilityType: disabilityScore.disabilityType,
      });

      const profile = profileMap.get(user.id) ?? this.profileRepository.create({
        userId: user.id,
        firstName: personalDetail.firstName,
        lastName: personalDetail.lastName,
        registrationNumber: personalDetail.registrationNumber,
        status: 'pending_review',
      });

      profile.firstName = personalDetail.firstName;
      profile.lastName = personalDetail.lastName;
      profile.registrationNumber = personalDetail.registrationNumber;
      profile.score = totalScore;
      profile.overallPercentage = overallPercentage;
      profile.isRanked = true;
      profile.scoreFlagged = rankings[rankings.length - 1].isFlagged;
      profile.scoreFlagReason = primaryFlagReason ?? '';
      profile.scoreUpdatedAt = new Date();

      // scoreFlagged / scoreFlagReason are informational only  they surface
      // scoring anomalies in the admin review panel but do NOT change the
      // profile status. Only an admin can set status to 'flagged'.

      profileMap.set(user.id, profile);
    }

    rankings.sort((a, b) => b.totalScore - a.totalScore);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    await this.profileRepository.save([...profileMap.values()]);

    return rankings;
  }

  private toScoreComponent(score: number, maximumScore: number) {
    return {
      score,
      maximumScore,
      percentage: maximumScore > 0 ? Math.round((score / maximumScore) * 100) : 0,
    };
  }

  private parseSchoolGpa(gpa: string | number | null | undefined): number | null {
    if (gpa === null || gpa === undefined || gpa === '') return null;
    const parsed = Number(gpa);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async fetchSchoolStudentByRegistrationNumber(registrationNumber: string): Promise<SchoolStudentRecord | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.getUnimaApiBaseUrl()}/student-data/${encodeURIComponent(registrationNumber)}`);
      if (response.status === 404 || !response.ok) return null;

      const text = await response.text();
      if (!text || text.trim() === '' || text.trim() === 'null') return null;

      return JSON.parse(text) as SchoolStudentRecord;
    } catch {
      return null;
    }
  }

  private async fetchNrbRecordByNationalId(nationalId: string): Promise<NrbRecord | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.getNrbApiBaseUrl()}/nrb/${encodeURIComponent(nationalId)}`);
      if (response.status === 404 || !response.ok) return null;
      return (await response.json()) as NrbRecord;
    } catch {
      return null;
    }
  }

  private getLivingParentNationalId(family: Family | null | undefined): string | undefined {
    return family?.parentNationalId || family?.guardianNationalId || family?.fatherNationalId || family?.motherNationalId;
  }

  private getDeceasedParentNationalIds(family: Family | null | undefined): string[] {
    return [family?.deceasedFatherId, family?.deceasedMotherId, family?.deceasedParentId].filter(
      (value): value is string => Boolean(value?.trim()),
    );
  }

  private getUnimaApiBaseUrl(): string {
    return (this.configService.get<string>('UNIMA_API_URL')
      || this.configService.get<string>('STUDENT_DATA_API_URL', 'http://localhost:3004')).replace(/\/+$/, '');
  }

  private getNrbApiBaseUrl(): string {
    return (this.configService.get<string>('NRB_DAME_API_URL')
      || this.configService.get<string>('NRB_API_URL', 'http://localhost:3005')).replace(/\/+$/, '');
  }

  private async checkConnection(url: string) {
    try {
      const response = await this.fetchWithTimeout(url);

      return {
        connected: response.ok,
        status: response.status,
        url,
      };
    } catch (error) {
      return {
        connected: false,
        status: null,
        url,
        error: error instanceof Error ? error.message : 'Connection check failed',
      };
    }
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
