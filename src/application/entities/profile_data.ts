import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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

  @Column({default:'Pending'})
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

}

