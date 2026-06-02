import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { SponsorAllocation } from './entities/sponsor-allocation.entity';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { FileService } from 'src/file/file.service';
import { ProfileData } from 'src/application/entities/profile_data';
import { ReviewService } from 'src/application/services/review.service';
import { UserService } from 'src/user/user.service';
import { RankingService } from 'src/ranking/ranking.service';
import { RankingCriteriaService } from '../ranking/services/ranking-criteria.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class SponsorService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    @InjectRepository(SponsorAllocation)
    private readonly allocationRepo: Repository<SponsorAllocation>,
    @InjectRepository(ProfileData)
    private readonly profileRepo: Repository<ProfileData>,
    private readonly fileService: FileService,
    private readonly reviewService: ReviewService,
    private readonly userService: UserService,
    private readonly rankingService: RankingService,
    private readonly rankingCriteriaService: RankingCriteriaService,
  ) {}

  private getSponsorStatus(allocatedCount: number, requestedSlots: number) {
    return allocatedCount >= requestedSlots
      ? 'completed'
      : allocatedCount > 0
        ? 'partial'
        : 'pending';
  }

  private getApplicantName(profile: ProfileData) {
    return `${profile.firstName} ${profile.lastName}`.trim();
  }

  private getLogoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private async getSponsorOrThrow(id: string) {
    const sponsor = await this.sponsorRepo.findOne({ where: { id } });

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return sponsor;
  }

  private async getUsersById(userIds: string[]) {
    const users = await this.userService.findByIds(userIds);
    return new Map(users.map((user: User) => [user.id, user]));
  }

  private async getProfilesByUserId(userIds: string[]) {
    if (!userIds.length) {
      return new Map<string, ProfileData>();
    }

    const profiles = await this.profileRepo.find({
      where: { userId: In(userIds) },
    });

    return new Map(profiles.map((profile) => [profile.userId, profile]));
  }

  private async uploadSponsorLogo(
    name: string,
    logoFile?: Express.Multer.File,
  ) {
    if (!logoFile) {
      return {
        logoUrl: null,
        logoFilename: null,
      };
    }

    const uploaded = await this.fileService.uploadImageFile(
      logoFile,
      'sponsors/logos',
      this.getLogoSlug(name),
    );

    return {
      logoUrl: uploaded.url,
      logoFilename: uploaded.filename,
    };
  }

  private async activateRankingCriteria(rankingCriteriaId?: string) {
    if (!rankingCriteriaId) {
      return false;
    }

    try {
      await this.rankingCriteriaService.activateTemplate(rankingCriteriaId);
      return true;
    } catch (err) {
      throw new BadRequestException(
        `Failed to activate criteria: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  private async buildApprovedApplicantPool(excludedUserIds: string[] = []) {
    await this.rankingService.refreshAllRankings().catch(() => null);

    const allProfiles = await this.profileRepo.find({
      order: { score: 'DESC', firstName: 'ASC', lastName: 'ASC' },
    });

    const excludedUserIdSet = new Set(excludedUserIds);
    const profiles = allProfiles.filter((profile) => {
      const isApproved =
        (profile.status ?? '').trim().toLowerCase() === 'approved';
      const isExcluded = excludedUserIdSet.has(profile.userId);
      return isApproved && !isExcluded;
    });

    const userById = await this.getUsersById(
      profiles.map((profile) => profile.userId),
    );

    const applicants = await Promise.all(
      profiles.map(async (profile) => {
        const readiness = await this.reviewService
          .canSubmitApplication(profile.userId)
          .catch(() => ({ completionPercentage: 0 }));
        const user = userById.get(profile.userId);

        return {
          userId: profile.userId,
          name: this.getApplicantName(profile),
          email: user?.email ?? '',
          registrationNumber: profile.registrationNumber,
          program: 'Programme not submitted',
          department: null,
          yearOfStudy: null,
          score: profile.score ?? Math.round(readiness.completionPercentage),
          rank: profile.rank ?? null,
        };
      }),
    );

    return applicants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (
        (a.rank ?? Number.MAX_SAFE_INTEGER) !==
        (b.rank ?? Number.MAX_SAFE_INTEGER)
      ) {
        return (
          (a.rank ?? Number.MAX_SAFE_INTEGER) -
          (b.rank ?? Number.MAX_SAFE_INTEGER)
        );
      }
      return a.name.localeCompare(b.name);
    });
  }

  private async getAllocatedCountBySponsorId() {
    const allocations = await this.allocationRepo.find();
    return allocations.reduce<Map<string, number>>((map, allocation) => {
      map.set(allocation.sponsorId, (map.get(allocation.sponsorId) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
  }

  async createSponsor(
    createDto: CreateSponsorDto,
    logoFile?: Express.Multer.File,
  ) {
    const existing = await this.sponsorRepo.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('A sponsor with this name already exists');
    }

    const { logoUrl, logoFilename } = await this.uploadSponsorLogo(
      createDto.name,
      logoFile,
    );
    const isCriteriaActivated = await this.activateRankingCriteria(
      createDto.rankingCriteriaId,
    );

    const sponsor = await this.sponsorRepo.save(
      this.sponsorRepo.create({
        name: createDto.name,
        requestedSlots: createDto.requestedSlots,
        logoUrl,
        logoFilename,
        rankingCriteriaId: createDto.rankingCriteriaId || null,
        isCriteriaActivated,
      }),
    );

    const existingAllocations = await this.allocationRepo.find();
    const excludedUserIds = existingAllocations.map(
      (allocation) => allocation.userId,
    );
    const pool = await this.buildApprovedApplicantPool(excludedUserIds);
    const selected = pool.slice(0, sponsor.requestedSlots);

    if (selected.length === 0) {
      return this.getSponsorById(sponsor.id);
    }

    await this.allocationRepo.save(
      selected.map((applicant, index) =>
        this.allocationRepo.create({
          sponsorId: sponsor.id,
          userId: applicant.userId,
          rank: index + 1,
          score: applicant.score,
        }),
      ),
    );

    return this.getSponsorById(sponsor.id);
  }

  async getSponsors() {
    const [sponsors, allocatedCountBySponsorId] = await Promise.all([
      this.sponsorRepo.find({ order: { createdAt: 'DESC' } }),
      this.getAllocatedCountBySponsorId(),
    ]);

    return sponsors.map((sponsor) => {
      const allocatedCount = allocatedCountBySponsorId.get(sponsor.id) ?? 0;
      return {
        id: sponsor.id,
        name: sponsor.name,
        logoUrl: sponsor.logoUrl,
        requestedSlots: sponsor.requestedSlots,
        rankingCriteriaId: sponsor.rankingCriteriaId,
        isCriteriaActivated: sponsor.isCriteriaActivated,
        allocatedCount,
        status: this.getSponsorStatus(allocatedCount, sponsor.requestedSlots),
      };
    });
  }

  async getSponsorById(id: string) {
    const sponsor = await this.getSponsorOrThrow(id);

    const allocations = await this.allocationRepo.find({
      where: { sponsorId: id },
      order: { rank: 'ASC' },
    });

    const userIds = allocations.map((allocation) => allocation.userId);
    const [profileByUserId, userById] = await Promise.all([
      this.getProfilesByUserId(userIds),
      this.getUsersById(userIds),
    ]);

    const applicants = allocations.map((allocation) => {
      const profile = profileByUserId.get(allocation.userId);
      const user = userById.get(allocation.userId);

      return {
        userId: allocation.userId,
        rank: allocation.rank,
        score: allocation.score,
        name: profile ? this.getApplicantName(profile) : 'Unknown Applicant',
        email: user?.email ?? '',
        registrationNumber: profile?.registrationNumber ?? '',
        program: 'Programme not submitted',
        department: null,
        yearOfStudy: null,
      };
    });

    return {
      id: sponsor.id,
      name: sponsor.name,
      logoUrl: sponsor.logoUrl,
      logoFilename: sponsor.logoFilename,
      requestedSlots: sponsor.requestedSlots,
      rankingCriteriaId: sponsor.rankingCriteriaId,
      isCriteriaActivated: sponsor.isCriteriaActivated,
      allocatedCount: applicants.length,
      status: this.getSponsorStatus(applicants.length, sponsor.requestedSlots),
      applicants,
    };
  }

  async deleteSponsor(id: string) {
    await this.getSponsorOrThrow(id);

    await this.allocationRepo.delete({ sponsorId: id });
    await this.sponsorRepo.delete(id);

    return {
      success: true,
      message: 'Sponsor deleted successfully',
    };
  }
}
