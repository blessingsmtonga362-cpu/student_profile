import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
  Patch,
  Post,
} from '@nestjs/common';
import { StudentNotificationService } from '../service/studentNotification.service';
import { AuthGuard } from '../../auth/auth.guard';
import { NotificationQueryDto } from '../dto/studentNotification.dto';

@Controller('notifications')
@UseGuards(AuthGuard)
export class StudentNotificationController {
  constructor(
    private readonly notificationService: StudentNotificationService,
  ) {}

  // Get all notifications for the logged-in user
  @Get()
  async getMyNotifications(@Req() req, @Query() query: NotificationQueryDto) {
    const userId = req.user.id;
    const result = await this.notificationService.getUserNotifications(
      userId,
      query,
    );

    return {
      success: true,
      data: result.notifications,
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    const userId = req.user.id;
    const unreadCount = await this.notificationService.getUnreadCount(userId);

    return {
      success: true,
      unreadCount,
    };
  }

  // Get unread notifications only
  @Get('unread')
  async getUnreadNotifications(@Req() req) {
    const userId = req.user.id;
    const result = await this.notificationService.getUserNotifications(userId, {
      isRead: false,
    });

    return {
      success: true,
      data: result.notifications,
      count: result.notifications.length,
    };
  }

  // mark single notification as it has been red
  @Patch(':notificationId/read')
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Req() req,
  ) {
    const userId = req.user.id;
    const notification = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );

    return {
      success: true,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  @Patch('read-all')
  async markAllAsReadPatch(@Req() req) {
    const userId = req.user.id;
    const result = await this.notificationService.markAllAsRead(userId);

    return {
      success: true,
      message: `${result.count} notifications marked as read`,
      count: result.count,
    };
  }

  // Keep your existing POST endpoint for backward compatibility
  @Post('mark-all-read')

  // Mark all notifications as have been read
  @Patch('read-all')
  async markAllAsRead(@Req() req) {
    const userId = req.user.id;
    const result = await this.notificationService.markAllAsRead(userId);

    return {
      success: true,
      message: `${result.count} notifications marked as read`,
      count: result.count,
    };
  }

  // Delete all notifications (Clear all)
  @Delete('clear-all')
  async clearAllNotifications(@Req() req) {
    const userId = req.user.id;
    const result =
      await this.notificationService.deleteAllNotifications(userId);

    return {
      success: true,
      message: 'All notifications cleared',
      count: result.count,
    };
  }

  // Delete a single notification
  @Delete(':notificationId')
  async deleteNotification(
    @Param('notificationId') notificationId: string,
    @Req() req,
  ) {
    const userId = req.user.id;
    await this.notificationService.deleteNotification(notificationId, userId);

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }

  // Get a single notification by ID
  @Get(':notificationId')
  async getNotificationById(
    @Param('notificationId') notificationId: string,
    @Req() req,
  ) {
    const userId = req.user.id;
    const notification = await this.notificationService.getNotificationById(
      notificationId,
      userId,
    );

    return {
      success: true,
      data: notification,
    };
  }
}
