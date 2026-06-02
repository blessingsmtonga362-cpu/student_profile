import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ApplicationStatus,
  ApplicationSubmission,
} from 'src/application/entities/application_submission.entity';
import { PersonalDetails } from 'src/application/entities/personal_details.entity';
import { ProfileData } from 'src/application/entities/profile_data';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { ReviewService } from 'src/application/services/review.service';
import {
  NotificationPriority,
  NotificationType,
  UserRole,
} from 'src/notification/entity/studentNotification.entity';
import { StudentNotificationService } from 'src/notification/service/studentNotification.service';
import { RankingService } from 'src/ranking/ranking.service';
import { UserService } from 'src/user/user.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ProfileReviewStatus } from './enums/profile-review-status.enum';

type ReviewActionStatus =
  | ProfileReviewStatus.APPROVED
  | ProfileReviewStatus.FLAGGED;

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
    private readonly dataSource: DataSource,
  ) {}

  private normalizeProfileStatus(status?: string | null): ProfileReviewStatus {
    switch ((status ?? '').trim().toLowerCase()) {
      case ProfileReviewStatus.APPROVED:
        return ProfileReviewStatus.APPROVED;
      case ProfileReviewStatus.FLAGGED:
        return ProfileReviewStatus.FLAGGED;
      case ProfileReviewStatus.PENDING_REVIEW:
      case 'pending':
        return ProfileReviewStatus.PENDING_REVIEW;
      default:
        return ProfileReviewStatus.PENDING_REVIEW;
    }
  }

  private async refreshRankings() {
    await this.rankingService.refreshAllRankings().catch(() => null);
  }

  private async getOrCreateProfile(
    userId: string,
    manager?: EntityManager,
  ): Promise<ProfileData> {
    const profileRepo = manager?.getRepository(ProfileData) ?? this.profileRepo;
    const existingProfile = await profileRepo.findOne({
      where: { userId },
    });

    if (existingProfile) {
      return existingProfile;
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Applicant not found');
    }

    const profile = profileRepo.create({
      userId,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      registrationNumber: '',
      status: ProfileReviewStatus.PENDING_REVIEW,
    });

    return profileRepo.save(profile);
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
        ProfileReviewStatus.APPROVED,
    ).length;

    const flaggedFiles = profiles.filter(
      (profile) =>
        this.normalizeProfileStatus(profile.status) ===
        ProfileReviewStatus.FLAGGED,
    ).length;

    const queueProfiles = profiles
      .filter(
        (profile) =>
          this.normalizeProfileStatus(profile.status) ===
          ProfileReviewStatus.PENDING_REVIEW,
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

  async getApplicationsByStatus(status: ReviewActionStatus) {
    await this.refreshRankings();

    const profiles = await this.profileRepo.find({
      order: { score: 'DESC', firstName: 'ASC', lastName: 'ASC' },
    });

    const filteredProfiles = profiles.filter(
      (profile) => this.normalizeProfileStatus(profile.status) === status,
    );

    // Fetch applicants in one query and map locally to avoid an N+1 lookup.
    const users = await this.userService.findByIds(
      filteredProfiles.map((profile) => profile.userId),
    );
    const userById = new Map(users.map((user) => [user.id, user]));

    const applicants = filteredProfiles.map((profile) => {
      const user = userById.get(profile.userId);

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
    });

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
              consentFormUrl:
                (application.data.familyDetails as any).consentFormUrl ?? null,
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
      normalizedStatus !== ProfileReviewStatus.APPROVED &&
      normalizedStatus !== ProfileReviewStatus.FLAGGED
    ) {
      throw new BadRequestException('Unsupported review status');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Applicant not found');
    }

    const reviewComment = createAdminDto.reviewComments?.trim() || null;
    if (normalizedStatus === ProfileReviewStatus.FLAGGED && !reviewComment) {
      throw new BadRequestException(
        'A review comment is required when flagging an application',
      );
    }

    const profile = await this.dataSource.transaction(async (manager) => {
      const transactionalProfile = await this.getOrCreateProfile(
        userId,
        manager,
      );

      transactionalProfile.status = normalizedStatus;
      transactionalProfile.reviewComments = reviewComment ?? '';

      const savedProfile = await manager
        .getRepository(ProfileData)
        .save(transactionalProfile);

      // Keep all review-related database writes atomic. Notifications are
      // intentionally sent after this transaction commits.
      await this.updateSubmissionReviewStatus(
        manager,
        userId,
        normalizedStatus,
        reviewComment,
        adminId,
      );

      return savedProfile;
    });

    await this.sendReviewNotifications(
      userId,
      normalizedStatus,
      reviewComment,
      adminId,
    );

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

  private async updateSubmissionReviewStatus(
    manager: EntityManager,
    userId: string,
    normalizedStatus: ReviewActionStatus,
    reviewComment: string | null,
    adminId: string,
  ) {
    const submissionStatus =
      normalizedStatus === ProfileReviewStatus.APPROVED
        ? ApplicationStatus.APPROVED
        : ApplicationStatus.REJECTED;

    const submissionRepo = manager.getRepository(ApplicationSubmission);
    const submission = await submissionRepo.findOne({
      where: { userId },
    });

    if (!submission) {
      return null;
    }

    submission.status = submissionStatus;

    if (reviewComment !== null) {
      submission.reviewComments = reviewComment;
    }

    if (adminId) {
      submission.adminId = adminId;
    }

    return submissionRepo.save(submission);
  }

  private async sendReviewNotifications(
    userId: string,
    normalizedStatus: ReviewActionStatus,
    reviewComment: string | null,
    adminId: string,
  ) {
    if (normalizedStatus === ProfileReviewStatus.APPROVED) {
      // Notify the student
      await this.notificationService.createNotification({
        userId,
        userRole: UserRole.STUDENT,
        title: 'Application Approved',
        message: reviewComment
          ? `Your application has been approved. Reviewer comment: ${reviewComment}`
          : 'Your application has been approved. You will be contacted regarding disbursement.',
        type: NotificationType.APPLICATION_APPROVED,
        priority: NotificationPriority.HIGH,
        metadata: { userId, adminId, status: normalizedStatus },
      });

      // Notify the admin who performed the review
      await this.notificationService.createNotification({
        userId: adminId,
        userRole: UserRole.ADMIN,
        title: 'Application Approved',
        message: `You have successfully approved an applicant's application.`,
        type: NotificationType.APPLICATION_APPROVED,
        priority: NotificationPriority.MEDIUM,
        metadata: { studentUserId: userId, adminId, status: normalizedStatus },
      });
      return;
    }

    // Flagged — notify student
    await this.notificationService.createNotification({
      userId,
      userRole: UserRole.STUDENT,
      title: 'Application Requires Attention',
      message: `Your application has been flagged for review. Comment: ${reviewComment}`,
      type: NotificationType.APPLICATION_REJECTED,
      priority: NotificationPriority.HIGH,
      metadata: { userId, adminId, status: normalizedStatus },
    });

    // Notify the admin who flagged
    await this.notificationService.createNotification({
      userId: adminId,
      userRole: UserRole.ADMIN,
      title: 'Application Flagged',
      message: `You have flagged an applicant's application for review.`,
      type: NotificationType.APPLICATION_REJECTED,
      priority: NotificationPriority.MEDIUM,
      metadata: { studentUserId: userId, adminId, status: normalizedStatus },
    });
  }
}
