import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationSubmission, ApplicationStatus } from '../entities/application_submission.entity';
import { StudentNotificationService } from '../../notification/service/studentNotification.service';
import { UserService } from '../../user/user.service';
import { NotificationType, NotificationPriority, UserRole } from '../../notification/entity/studentNotification.entity';

@Injectable()
export class ApplicationSubmissionService {
  constructor(
    @InjectRepository(ApplicationSubmission)
    private submissionRepository: Repository<ApplicationSubmission>,
    private readonly notificationService?: StudentNotificationService,
    private readonly userService?: UserService,
  ) {}

  async canUserSubmit(userId: string): Promise<{ canSubmit: boolean; message?: string; existingSubmission?: ApplicationSubmission }> {
    const existingSubmission = await this.submissionRepository.findOne({
      where: { userId: userId }
    });

    if (!existingSubmission) {
      return { canSubmit: true };
    }

    if (existingSubmission.status === ApplicationStatus.SUBMITTED) {
      return { 
        canSubmit: false, 
        message: 'You have already submitted your application.',
        existingSubmission 
      };
    }

    if (existingSubmission.status === ApplicationStatus.UNDER_REVIEW) {
      return { 
        canSubmit: false, 
        message: 'Your application is currently under review.',
        existingSubmission 
      };
    }

    if (existingSubmission.status === ApplicationStatus.APPROVED) {
      return { 
        canSubmit: false, 
        message: 'Your application has already been approved.',
        existingSubmission 
      };
    }

    return { canSubmit: true };
  }

  async createOrUpdateSubmission(userId: string, status: ApplicationStatus): Promise<ApplicationSubmission> {
    let submission = await this.submissionRepository.findOne({
      where: { userId: userId }
    });

    if (!submission) {
      submission = this.submissionRepository.create({
        userId: userId,
        status: status,
      });
    } else {
      submission.status = status;
    }

    return await this.submissionRepository.save(submission);
  }

  async markAsSubmitted(userId: string, applicationReference: string): Promise<ApplicationSubmission> {
    const submission = await this.createOrUpdateSubmission(userId, ApplicationStatus.SUBMITTED);
    submission.submittedAt = new Date();
    submission.applicationReference = applicationReference;
    const savedSubmission = await this.submissionRepository.save(submission);

    // Send notifications only if notificationService and userService are available
    if (this.notificationService && this.userService) {
      try {
        // Get student info
        const student = await this.userService.findById(userId);
        const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';

        // Send notification to STUDENT
        await this.notificationService.createNotification({
          userId: userId,
          userRole: UserRole.STUDENT,
          title: '✅ Application Submitted Successfully!',
          message: `Your application (${applicationReference}) has been submitted successfully. We will review it and get back to you.`,
          type: NotificationType.APPLICATION_SUBMITTED,
          priority: NotificationPriority.HIGH,
          metadata: { applicationReference, submittedAt: new Date() },
        });

        // Send notification to ALL ADMINS
        const admins = await this.userService.findAllAdmins();
        for (const admin of admins) {
          await this.notificationService.createNotification({
            userId: admin.id,
            userRole: UserRole.ADMIN,
            title: '📝 New Application Submitted',
            message: `${studentName} has submitted a new application (${applicationReference}). Please review it.`,
            type: NotificationType.APPLICATION_SUBMITTED,
            priority: NotificationPriority.HIGH,
            metadata: { studentId: userId, studentName, applicationReference },
          });
        }
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    }

    return savedSubmission;
  }

  async getUserSubmission(userId: string): Promise<ApplicationSubmission | null> {
    return await this.submissionRepository.findOne({
      where: { userId: userId }
    });
  }

  async updateStatus(userId: string, status: ApplicationStatus, comments?: string, adminId?: string) {
    const submission = await this.submissionRepository.findOne({
      where: { userId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    submission.status = status;
    
    // Only set reviewComments if comments is provided
    if (comments !== undefined) {
      submission.reviewComments = comments;
    }
    
    if (adminId) {
      submission.adminId = adminId;
    }
    
    await this.submissionRepository.save(submission);

    // Send notifications only if notificationService and userService are available
    if (this.notificationService && this.userService) {
      try {
        // Get student info
        const student = await this.userService.findById(userId);
        const studentName = student ? `${student.firstName} ${student.lastName}` : 'Student';

        // Send notification to STUDENT about status change
        if (status === ApplicationStatus.APPROVED) {
          await this.notificationService.createNotification({
            userId: userId,
            userRole: UserRole.STUDENT,
            title: '🎉 Application Approved!',
            message: `Congratulations! Your application (${submission.applicationReference}) has been approved. ${comments ? 'Reviewer comments: ' + comments : ''}`,
            type: NotificationType.APPLICATION_APPROVED,
            priority: NotificationPriority.HIGH,
            metadata: { applicationReference: submission.applicationReference, comments },
          });
        } else if (status === ApplicationStatus.REJECTED) {
          await this.notificationService.createNotification({
            userId: userId,
            userRole: UserRole.STUDENT,
            title: '❌ Application Update',
            message: `Your application (${submission.applicationReference}) has been reviewed. ${comments || 'Please contact the administration for more information.'}`,
            type: NotificationType.APPLICATION_REJECTED,
            priority: NotificationPriority.HIGH,
            metadata: { applicationReference: submission.applicationReference, comments },
          });
        }

        // Send confirmation to ADMIN who performed the action
        if (adminId) {
          const admin = await this.userService.findById(adminId);
          if (admin) {
            await this.notificationService.createNotification({
              userId: adminId,
              userRole: UserRole.ADMIN,
              title: `Application ${status.toUpperCase()}`,
              message: `You have ${status} application ${submission.applicationReference} for ${studentName}.`,
              type: status === ApplicationStatus.APPROVED ? NotificationType.APPLICATION_APPROVED : NotificationType.APPLICATION_REJECTED,
              priority: NotificationPriority.MEDIUM,
              metadata: { studentId: userId, studentName, applicationReference: submission.applicationReference },
            });
          }
        }
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }
    }

    return submission;
  }
}