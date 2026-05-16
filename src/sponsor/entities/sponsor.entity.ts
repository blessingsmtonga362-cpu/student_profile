import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('sponsors')
export class Sponsor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  name: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'logo_filename', type: 'varchar', length: 255, nullable: true })
  logoFilename?: string | null;

  @Column({ name: 'requested_slots', type: 'integer' })
  requestedSlots: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
