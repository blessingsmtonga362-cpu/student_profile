import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity('profile_data')
export class ProfileData {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column()
  registrationNumber!: string;

  @Column({ default: 'Pending' })
  status!: string;

  @Column({ nullable: true })
  reviewComments!: string;

  @Column({ type: 'integer', default: 0 })
  score!: number;

  @Column({ type: 'integer', default: 0 })
  overallPercentage!: number;

  @Column({ type: 'integer', nullable: true })
  rank!: number | null;

  @Column({ default: false })
  isRanked!: boolean;

  @Column({ default: false })
  scoreFlagged!: boolean;

  @Column({ nullable: true, default: '' })
  scoreFlagReason!: string;

  @Column({ type: 'timestamp', nullable: true })
  scoreUpdatedAt!: Date | null;

  // ADD THESE MISSING FIELDS:
  @Column({ name: 'program_of_study', nullable: true, default: '' })
  programOfStudy!: string;

  @Column({ nullable: true, default: '' })
  department!: string;

  @Column({ name: 'year_of_study', nullable: true, type: 'integer' })
  yearOfStudy!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}