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
    return this.academicPerformanceService.calculateScore(gpa);
  }

  async getLookupTableData() {
    return this.academicPerformanceService.getLookupTableData();
  }

  async calculateFamilyBackgroundScore(input: FamilyBackgroundScoreInputDto): Promise<FamilyBackgroundScoreDto> {
    return this.familyBackgroundService.calculateScore(input);
  }

  async calculateFamilyBackgroundScoreForUser(userId: string): Promise<FamilyBackgroundScoreDto> {
    const family = await this.familyRepository.findOne({ where: { userId } });
    if (!family) throw new NotFoundException(`Family background for user ${userId} was not found`);

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
    });
  }

  async getMonthlyIncomeLookupTableData(): Promise<MonthlyIncomeScoreLookupDto[]> {
    return this.familyBackgroundService.getMonthlyIncomeLookupTableData();
  }

  async calculateEducationBackgroundScore(input: EducationBackgroundScoreInputDto): Promise<EducationBackgroundScoreDto> {
    return this.educationBackgroundService.calculateScore(input);
  }

  async calculateEducationBackgroundScoreForUser(userId: string): Promise<EducationBackgroundScoreDto> {
    const educationRecords = await this.educationRepository.find({ where: { userId }, order: { yearCompleted: 'DESC' } });
    if (educationRecords.length === 0) throw new NotFoundException(`Education records for user ${userId} were not found`);

    const primary = educationRecords.find((record) => record.educationLevel === EducationLevel.PRIMARY);
    const secondary = educationRecords.find((record) => record.educationLevel === EducationLevel.SECONDARY);

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
    });
  }

  async scoreStudentFromSchoolDatabase(registrationNumber: string): Promise<SchoolStudentScoreDto> {
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

    const scoreResult = this.academicPerformanceService.calculateScore(gpa);
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

  async checkExternalStudentDataConnection() {
    const url = this.getUnimaApiBaseUrl();
    return this.checkConnection(url);
  }

  async checkNrbConnection() {
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

  async calculateComprehensiveStudentScore(input: ComprehensiveStudentScoreInputDto): Promise<ComprehensiveStudentScoreDto> {
    const user = await this.userRepository.findOne({ where: { id: input.userId } });
    if (!user) throw new NotFoundException(`User ${input.userId} not found`);

    const personalDetails = await this.personalDetailsRepository.findOne({ where: { userId: input.userId } });
    if (!personalDetails) throw new NotFoundException(`Personal details for user ${input.userId} not found`);

    const schoolAcademicResult = input.gpa === null || input.gpa === undefined
      ? await this.scoreStudentFromSchoolDatabase(personalDetails.registrationNumber).catch(() => ({
          academicScore: 0,
          isFlagged: true,
          flagReason: 'Unable to verify student against the school database',
          gpa: null,
        }))
      : null;

    const academicResult = schoolAcademicResult
      ? { score: schoolAcademicResult.academicScore ?? 0, isFlagged: schoolAcademicResult.isFlagged ?? false, flagReason: schoolAcademicResult.flagReason ?? null }
      : this.academicPerformanceService.calculateScore(input.gpa);

    const familyResult = input.familyBackgroundInput
      ? this.familyBackgroundService.calculateScore(input.familyBackgroundInput)
      : await this.calculateFamilyBackgroundScoreForUser(input.userId).catch(() => ({
          parentStatusScore: 0,
          monthlyIncomeScore: 0,
          siblingScore: 0,
          educationBurdenScore: 0,
          educationBurdenWeightedTotal: 0,
          currentScore: 0,
          maximumScore: 40,
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
      ? this.educationBackgroundService.calculateScore(input.educationBackgroundInput)
      : await this.calculateEducationBackgroundScoreForUser(input.userId).catch(() => ({
          primaryScore: 0,
          secondaryScore: 0,
          fundingScore: 0,
          totalScore: 0,
          maximumScore: 15,
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
    });

    const disabilityResult = await this.disabilityService.calculateScore({
      userId: input.userId,
      disability: input.disabilityInput?.disability,
    });

    const totalScore =
      academicResult.score +
      familyResult.currentScore +
      educationResult.totalScore +
      integrityResult.totalScore +
      disabilityResult.score;
    const maximumTotalScore = 100;
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
      academicScore: { score: academicResult.score, maximumScore: 30, percentage: Math.round((academicResult.score / 30) * 100) },
      familyBackgroundScore: { score: familyResult.currentScore, maximumScore: 40, percentage: Math.round((familyResult.currentScore / 40) * 100) },
      educationBackgroundScore: { score: educationResult.totalScore, maximumScore: 15, percentage: Math.round((educationResult.totalScore / 15) * 100) },
      integrityCheckScore: { score: integrityResult.totalScore, maximumScore: 8, percentage: Math.round((integrityResult.totalScore / 8) * 100) },
      disabilityScore: { score: disabilityResult.score, maximumScore: 7, percentage: Math.round((disabilityResult.score / 7) * 100) },
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

      const academicScore = await this.scoreStudentFromSchoolDatabase(personalDetail.registrationNumber).catch(() => ({
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
          })
        : {
            parentStatusScore: 0,
            monthlyIncomeScore: 0,
            siblingScore: 0,
            educationBurdenScore: 0,
            educationBurdenWeightedTotal: 0,
            currentScore: 0,
            maximumScore: 40,
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
          })
        : {
            primaryScore: 0,
            secondaryScore: 0,
            fundingScore: 0,
            totalScore: 0,
            maximumScore: 15,
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
      });

      const disabilityScore = await this.disabilityService.calculateScore({
        userId: user.id,
        disability: personalDetail.disability,
      });

      const totalScore =
        academicScore.academicScore +
        familyScore.currentScore +
        educationScore.totalScore +
        integrityScore.totalScore +
        disabilityScore.score;
      const overallPercentage = Math.round(totalScore);
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
      profileMap.set(user.id, profile);
    }

    rankings.sort((a, b) => b.totalScore - a.totalScore || a.lastName.localeCompare(b.lastName));
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
      const profile = profileMap.get(ranking.studentId);
      if (profile) {
        profile.rank = ranking.rank;
      }
    });

    await this.profileRepository.save([...profileMap.values()]);
    return rankings;
  }

  async getAdminDashboardRankings(page = 1, pageSize = 50): Promise<AdminDashboardPaginatedDto> {
    const rankings = await this.refreshAllRankings();
    const start = (page - 1) * pageSize;
    const data = rankings.slice(start, start + pageSize);
    return {
      data,
      total: rankings.length,
      page,
      pageSize,
      totalPages: Math.ceil(rankings.length / pageSize),
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
    return {
      nationalId: record.nationalId ?? normalizedNationalId,
      foundInNrbDatabase: true,
      fullName: record.fullName ?? null,
      status,
      isDeceased: status === 'deceased',
      isFlagged: false,
      flagReason: null,
    };
  }

  private async checkConnection(url: string) {
    try {
      const resp = await this.fetchWithTimeout(url);
      return {
        connected: resp.ok,
        url,
        statusCode: resp.status,
        statusText: resp.statusText,
      };
    } catch (error) {
      return {
        connected: false,
        url,
        statusCode: 0,
        statusText: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async fetchSchoolStudentByRegistrationNumber(registrationNumber: string): Promise<SchoolStudentRecord | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.getUnimaApiBaseUrl()}/student-data/${encodeURIComponent(registrationNumber)}`);
      if (response.status === 404 || !response.ok) return null;
      return (await response.json()) as SchoolStudentRecord;
    } catch {
      return null;
    }
  }

  private parseSchoolGpa(gpa: string | number | null | undefined): number | null {
    if (gpa === null || gpa === undefined || gpa === '') return null;
    const parsed = Number(gpa);
    return Number.isFinite(parsed) ? parsed : null;
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
