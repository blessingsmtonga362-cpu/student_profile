import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationSubmission, ApplicationStatus } from '../entities/application_submission.entity';

@Injectable()
export class ApplicationSubmissionService {
  constructor(
    @InjectRepository(ApplicationSubmission)
    private submissionRepository: Repository<ApplicationSubmission>,
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
    return await this.submissionRepository.save(submission);
  }

  async getUserSubmission(userId: string): Promise<ApplicationSubmission | null> {
    return await this.submissionRepository.findOne({
      where: { userId: userId }
    });
  }
}