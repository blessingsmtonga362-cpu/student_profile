import { BadRequestException, Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileData } from 'src/application/entities/profile_data';
import { PersonalDetails } from 'src/application/entities/personal_details.entity';
import { AcademicDetails } from 'src/application/entities/academic_details.entity';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { ReviewService } from 'src/application/services/reviewService';
import { AdminApplicationReviewStatus, CreateAdminDto } from './dto/create-admin.dto';
import { StudentNotificationService } from 'src/notification/service/studentNotification.service';
import { NotificationPriority, NotificationType, UserRole } from 'src/notification/entity/studentNotification.entity';
import { UserService } from 'src/user/user.service';
import { RankingService } from 'src/ranking/ranking.service';

@Injectable()
export class AdminService {
constructor(
  @InjectRepository(ProfileData)
  private readonly profileRepo: Repository<ProfileData>,
  @InjectRepository(AcademicDetails)
  private readonly academicRepo: Repository<AcademicDetails>,
  @InjectRepository(VerificationLog)
  private readonly verificationLogRepo: Repository<VerificationLog>,
  @Inject(forwardRef(() => ReviewService))
  private readonly reviewRepo: ReviewService,
  private readonly notificationService: StudentNotificationService,
  private readonly userService: UserService,
  private readonly rankingService: RankingService,
){}

private normalizeProfileStatus(status?: string | null): string {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'approved':
      return AdminApplicationReviewStatus.APPROVED;
    case 'flagged':
      return AdminApplicationReviewStatus.FLAGGED;
    case 'pending_review':
    case 'pending':
      return 'pending_review';
    default:
      return 'pending_review';
  }
}

private async getOrCreateProfile(userId: string) {
  const existingProfile = await this.profileRepo.findOne({
    where: { userId },
  });

  if (existingProfile) {
    return existingProfile;
  }

  const user = await this.userService.findById(userId);
  if (!user) {
    throw new NotFoundException('Applicant not found');
  }

  const profile = this.profileRepo.create({
    userId,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    registrationNumber: user.registrationNumber ?? '',
    status: 'pending_review',
  });

  return this.profileRepo.save(profile);
}

async syncProfile(personal: PersonalDetails) {
  if (!personal) return;

  const { userId } = personal;

  let profile = await this.profileRepo.findOne({
    where: { userId }
  });

  // CREATE NEW PROFILE IF NOT EXISTS.....upapangenso check apapa ...this logic ndimayiyikila kuti can add awiri on one user
  if (!profile) {
    profile = this.profileRepo.create({
      userId
    });
  }

  // ndupanga copy data from ma filds
  profile.firstName = personal.firstName;
  profile.lastName = personal.lastName;
  profile.registrationNumber = personal.registrationNumber;

  await this.profileRepo.save(profile);
}

async getProfiles(){
  return await this.profileRepo.find()
}

async getDashboardStats() {
  await this.rankingService.refreshAllRankings().catch(() => null);

  const profiles = await this.profileRepo.find({
    order: { status: 'ASC', score: 'DESC', firstName: 'ASC', lastName: 'ASC' },
  });

  const approvedSupport = profiles.filter(
    (profile) => this.normalizeProfileStatus(profile.status) === AdminApplicationReviewStatus.APPROVED,
  ).length;

  const flaggedFiles = profiles.filter(
    (profile) => this.normalizeProfileStatus(profile.status) === AdminApplicationReviewStatus.FLAGGED,
  ).length;

  const academicDetails = profiles.length
    ? await this.academicRepo.find({
        where: profiles.map((profile) => ({ userId: profile.userId })),
      })
    : [];

  const academicsByUserId = new Map(
    academicDetails.map((record) => [record.userId, record]),
  );

  const queueProfiles = profiles
    .filter((profile) => this.normalizeProfileStatus(profile.status) === 'pending_review')
    .slice(0, 10);

  const completionByUserId = new Map(
    await Promise.all(
      queueProfiles.map(async (profile) => {
        const submissionReadiness = await this.reviewRepo
          .canSubmitApplication(profile.userId)
          .catch(() => ({
            completionPercentage: 0,
          }));

        return [profile.userId, Math.round(submissionReadiness.completionPercentage)] as const;
      }),
    ),
  );

  return {
    totalApplications: profiles.length,
    approvedSupport,
    flaggedFiles,
    priorityQueue: queueProfiles.map((profile) => {
        const academic = academicsByUserId.get(profile.userId);
        return {
          id: profile.userId,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          registrationNumber: profile.registrationNumber,
          program: academic?.programOfStudy ?? 'Programme not yet submitted',
          score: profile.score ?? completionByUserId.get(profile.userId) ?? 0,
          rank: profile.rank ?? null,
          status: this.normalizeProfileStatus(profile.status),
        };
      }),
  };
}

async getApplicationsByStatus(status: 'approved' | 'flagged') {
  await this.rankingService.refreshAllRankings().catch(() => null);

  const profiles = await this.profileRepo.find({
    order: { score: 'DESC', firstName: 'ASC', lastName: 'ASC' },
  });

  const filteredProfiles = profiles.filter(
    (profile) => this.normalizeProfileStatus(profile.status) === status,
  );

  const academicDetails = filteredProfiles.length
    ? await this.academicRepo.find({
        where: filteredProfiles.map((profile) => ({ userId: profile.userId })),
      })
    : [];

  const academicsByUserId = new Map(
    academicDetails.map((record) => [record.userId, record]),
  );

  const applicants = await Promise.all(
    filteredProfiles.map(async (profile) => {
      const user = await this.userService.findById(profile.userId);
      const academic = academicsByUserId.get(profile.userId);

      return {
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: user?.email ?? '',
        registrationNumber: profile.registrationNumber,
        score: profile.score ?? 0,
        rank: profile.rank ?? null,
        overallPercentage: profile.overallPercentage ?? 0,
        scoreFlagged: profile.scoreFlagged ?? false,
        scoreFlagReason: profile.scoreFlagReason ?? null,
        status: this.normalizeProfileStatus(profile.status),
        reviewComments: profile.reviewComments ?? null,
        program: academic?.programOfStudy ?? 'Programme not yet submitted',
        department: academic?.department ?? null,
        yearOfStudy: academic?.yearOfStudy ?? null,
      };
    }),
  );

  return {
    status,
    count: applicants.length,
    applicants,
  };
}

async getUserApplication(userId: string) {
  await this.rankingService.refreshAllRankings().catch(() => null);

  const [profile, application, verificationLogs, user] = await Promise.all([
    this.getOrCreateProfile(userId),
    this.reviewRepo.getCompleteApplication(userId),
    this.verificationLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    }),
    this.userService.findById(userId),
  ]);

  if (!user) {
    throw new NotFoundException('Applicant not found');
  }

  return {
    applicant: {
      userId: user.id,
      email: user.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      registrationNumber: profile.registrationNumber,
      score: profile.score ?? 0,
      rank: profile.rank ?? null,
      overallPercentage: profile.overallPercentage ?? 0,
      scoreFlagged: profile.scoreFlagged ?? false,
      scoreFlagReason: profile.scoreFlagReason ?? null,
      status: this.normalizeProfileStatus(profile.status),
      reviewComments: profile.reviewComments ?? null,
    },
    application: application.data,
    applicationMeta: application.metadata,
    verificationLogs,
  };
}

async getAdminNotifications(adminId: string) {
  const result = await this.notificationService.getUserNotifications(adminId, {
    limit: 50,
    offset: 0,
  });

  return result.notifications;
}

async markAdminNotificationRead(notificationId: string, adminId: string) {
  return this.notificationService.markAsRead(notificationId, adminId);
}

async markAllAdminNotificationsRead(adminId: string) {
  return this.notificationService.markAllAsRead(adminId);
}

async clearAdminNotifications(adminId: string) {
  return this.notificationService.deleteAllNotifications(adminId);
}

async reviewApplication(userId: string, createAdminDto: CreateAdminDto, adminId: string) {
  const normalizedStatus = this.normalizeProfileStatus(createAdminDto.status);
  if (
    normalizedStatus !== AdminApplicationReviewStatus.APPROVED &&
    normalizedStatus !== AdminApplicationReviewStatus.FLAGGED
  ) {
    throw new BadRequestException('Unsupported review status');
  }

  const [profile, user] = await Promise.all([
    this.getOrCreateProfile(userId),
    this.userService.findById(userId),
  ]);

  if (!user) {
    throw new NotFoundException('Applicant not found');
  }

  const reviewComment = createAdminDto.reviewComments?.trim() || null;
  if (normalizedStatus === AdminApplicationReviewStatus.FLAGGED && !reviewComment) {
    throw new BadRequestException('A review comment is required when flagging an application');
  }

  profile.status = normalizedStatus;
  profile.reviewComments = reviewComment ?? '';

  await this.profileRepo.save(profile);

  if (normalizedStatus === AdminApplicationReviewStatus.APPROVED) {
    await this.notificationService.createNotification({
      userId,
      userRole: UserRole.STUDENT,
      title: 'Application Approved',
      message: reviewComment
        ? `Your application has been approved. Reviewer comment: ${reviewComment}`
        : 'Your application has been approved.',
      type: NotificationType.APPLICATION_APPROVED,
      priority: NotificationPriority.HIGH,
      metadata: { userId, adminId, status: normalizedStatus },
    });
  } else {
    await this.notificationService.createNotification({
      userId,
      userRole: UserRole.STUDENT,
      title: 'Application Requires Attention',
      message: `Your application has been flagged for review. Comment: ${reviewComment}`,
      type: NotificationType.APPLICATION_REJECTED,
      priority: NotificationPriority.HIGH,
      metadata: { userId, adminId, status: normalizedStatus },
    });
  }

  return {
    message: 'Application reviewed successfully',
    applicant: {
      userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      registrationNumber: profile.registrationNumber,
      status: normalizedStatus,
      reviewComments: reviewComment,
    },
  };
}
}
