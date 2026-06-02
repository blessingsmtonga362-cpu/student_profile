import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { RankingCriteriaConfig } from '../ranking-criteria.defaults';

@Entity('ranking_criteria_templates')
export class RankingCriteriaTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @Column({ type: 'jsonb' })
  criteria: RankingCriteriaConfig;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
