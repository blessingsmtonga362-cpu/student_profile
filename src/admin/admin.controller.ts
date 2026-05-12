import { Controller, Delete, Get, Param, Patch, Req } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/role.decorator';
import { ReviewService } from 'src/application/services/reviewService';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService,
    private readonly reviewService: ReviewService

  ) {}

  @Roles(Role.Admin)
  @Get()
  getProfile() {
    return this.adminService.getProfiles();
  }

  @Roles(Role.Admin)
  @Get('users/:userId')
  getUserApplication(@Param('userId') userId: string) {
    return this.adminService.viewmore(userId);
  }

  @Roles(Role.Admin)
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Roles(Role.Admin)
  @Get('notifications')
  getNotifications(@Req() req) {
    return this.adminService.getAdminNotifications(req.user.userId);
  }

  @Roles(Role.Admin)
  @Patch('notifications/:notificationId/read')
  markNotificationAsRead(@Param('notificationId') notificationId: string, @Req() req) {
    return this.adminService.markAdminNotificationRead(notificationId, req.user.userId);
  }

  @Roles(Role.Admin)
  @Patch('notifications/read-all')
  markAllNotificationsAsRead(@Req() req) {
    return this.adminService.markAllAdminNotificationsRead(req.user.userId);
  }

  @Roles(Role.Admin)
  @Delete('notifications')
  clearNotifications(@Req() req) {
    return this.adminService.clearAdminNotifications(req.user.userId);
  }
}
