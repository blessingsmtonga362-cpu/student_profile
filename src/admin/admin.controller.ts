import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/role.decorator';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AuthGuard } from '../auth/auth.guard';
import { UseGuards } from '@nestjs/common';
import { ProfileReviewStatus } from './enums/profile-review-status.enum';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(Role.Admin)
  @Get()
  getProfile() {
    return this.adminService.getProfiles();
  }

  @Roles(Role.Admin)
  @Get('applications')
  async getApplications() {
    const profiles = await this.adminService.getProfiles();

    return {
      count: profiles.length,
      applicants: profiles.map((profile) => ({
        id: profile.userId,
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        registrationNumber: profile.registrationNumber,
        program: 'Programme not submitted',
        score: profile.score ?? 0,
        rank: profile.rank ?? null,
        status:
          profile.status === ProfileReviewStatus.APPROVED ||
          profile.status === ProfileReviewStatus.FLAGGED
            ? profile.status
            : ProfileReviewStatus.PENDING_REVIEW,
      })),
    };
  }

  @Roles(Role.Admin)
  @Get('users/:userId')
  getUserApplication(@Param('userId') userId: string) {
    return this.adminService.getUserApplication(userId);
  }

  @Roles(Role.Admin)
  @Patch('users/:userId/review')
  reviewUserApplication(
    @Param('userId') userId: string,
    @Body() createAdminDto: CreateAdminDto,
    @Req() req,
  ) {
    return this.adminService.reviewApplication(
      userId,
      createAdminDto,
      req.user.id,
    );
  }

  @Roles(Role.Admin)
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Roles(Role.Admin)
  @Get('applications/approved')
  getApprovedApplications() {
    return this.adminService.getApplicationsByStatus(
      ProfileReviewStatus.APPROVED,
    );
  }

  @Roles(Role.Admin)
  @Get('applications/flagged')
  getFlaggedApplications() {
    return this.adminService.getApplicationsByStatus(
      ProfileReviewStatus.FLAGGED,
    );
  }

  @Roles(Role.Admin)
  @Get('notifications')
  getNotifications(@Req() req) {
    return this.adminService.getAdminNotifications(req.user.id);
  }

  @Roles(Role.Admin)
  @Patch('notifications/:notificationId/read')
  markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @Req() req,
  ) {
    return this.adminService.markAdminNotificationRead(
      notificationId,
      req.user.id,
    );
  }

  @Roles(Role.Admin)
  @Patch('notifications/read-all')
  markAllNotificationsAsRead(@Req() req) {
    return this.adminService.markAllAdminNotificationsRead(req.user.id);
  }

  @Roles(Role.Admin)
  @Delete('notifications')
  clearNotifications(@Req() req) {
    return this.adminService.clearAdminNotifications(req.user.id);
  }
}
