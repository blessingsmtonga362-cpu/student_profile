import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStatus } from 'src/application/entities/application_submission.entity';
import { PersonalDetails } from 'src/application/entities/personal_details.entity';
import { ProfileData } from 'src/application/entities/profile_data';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { ApplicationSubmissionService } from 'src/application/services/application_submission.service';
import { ReviewService } from 'src/application/services/review.service';
import {
  NotificationPriority,
  NotificationType,
  UserRole,
} from 'src/notification/entity/studentNotification.entity';
import { StudentNotificationService } from 'src/notification/service/studentNotification.service';
import { RankingService } from 'src/ranking/ranking.service';
import { UserService } from 'src/user/user.service';
import {
  AdminApplicationReviewStatus,
  CreateAdminDto,
} from './dto/create-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(ProfileData)
    private readonly profileRepo: Repository<ProfileData>,
    @InjectRepository(VerificationLog)
    private readonly verificationLogRepo: Repository<VerificationLog>,
    @Inject(forwardRef(() => ReviewService))
    private readonly reviewService: ReviewService,
    private readonly notificationService: StudentNotificationService,
    private readonly userService: UserService,
    private readonly rankingService: RankingService,
    @Inject(forwardRef(() => ApplicationSubmissionService))
    private readonly submissionService: ApplicationSubmissionService,
  ) {}

  private normalizeProfileStatus(status?: string | null): string {
    switch ((status ?? '').trim().toLowerCase()) {
      case AdminApplicationReviewStatus.APPROVED:
        return AdminApplicationReviewStatus.APPROVED;
      case AdminApplicationReviewStatus.FLAGGED:
        return AdminApplicationReviewStatus.FLAGGED;
      case 'pending_review':
      case 'pending':
        return 'pending_review';
      default:
        return 'pending_review';
    }
  }

  private async refreshRankings() {
    await this.rankingService.refreshAllRankings().catch(() => null);
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
      registrationNumber: '',
      status: 'pending_review',
    });

    return this.profileRepo.save(profile);
  }

  async syncProfile(personal: PersonalDetails) {
    if (!personal) {
      return;
    }

    const { userId } = personal;
    let profile = await this.profileRepo.findOne({
      where: { userId },
    });
    if (!profile) {
      profile = this.profileRepo.create({ userId });
    }

    profile.firstName = personal.firstName;
    profile.lastName = personal.lastName;
    profile.registrationNumber = personal.registrationNumber;

    await this.profileRepo.save(profile);
  }

  async getProfiles() {
    await this.refreshRankings();

    return this.profileRepo.find({
      order: {
        status: 'ASC',
        score: 'DESC',
        firstName: 'ASC',
        lastName: 'ASC',
      },
    });
  }

  async getDashboardStats() {
    await this.refreshRankings();

    const profiles = await this.profileRepo.find({
      order: {
        status: 'ASC',
        score: 'DESC',
        firstName: 'ASC',
        lastName: 'ASC',
      },
    });

    const approvedSupport = profiles.filter(
      (profile) =>
        this.normalizeProfileStatus(profile.status) ===
        AdminApplicationReviewStatus.APPROVED,
    ).length;

    const flaggedFiles = profiles.filter(
      (profile) =>
        this.normalizeProfileStatus(profile.status) ===
        AdminApplicationReviewStatus.FLAGGED,
    ).length;

    const queueProfiles = profiles
      .filter(
        (profile) =>
          this.normalizeProfileStatus(profile.status) === 'pending_review',
      )
      .slice(0, 10);

    const completionByUserId = new Map(
      await Promise.all(
        queueProfiles.map(async (profile) => {
          const submissionReadiness = await this.reviewService
            .canSubmitApplication(profile.userId)
            .catch(() => ({
              completionPercentage: 0,
            }));

          return [
            profile.userId,
            Math.round(submissionReadiness.completionPercentage),
          ] as const;
        }),
      ),
    );

    return {
      totalApplications: profiles.length,
      approvedSupport,
      flaggedFiles,
      priorityQueue: queueProfiles.map((profile) => {
        return {
          id: profile.userId,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          registrationNumber: profile.registrationNumber,
          program: 'Programme not submitted',
          score: profile.score ?? completionByUserId.get(profile.userId) ?? 0,
          rank: profile.rank ?? null,
          status: this.normalizeProfileStatus(profile.status),
        };
      }),
    };
  }

  async getApplicationsByStatus(status: 'approved' | 'flagged') {
    await this.refreshRankings();

    const profiles = await this.profileRepo.find({
      order: { score: 'DESC', firstName: 'ASC', lastName: 'ASC' },
    });

    const filteredProfiles = profiles.filter(
      (profile) => this.normalizeProfileStatus(profile.status) === status,
    );

    const applicants = await Promise.all(
      filteredProfiles.map(async (profile) => {
        const user = await this.userService.findById(profile.userId);

        return {
          userId: profile.userId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: user?.email ?? '',
          registrationNumber: profile.registrationNumber,
          status: this.normalizeProfileStatus(profile.status),
          reviewComments: profile.reviewComments ?? null,
          program: 'Programme not submitted',
          department: null,
          yearOfStudy: null,
          score: profile.score ?? 0,
          rank: profile.rank ?? null,
          overallPercentage: profile.overallPercentage ?? 0,
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
    await this.refreshRankings();

    const [profile, application, verificationLogs, user] = await Promise.all([
      this.getOrCreateProfile(userId),
      this.reviewService.getCompleteApplication(userId),
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
      application: {
        ...application.data,
        familyDetails: application.data.familyDetails
          ? {
              ...application.data.familyDetails,
              consentFormUrl: (application.data.familyDetails as any).consentFormUrl ?? null,
            }
          : null,
      },
      applicationMeta: application.metadata,
      verificationLogs,
    };
  }

  async getAdminNotifications(adminId: string) {
    const result = await this.notificationService.getUserNotifications(
      adminId,
      {
        limit: 50,
        offset: 0,
      },
    );

    return {
      success: true,
      data: result.notifications,
      total: result.total,
      unreadCount: result.unreadCount,
    };
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

  async reviewApplication(
    userId: string,
    createAdminDto: CreateAdminDto,
    adminId: string,
  ) {
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
    if (
      normalizedStatus === AdminApplicationReviewStatus.FLAGGED &&
      !reviewComment
    ) {
      throw new BadRequestException(
        'A review comment is required when flagging an application',
      );
    }

    profile.status = normalizedStatus;
    profile.reviewComments = reviewComment ?? '';

    await this.profileRepo.save(profile);
    await this.updateSubmissionStatus(
    await this.notifyStudent(userId, normalizedStatus, reviewComment, adminId);
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

  // Combined method to handle both submission update and notification
  private async updateSubmissionAndNotify(
    userId: string,
    normalizedStatus: string,
    reviewComment: string | null,
    adminId: string,
  ) {
    const submissionStatus =
      normalizedStatus === AdminApplicationReviewStatus.APPROVED
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;

    try {
      await this.submissionService.updateStatus(
        userId,
        submissionStatus,
        reviewComment ?? undefined,
        adminId,
      );
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

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
      return;
    }

    await this.updateSubmissionStatus(
      userId,
      normalizedStatus,
      reviewComment,
      adminId,
    );
    await this.notifyStudent(userId, normalizedStatus, reviewComment, adminId);


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

  private async updateSubmissionStatus(
    userId: string,
    normalizedStatus: string,
    reviewComment: string | null,
    adminId: string,
  ) {
    const submissionStatus =
      normalizedStatus === AdminApplicationReviewStatus.APPROVED
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;

    try {
      await this.submissionService.updateStatus(
        userId,
        submissionStatus,
        reviewComment ?? undefined,
        adminId,
      );
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }
  }

  private async notifyStudent(
    userId: string,
    normalizedStatus: string,
    reviewComment: string | null,
    adminId: string,
  ) {
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
      return;
    }

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
}

