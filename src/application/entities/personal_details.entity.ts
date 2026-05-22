import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { format, parse } from 'date-fns';

export enum MaritalStatus {
  SINGLE = 'Single',
  MARRIED = 'Married',
  DIVORCED = 'Divorced',
  WIDOWED = 'Widowed',
  SEPARATED = 'Separated'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum Disability {
  NONE = 'None',
  PHYSICAL = 'Physical',
  VISUAL = 'Visual',
  HEARING = 'Hearing',
  SPEECH = 'Speech',
  INTELLECTUAL = 'Intellectual',
  OTHER = 'Other'
}

@Entity('personal_details')
export class PersonalDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Basic Information
  @Column({ name: 'first_name', nullable: false, length: 15 })
  firstName: string;

  @Column({ name: 'last_name', nullable: false, length: 15 })
  lastName: string;

  @Column({ name: 'phone_number', nullable: false, length: 10 })
  phoneNumber: string;

  @Column({ name: 'national_id_number', nullable: false, unique: true, length: 10 })
  nationalIdNumber: string;

  @Column({ name: 'home_district', nullable: false, length: 20 })
  homeDistrict: string;

  @Column({ name: 'traditional_authority', nullable: false, length: 20 })
  traditionalAuthority: string;

  @Column({ name: 'physical_address', nullable: false, type: 'text' })
  physicalAddress: string;

  @Column({ name: 'date_of_birth', nullable: false, type: 'date' })
  dateOfBirth: Date;


  get formattedDateOfBirth(): string {
    return format(this.dateOfBirth, 'dd/MM/yyyy');
  }
  set formattedDateOfBirth(value: string) {
    this.dateOfBirth = parse(value, 'dd/MM/yyyy', new Date());
  }
  @Column({ name: 'registration_number', nullable: false, unique: true, length: 15 })
  registrationNumber: string;

  @Column({ 
  name: 'disability', 
  type: 'enum', 
  enum: Disability, 
  default: Disability.NONE,
  enumName: 'disability_enum'
})
disability: Disability;

  @Column({ name: 'disability_description', nullable: true, type: 'text' })
  disabilityDescription: string;

 // Document Uploads
@Column({ name: 'student_id_pdf_url', nullable: true, type: 'text' })
studentIdPdfUrl?: string;

@Column({ name: 'student_id_filename', nullable: true, type: 'varchar' })
studentIdFilename?: string;

@Column({ name: 'national_id_pdf_url', nullable: true, type: 'text' })
nationalIdPdfUrl?: string;

@Column({ name: 'national_id_filename', nullable: true, type: 'varchar' })
nationalIdFilename?: string;

  // Marital Status
  @Column({
    name: 'marital_status',
    type: 'enum',
    enum: MaritalStatus,
    default: MaritalStatus.SINGLE
  })
  maritalStatus: MaritalStatus;

  // Gender
  @Column({
    type: 'enum',
    enum: Gender,
    default: Gender.MALE
  })
  gender: Gender;

 // Payment Details - NO union types, just optional with nullable true
@Column({ 
  name: 'payment_branch', 
  nullable: true, 
  length: 20,
  type: 'varchar'
})
paymentBranch?: string;

@Column({
  name: 'payment_method',
  nullable: true,
  length: 20,
  type: 'varchar'
})
paymentMethod?: string;

@Column({
  name: 'payment_phone_number',
  nullable: true,
  length: 10,
  type: 'varchar'
})
paymentPhoneNumber?: string;

@Column({ 
  name: 'bank_name', 
  nullable: true, 
  length: 20,
  type: 'varchar'
})
bankName?: string;

@Column({ 
  name: 'bank_account', 
  nullable: true, 
  length: 15,
  type: 'varchar'
})
bankAccount?: string;

@Column({ 
  name: 'account_name', 
  nullable: true, 
  length: 20,
  type: 'varchar'
})
accountName?: string;
  // Relationships
 // @OneToOne(() => User, (user) => user.personalDetails)
  //@JoinColumn({ name: 'user_id' })
  //user: User;
}
