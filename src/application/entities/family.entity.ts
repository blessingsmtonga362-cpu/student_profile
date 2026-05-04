import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum EducationLevel {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  CERTIFICATE = 'certificate',
  DIPLOMA = 'diploma',
  BACHELORS = 'bachelors',
  MASTERS = 'masters',
  PHD = 'phd',
  OTHER = 'other'
}

@Entity('family')
export class Family {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'guardian_first_name', length: 100 })
  guardianFirstName: string;

  @Column({ name: 'guardian_last_name', length: 100 })
  guardianLastName: string;

  @Column({ nullable: true })
  profession: string;

  @Column({ name: 'date_of_birth', type: 'date' })
  dateOfBirth: Date;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ name: 'traditional_authority', length: 100, nullable: true })
  traditionalAuthority: string;

  @Column({ name: 'residence_address', type: 'text' })
  residenceAddress: string;

  @Column({ name: 'postal_address', length: 200, nullable: true })
  postalAddress: string;

  @Column({
    name: 'level_of_education',
    type: 'enum',
    enum: EducationLevel,
    default: EducationLevel.SECONDARY
  })
  levelOfEducation: EducationLevel;

  @Column({ name: 'death_certificate_url', nullable: true })
  deathCertificateUrl: string;

  @Column({ name: 'national_id_url', nullable: true })
  nationalIdUrl: string; // Guarantor national ID PDF

  @Column({ name: 'consent_form_url', nullable: true })
  consentFormUrl: string; // Guarantor consent form PDF

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  //@ManyToOne(() => User, user => user.family)
  //@JoinColumn({ name: 'user_id' })
  //user: User;
}