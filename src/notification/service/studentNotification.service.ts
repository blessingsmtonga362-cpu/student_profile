import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentNotification, NotificationType, NotificationPriority, UserRole } from '../entity/studentNotification.entity';
import { CreateNotificationDto, NotificationQueryDto } from '../dto/studentNotification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class StudentNotificationService {
  constructor(
    @InjectRepository(StudentNotification)
    private notificationRepository: Repository<StudentNotification>,
    private eventEmitter: EventEmitter2,
  ) {}

  async createNotification(createDto: CreateNotificationDto): Promise<StudentNotification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      sentAt: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);
    this.eventEmitter.emit('notification.created', savedNotification);
    return savedNotification;
  }

  async getUserNotifications(
    userId: string, 
    query: NotificationQueryDto
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const { isRead, type, limit = 20, offset = 0 } = query;
    const whereCondition: any = { 
      userId: userId, 
      isArchived: false 
    };
    
    if (isRead !== undefined) whereCondition.isRead = isRead;
    if (type) whereCondition.type = type;

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const unreadCount = await this.getUnreadCount(userId);

    // Transform notifications to frontend-friendly format
    const transformedNotifications = notifications.map(notif => ({
      id: notif.id,
      type: this.mapNotificationTypeForFrontend(notif.type),
      title: notif.title,
      message: notif.message,
      time: this.formatDate(notif.createdAt),
      isRead: notif.isRead,
      priority: notif.priority,
      actionUrl: notif.actionUrl,
      actionLabel: notif.actionLabel,
    }));

    return { notifications: transformedNotifications, total, unreadCount };
  }

  async getNotificationById(notificationId: string, userId: string): Promise<any> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId: userId }
    });
    
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    
    return {
      id: notification.id,
      type: this.mapNotificationTypeForFrontend(notification.type),
      title: notification.title,
      message: notification.message,
      time: this.formatDate(notification.createdAt),
      isRead: notification.isRead,
      priority: notification.priority,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { 
        userId: userId, 
        isRead: false, 
        isArchived: false 
      },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await this.notificationRepository.findOne({ 
      where: { id: notificationId, userId: userId } 
    });
    
    if (!notification) throw new NotFoundException('Notification not found');
    
    notification.isRead = true;
    notification.readAt = new Date();
    const saved = await this.notificationRepository.save(notification);
    
    return {
      id: saved.id,
      type: this.mapNotificationTypeForFrontend(saved.type),
      title: saved.title,
      message: saved.message,
      time: this.formatDate(saved.createdAt),
      isRead: saved.isRead,
    };
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepository.update(
      { userId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { count: result.affected || 0 };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({ 
      where: { id: notificationId, userId: userId } 
    });
    
    if (!notification) throw new NotFoundException('Notification not found');
    await this.notificationRepository.remove(notification);
  }

  async deleteAllNotifications(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepository.delete({ userId: userId });
    return { count: result.affected || 0 };
  }

  // Helper: Map backend notification types to frontend icon types
  private mapNotificationTypeForFrontend(type: NotificationType): string {
    const typeMap: Record<string, string> = {
      'application_submitted': 'info',
      'application_approved': 'success',
      'application_rejected': 'warning',
      'student_selected': 'success',
      'money_disbursed': 'success',
      'money_received': 'success',
      'payment_reminder': 'warning',
      'system': 'info',
    };
    return typeMap[type] || 'info';
  }

  // Helper: Format date for frontend display
  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return new Date(date).toLocaleDateString();
  }

  // Business-specific notification methods
  async notifyApplicationSent(
    studentId: string, 
    studentName: string, 
    programName: string, 
    applicationId: string
  ): Promise<StudentNotification> {
    return await this.createNotification({
      userId: studentId,
      userRole: UserRole.STUDENT,
      title: 'Application Submitted',
      message: `Your application for ${programName} has been successfully submitted.`,
      type: NotificationType.APPLICATION_SUBMITTED,
      priority: NotificationPriority.HIGH,
      metadata: { applicationId, programName, submittedAt: new Date() },
    });
  }

  async notifyAdminNewApplication(
    adminIds: string[], 
    studentName: string, 
    studentId: string, 
    programName: string, 
    applicationId: string
  ): Promise<StudentNotification[]> {
    const notifications: StudentNotification[] = [];
    for (const adminId of adminIds) {
      const notification = await this.createNotification({
        userId: adminId,
        userRole: UserRole.ADMIN,
        title: 'New Application Received',
        message: `${studentName} has submitted a new application for ${programName}.`,
        type: NotificationType.APPLICATION_SUBMITTED,
        priority: NotificationPriority.HIGH,
        metadata: { studentId, studentName, programName, applicationId },
      });
      notifications.push(notification);
    }
    return notifications;
  }
}