import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('verification_logs')
export class VerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id !: string;

  @Column({ name: 'user_id' })
  userId !: string;

  @Column({ name: 'document_type' })
  documentType !: string;

  @Column({ name: 'user_input', type: 'text', nullable: true })
  userInput !: string;

  @Column({ name: 'extracted_data', type: 'text', nullable: true })
  extractedData !:  string;

  @Column({ name: 'is_verified', default: false })
  isVerified !: boolean;

  @Column({ name: 'mismatches', type: 'text', nullable: true })
  mismatches !: string;

  @Column({ name: 'warnings', type: 'text', nullable: true })
  warnings !: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt !: Date;
}