import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { SponsorAllocation } from './entities/sponsor-allocation.entity';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { FileService } from 'src/file/file.service';
import { ProfileData } from 'src/application/entities/profile_data';
import { ReviewService } from 'src/application/services/reviewService';
import { AcademicDetails } from 'src/application/entities/academic_details.entity';
import { UserService } from 'src/user/user.service';
import { RankingService } from 'src/ranking/ranking.service';

@Injectable()
export class SponsorService {
  constructor(
    @InjectRepository(Sponsor)
    private readonly sponsorRepo: Repository<Sponsor>,
    @InjectRepository(SponsorAllocation)   
    private readonly allocationRepo: Repository<SponsorAllocation>,
    @InjectRepository(ProfileData)
    private readonly profileRepo: Repository<ProfileData>,
    @InjectRepository(AcademicDetails)
    private readonly academicRepo: Repository<AcademicDetails>,
    private readonly fileService: FileService,
    private readonly reviewService: ReviewService,
    private readonly userService: UserService,
    private readonly rankingService: RankingService,
  ) {}

  private async buildApprovedApplicantPool(excludedUserIds: string[] = []) {
    await this.rankingService.refreshAllRankings().catch(() => null);

    const allProfiles = await this.profileRepo.find({
      order: { score: 'DESC', firstName: 'ASC', lastName: 'ASC' },
    });

    const profiles = allProfiles.filter((profile) => {
      const isApproved = (profile.status ?? '').trim().toLowerCase() === 'approved';
      const isExcluded = excludedUserIds.includes(profile.userId);
      return isApproved && !isExcluded;
    });

    const academicDetails = profiles.length
      ? await this.academicRepo.find({
          where: profiles.map((profile) => ({ userId: profile.userId })),
        })
      : [];

    const academicsByUserId = new Map(academicDetails.map((record) => [record.userId, record]));

    const applicants = await Promise.all(
      profiles.map(async (profile) => {
        const readiness = await this.reviewService
          .canSubmitApplication(profile.userId)
          .catch(() => ({ completionPercentage: 0 }));
        const user = await this.userService.findById(profile.userId);
        const academic = academicsByUserId.get(profile.userId);

        return {
          userId: profile.userId,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          email: user?.email ?? '',
          registrationNumber: profile.registrationNumber,
          program: academic?.programOfStudy ?? 'Programme not yet submitted',
          department: academic?.department ?? null,
          yearOfStudy: academic?.yearOfStudy ?? null,
          score: profile.score ?? Math.round(readiness.completionPercentage),
          rank: profile.rank ?? null,
        };
      }),
    );

    return applicants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((a.rank ?? Number.MAX_SAFE_INTEGER) !== (b.rank ?? Number.MAX_SAFE_INTEGER)) {
        return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
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

  async createSponsor(createDto: CreateSponsorDto, logoFile?: Express.Multer.File) {
    const existing = await this.sponsorRepo.findOne({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('A sponsor with this name already exists');
    }

    let logoUrl: string | null = null;
    let logoFilename: string | null = null;

    if (logoFile) {
      const uploaded = await this.fileService.uploadImageFile(
        logoFile,
        'sponsors/logos',
        createDto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      );
      logoUrl = uploaded.url;
      logoFilename = uploaded.filename;
    }

    const sponsor = await this.sponsorRepo.save(
      this.sponsorRepo.create({
        name: createDto.name,
        requestedSlots: createDto.requestedSlots,
        logoUrl,
        logoFilename,
      }),
    );

    const existingAllocations = await this.allocationRepo.find();
    const excludedUserIds = existingAllocations.map((allocation) => allocation.userId);
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
        allocatedCount,
        status: allocatedCount >= sponsor.requestedSlots ? 'completed' : allocatedCount > 0 ? 'partial' : 'pending',
      };
    });
  }

  async getSponsorById(id: string) {
    const sponsor = await this.sponsorRepo.findOne({ where: { id } });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    const allocations = await this.allocationRepo.find({
      where: { sponsorId: id },
      order: { rank: 'ASC' },
    });

    const userIds = allocations.map((allocation) => allocation.userId);
    const profiles = userIds.length
      ? await this.profileRepo.find({ where: userIds.map((userId) => ({ userId })) })
      : [];
    const academics = userIds.length
      ? await this.academicRepo.find({ where: userIds.map((userId) => ({ userId })) })
      : [];

    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));
    const academicByUserId = new Map(academics.map((academic) => [academic.userId, academic]));

    const applicants = await Promise.all(
      allocations.map(async (allocation) => {
        const profile = profileByUserId.get(allocation.userId);
        const academic = academicByUserId.get(allocation.userId);
        const user = await this.userService.findById(allocation.userId);

        return {
          userId: allocation.userId,
          rank: allocation.rank,
          score: allocation.score,
          name: profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Unknown Applicant',
          email: user?.email ?? '',
          registrationNumber: profile?.registrationNumber ?? '',
          program: academic?.programOfStudy ?? 'Programme not yet submitted',
          department: academic?.department ?? null,
          yearOfStudy: academic?.yearOfStudy ?? null,
        };
      }),
    );

    return {
      id: sponsor.id,
      name: sponsor.name,
      logoUrl: sponsor.logoUrl,
      logoFilename: sponsor.logoFilename,
      requestedSlots: sponsor.requestedSlots,
      allocatedCount: applicants.length,
      status: applicants.length >= sponsor.requestedSlots ? 'completed' : applicants.length > 0 ? 'partial' : 'pending',
      applicants,
    };
  }
}
