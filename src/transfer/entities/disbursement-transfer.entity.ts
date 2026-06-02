import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransferStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('disbursement_transfers')
@Index(['reference'])
@Index(['chargeId'])
export class DisbursementTransfer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Internal unique charge ID sent to PayChangu */
  @Column({ name: 'charge_id', length: 100, unique: true })
  chargeId!: string;

  /** PayChangu ref_id returned after payout */
  @Column({ name: 'ref_id', length: 100, nullable: true })
  refId?: string;

  /** Our own human-readable reference */
  @Column({ length: 100 })
  reference!: string;

  /** Recipient phone in international format e.g. +265991234567 */
  @Column({ length: 20 })
  phone!: string;

  /** Recipient display name */
  @Column({ length: 120 })
  name!: string;

  /** Sponsor name associated with this disbursement */
  @Column({ name: 'sponsor_name', length: 120, nullable: true })
  sponsorName?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ length: 5, default: 'MWK' })
  currency!: string;

  /** Mobile money operator name e.g. "Airtel Money" */
  @Column({ name: 'provider', length: 60, nullable: true })
  provider?: string;

  /** PayChangu mobile_money_operator_ref_id used */
  @Column({ name: 'operator_ref_id', length: 60, nullable: true })
  operatorRefId?: string;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status!: TransferStatus;

  /** Full raw response from PayChangu */
  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse?: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
