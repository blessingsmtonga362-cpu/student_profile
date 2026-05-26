import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentNotification, NotificationType, NotificationPriority, UserRole } from '../entity/studentNotification.entity';
import { CreateNotificationDto, NotificationQueryDto } from '../dto/studentNotification.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailService } from '../../email/email.service';
import { UserService } from '../../user/user.service';

@Injectable()
export class StudentNotificationService {
  constructor(
    @InjectRepository(StudentNotification)
    private notificationRepository: Repository<StudentNotification>,
    private eventEmitter: EventEmitter2,
    private emailService: EmailService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  async createNotification(createDto: CreateNotificationDto): Promise<StudentNotification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      sentAt: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);
    
    // Emit event for real-time updates
    this.eventEmitter.emit('notification.created', savedNotification);
    
    // Send email notification asynchronously (don't block the response)
    this.sendEmailNotification(createDto).catch(error => {
      console.error('Failed to send email notification:', error);
    });
    
    return savedNotification;
  }

  // New method to send email notifications
  private async sendEmailNotification(notification: CreateNotificationDto): Promise<void> {
    try {
      // Get user email from database
      const user = await this.userService.findById(notification.userId);
      if (!user || !user.email) {
        console.warn(`User ${notification.userId} has no email address`);
        return;
      }

      // Map notification type to email subject
      const emailSubject = this.getEmailSubject(notification.title, notification.type);
      
      // Send email
      await this.emailService.sendEmail({
        to: user.email,
        subject: emailSubject,
        html: this.generateEmailHtml(notification),
      });
      
      console.log(`Email notification sent to ${user.email}`);
    } catch (error) {
      console.error(`Failed to send email for notification ${notification.title}:`, error);
    }
  }

  private getEmailSubject(title: string, type: NotificationType): string {
    // If title is already descriptive, use it
    if (title && !title.includes('Notification')) {
      return title;
    }
    
    // Otherwise generate based on type
    const subjects: Record<NotificationType, string> = {
      [NotificationType.APPLICATION_SUBMITTED]: '✅ Application Submitted Successfully',
      [NotificationType.APPLICATION_APPROVED]: '🎉 Congratulations! Application Approved',
      [NotificationType.APPLICATION_REJECTED]: '📢 Application Status Update',
      [NotificationType.STUDENT_SELECTED]: '🎊 You Have Been Selected!',
      [NotificationType.MONEY_DISBURSED]: '💰 Payment Disbursed',
      [NotificationType.MONEY_RECEIVED]: '✅ Payment Received',
      [NotificationType.PAYMENT_REMINDER]: '⏰ Payment Reminder',
      [NotificationType.SYSTEM]: '📢 System Notification',
    };
    return subjects[type] || 'Mthandizi Notification';
  }

  private generateEmailHtml(notification: CreateNotificationDto): string {
    const priorityColors: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: '#6b7280',
      [NotificationPriority.MEDIUM]: '#f59e0b',
      [NotificationPriority.HIGH]: '#ef4444',
      [NotificationPriority.URGENT]: '#dc2626',
    };

    // Handle undefined priority by defaulting to MEDIUM
    const priority = notification.priority || NotificationPriority.MEDIUM;
    const priorityColor = priorityColors[priority] || '#6b7280';
    
    const actionButton = notification.actionUrl && notification.actionLabel 
      ? `<div style="text-align: center; margin: 25px 0;">
           <a href="${notification.actionUrl}" style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
             ${this.escapeHtml(notification.actionLabel)}
           </a>
         </div>`
      : '';

    // Escape any HTML special characters in message and title
    const safeTitle = this.escapeHtml(notification.title || 'Notification');
    const safeMessage = this.escapeHtml(notification.message || '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #f9fafb;">
          <!-- Header -->
          <div style="background-color: #1e3a5f; padding: 25px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Mthandizi</h1>
            <p style="color: #9ca3af; margin: 5px 0 0;">Student Support Portal</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 25px; background-color: white;">
            <div style="border-left: 4px solid ${priorityColor}; padding-left: 15px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px; color: #1f2937;">${safeTitle}</h2>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Dear Student,</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 15px;">${safeMessage}</p>
            </div>
            
            ${actionButton}
            
            ${notification.metadata ? `
              <details style="margin-top: 20px;">
                <summary style="cursor: pointer; color: #6b7280; font-size: 12px;">Additional Information</summary>
                <pre style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; font-size: 11px; overflow-x: auto;">
                  ${JSON.stringify(notification.metadata, null, 2)}
                </pre>
              </details>
            ` : ''}
            
            <hr style="margin: 25px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              This is an automated message from Mthandizi Student Support Portal.<br>
              Please do not reply to this email.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center;">
            <p style="color: #6b7280; font-size: 11px; margin: 0;">
              &copy; ${new Date().getFullYear()} Mthandizi. All rights reserved.<br>
              University of Malawi
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper method to escape HTML special characters
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async getUserNotifications(userId: string, query: NotificationQueryDto): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
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