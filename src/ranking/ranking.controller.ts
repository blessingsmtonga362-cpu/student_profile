import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../auth/metadata';
import {
  AdminDashboardPaginatedDto,
  ComprehensiveStudentScoreDto,
  ComprehensiveStudentScoreInputDto,
  EducationBackgroundScoreDto,
  EducationBackgroundScoreInputDto,
  FamilyBackgroundScoreDto,
  FamilyBackgroundScoreInputDto,
  GpaScoreLookupDto,
  MonthlyIncomeScoreLookupDto,
  NrbVerificationDto,
  SchoolStudentScoreDto,
  ScoreCalculationResultDto,
} from './dto/ranking-score.dto';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Public()
  @Post('calculate-score')
  async calculateScore(@Query('gpa') gpaParam: string): Promise<ScoreCalculationResultDto> {
    if (!gpaParam) throw new BadRequestException('GPA parameter is required');
    const gpa = parseFloat(gpaParam);
    if (Number.isNaN(gpa)) throw new BadRequestException('GPA must be a valid number');
    if (gpa < 0 || gpa > 4.0) throw new BadRequestException('GPA must be between 0 and 4.0');
    return this.rankingService.calculateStudentAcademicScore(gpa);
  }

  @Public()
  @Get('lookup-table')
  async getLookupTable(): Promise<GpaScoreLookupDto[]> {
    return this.rankingService.getLookupTableData();
  }

  @Public()
  @Post('family-background/calculate')
  async calculateFamilyBackgroundScore(@Body() input: FamilyBackgroundScoreInputDto): Promise<FamilyBackgroundScoreDto> {
    return this.rankingService.calculateFamilyBackgroundScore(input);
  }

  @Public()
  @Get('family-background/user/:userId/score')
  async calculateFamilyBackgroundScoreForUser(@Param('userId') userId: string): Promise<FamilyBackgroundScoreDto> {
    return this.rankingService.calculateFamilyBackgroundScoreForUser(userId);
  }

  @Public()
  @Get('family-background/monthly-income-lookup')
  async getMonthlyIncomeLookupTable(): Promise<MonthlyIncomeScoreLookupDto[]> {
    return this.rankingService.getMonthlyIncomeLookupTableData();
  }

  @Public()
  @Post('education-background/calculate')
  async calculateEducationBackgroundScore(@Body() input: EducationBackgroundScoreInputDto): Promise<EducationBackgroundScoreDto> {
    return this.rankingService.calculateEducationBackgroundScore(input);
  }

  @Public()
  @Get('education-background/user/:userId/score')
  async calculateEducationBackgroundScoreForUser(@Param('userId') userId: string): Promise<EducationBackgroundScoreDto> {
    return this.rankingService.calculateEducationBackgroundScoreForUser(userId);
  }

  @Public()
  @Get('health')
  async health() {
    return { status: 'operational', message: 'Ranking and scoring service is running' };
  }

  @Public()
  @Get('external-health')
  async externalHealth() {
    return this.rankingService.checkExternalStudentDataConnection();
  }

  @Public()
  @Get('integrations-health')
  async integrationsHealth() {
    return this.rankingService.checkAllExternalConnections();
  }

  @Public()
  @Get('nrb-health')
  async nrbHealth() {
    return this.rankingService.checkNrbConnection();
  }

  @Public()
  @Get('nrb/:nationalId/verify')
  async verifyNationalId(@Param('nationalId') nationalId: string): Promise<NrbVerificationDto> {
    return this.rankingService.verifyNationalIdFromNrb(nationalId);
  }

  @Public()
  @Get('school-student/:registrationNumber/score')
  async scoreSchoolStudent(@Param('registrationNumber') registrationNumber: string): Promise<SchoolStudentScoreDto> {
    return this.rankingService.scoreStudentFromSchoolDatabase(registrationNumber);
  }

  @Public()
  @Post('comprehensive/calculate')
  async calculateComprehensiveScore(@Body() input: ComprehensiveStudentScoreInputDto): Promise<ComprehensiveStudentScoreDto> {
    return this.rankingService.calculateComprehensiveStudentScore(input);
  }

  @Public()
  @Get('admin-dashboard/rankings')
  async getAdminDashboardRankings(
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ): Promise<AdminDashboardPaginatedDto> {
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const pageSize = pageSizeParam ? Math.max(1, Math.min(200, parseInt(pageSizeParam, 10))) : 50;
    return this.rankingService.getAdminDashboardRankings(page, pageSize);
  }
}
