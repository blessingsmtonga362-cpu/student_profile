import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum EducationLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary'
}

export enum FeePayer {
  SELF = 'self',
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  SPONSOR = 'sponsor',
  SCHOLARSHIP = 'scholarship',
  OTHER = 'other'
}

@Entity('education')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    name: 'education_level',
    type: 'enum',
    enum: EducationLevel,
    nullable: false
  })
  educationLevel: EducationLevel;


  @Column({ name: 'school_name', nullable: false, length: 255 })
  schoolName: string;

  @Column({ name: 'tuitionFees', type: 'decimal', precision: 10, scale: 2, nullable: false })
  tuitionFees: number;

  @Column({ name: 'year_completed', type: 'integer', nullable: false })
  yearCompleted: number;

  @Column({
    name: 'whoPaidFees',
    type: 'enum',
    enum: FeePayer,
    nullable: false
  })
  whoPaidFees: FeePayer;

  @Column({ name: 'other_payer_name', nullable: true, length: 255 })
  otherPayerName?: string; // Used when whoPaidFees is 'other'

  // Optional: For tertiary - semester vs term
  @Column({ name: 'is_semester_based', default: false })
  isSemesterBased: boolean; // true for tertiary (semester), false for primary/secondary (term)

  // Additional optional fields
  @Column({ name: 'certificate_url', nullable: true })
  certificateUrl: string;

  @Column({ name: 'certificate_filename', nullable: true })
  certificateFilename: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description?: string;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}