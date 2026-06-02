import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sponsor_allocations')
@Index(['sponsorId', 'userId'], { unique: true })
@Index(['userId'], { unique: true })
export class SponsorAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sponsor_id' })
  sponsorId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'integer' })
  rank: number;

  @Column({ type: 'integer' })
  score: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}