import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { ApplicationSubmissionService } from '../services/application_submission.service';
import { UserService } from '../../user/user.service';

@Controller('student')
@UseGuards(AuthGuard)
export class StudentController {
  constructor(
    private readonly submissionService: ApplicationSubmissionService,
    private readonly userService: UserService,
  ) {}

  /**
   * GET /student/application/status
   * Returns the current submission status for the logged-in student.
   * This is the primary endpoint the frontend uses to determine whether
   * to show the wizard, the congratulations screen, or the status tracker.
   */
  @Get('application/status')
  async getApplicationStatus(@Req() req) {
    const user = await this.userService.findOne(req.user?.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userId = String(user.id);

    const submission = await this.submissionService.getUserSubmission(userId);

    if (!submission) {
      return {
        status: 'draft',
        completedSteps: 0,
        totalSteps: 4,
        lastSaved: null,
        submittedAt: null,
      };
    }

    // Map backend ApplicationStatus enum values to the strings the frontend expects
    const statusMap: Record<string, string> = {
      draft: 'draft',
      submitted: 'submitted',
      under_review: 'reviewing',
      approved: 'approved',
      rejected: 'rejected',
    };

    return {
      status: statusMap[submission.status] ?? 'submitted',
      completedSteps: 4,
      totalSteps: 4,
      lastSaved: submission.submittedAt?.toISOString() ?? null,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
    };
  }
}