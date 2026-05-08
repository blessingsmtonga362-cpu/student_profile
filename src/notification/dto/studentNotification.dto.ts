import { IsString, IsEnum, IsOptional, IsObject, IsUrl, IsUUID, IsNumber, Min, IsBoolean } from 'class-validator';
import { NotificationType, NotificationPriority, UserRole } from '../entity/studentNotification.entity';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(UserRole)
  userRole: UserRole;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsObject()
  @IsOptional()
  metadata?: any;

  @IsUrl()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  actionLabel?: string;
}

export class NotificationQueryDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}