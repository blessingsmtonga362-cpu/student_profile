import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('academic_details')
export class AcademicDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string; // Links to User

  @Column({ name: 'program_of_study', nullable: false, length: 255 })
  programOfStudy: string;

  @Column({ nullable: false, length: 255 })
  department: string;

  @Column({ name: 'year_of_study', nullable: false })
  yearOfStudy: number; // 1, 2, 3, 4, etc.

  @Column({ name: 'transcript_pdf_url', nullable: true })
  transcriptPdfUrl: string; // URL to uploaded transcript PDF

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  //@ManyToOne(() => User, (user) => user.academicDetails)
  //@JoinColumn({ name: 'user_id' })
  //user: User;
}