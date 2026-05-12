import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileData } from 'src/application/entities/profile_data';
import { PersonalDetails } from 'src/application/entities/personal_details.entity';
import { AcademicDetails } from 'src/application/entities/academic_details.entity';
import { VerificationLog } from 'src/application/entities/verification-log.entity';
import { ReviewService } from 'src/application/services/reviewService';
import { CreateAdminDto } from './dto/create-admin.dto';
import { StudentNotificationService } from 'src/notification/service/studentNotification.service';

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
){}

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
  const [profiles, approvedSupport, flaggedFiles] = await Promise.all([
    this.profileRepo.find({
      order: { status: 'ASC', firstName: 'ASC', lastName: 'ASC' },
    }),
    this.profileRepo.count({
      where: { status: 'Approved' },
    }),
    this.verificationLogRepo.count({
      where: { isVerified: false },
    }),
  ]);

  const academicDetails = profiles.length
    ? await this.academicRepo.find({
        where: profiles.map((profile) => ({ userId: profile.userId })),
      })
    : [];

  const academicsByUserId = new Map(
    academicDetails.map((record) => [record.userId, record]),
  );

  const queueProfiles = profiles
    .filter((profile) => profile.status !== 'Approved')
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
          program: academic?.programOfStudy ?? 'Programme not yet submitted',
          score: completionByUserId.get(profile.userId) ?? 0,
        };
      }),
  };
}

viewmore(userId: string){
  return this.reviewRepo.getCompleteApplication(userId);
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

async reviewApplication(userId: string, createAdminDto: CreateAdminDto) {
  const { status, reviewComments } = createAdminDto;

  const profile = await this.profileRepo.findOne({
    where: { userId }
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  profile.status = status;
  profile.reviewComments = reviewComments;

  await this.profileRepo.save(profile);

  return { message: 'Application reviewed successfully' };

}
}
