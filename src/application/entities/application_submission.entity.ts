import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ApplicationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('application_submissions')
@Index(['userId'])
export class ApplicationSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ 
    name: 'status', 
    type: 'enum', 
    enum: ApplicationStatus, 
    default: ApplicationStatus.DRAFT 
  })
  status: ApplicationStatus;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'application_reference', length: 100, nullable: true, unique: true })
  applicationReference: string;

  @Column({ name: 'review_comments', type: 'text', nullable: true })
  reviewComments: string;

  @Column({ name: 'admin_id', type: 'uuid', nullable: true })
  adminId: string;

  @Column({ name: 'can_resubmit', default: false })
  canResubmit: boolean;

  @Column({ name: 'resubmit_deadline', type: 'timestamp', nullable: true })
  resubmitDeadline: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}