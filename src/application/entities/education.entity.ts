import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EducationLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
}

export enum FeePayer {
  PARENT = 'parent',
  SPONSOR = 'sponsor',
}

@Entity('education')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'education_level',
    type: 'enum',
    enum: EducationLevel,
  })
  educationLevel: EducationLevel;

  @Column({ name: 'school_name', length: 255 })
  schoolName: string;

  @Column({ name: 'tuition_fees', type: 'decimal', precision: 12, scale: 2 })
  tuitionFees: number;

  @Column({ name: 'year_completed', type: 'int' })
  yearCompleted: number;

  @Column({
    name: 'who_paid_fees',
    type: 'enum',
    enum: FeePayer,
  })
  whoPaidFees: FeePayer;

  @Column({ name: 'certificate_url', nullable: true, type: 'text' })
  certificateUrl?: string;

  @Column({ name: 'is_semester_based', default: false })
  isSemesterBased: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;
}