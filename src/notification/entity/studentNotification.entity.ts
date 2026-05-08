import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_APPROVED = 'application_approved',
  APPLICATION_REJECTED = 'application_rejected',
  STUDENT_SELECTED = 'student_selected',
  MONEY_DISBURSED = 'money_disbursed',
  MONEY_RECEIVED = 'money_received',
  PAYMENT_REMINDER = 'payment_reminder',
  SYSTEM = 'system'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  MAIN_ADMIN = 'main_admin',
  SPONSOR = 'sponsor'
}

@Entity('student_notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'type'])
@Index(['createdAt'])
export class StudentNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'user_role', type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  userRole: UserRole;

  @Column({ name: 'title', length: 255 })
  title: string;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.SYSTEM
  })
  type: NotificationType;

  @Column({
    name: 'priority',
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM
  })
  priority: NotificationPriority;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: any;

  @Column({ name: 'action_url', nullable: true, length: 500 })
  actionUrl: string;

  @Column({ name: 'action_label', nullable: true, length: 100 })
  actionLabel: string;

  @Column({ name: 'sent_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  sentAt: Date;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}