import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaychanguIntentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('paychangu_payment_intents')
@Index(['transactionId'])
@Index(['reference'])
export class PaychanguPaymentIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ length: 3, default: 'MWK' })
  currency: string;

  @Column({ name: 'student_ids', type: 'jsonb' })
  studentIds: string[];

  @Column({ name: 'batch_size', type: 'int' })
  batchSize: number;

  @Column({ name: 'transaction_id', length: 100, nullable: true })
  transactionId?: string;

  @Column({ length: 100, nullable: true })
  reference?: string;

  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl?: string;

  @Column({
    type: 'enum',
    enum: PaychanguIntentStatus,
    default: PaychanguIntentStatus.PENDING,
  })
  status: PaychanguIntentStatus;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse?: unknown;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
