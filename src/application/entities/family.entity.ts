// family.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { BadRequestException } from '@nestjs/common';

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

  @Column({ name: 'parental_status', length: 20, nullable: true })
  parentalStatus?: string;

  @Column({ name: 'father_first_name', length: 15, nullable: true })
  fatherFirstName?: string;

  @Column({ name: 'father_surname', length: 15, nullable: true })
  fatherSurname?: string;

  @Column({ name: 'father_national_id', length: 10, nullable: true })
  fatherNationalId?: string;

  @Column({ name: 'father_phone', length: 10, nullable: true })
  fatherPhone?: string;

  @Column({ name: 'father_profession', length: 15, nullable: true })
  fatherProfession?: string;

  @Column({ name: 'father_monthly_income', type: 'decimal', precision: 12, scale: 2, nullable: true })
  fatherMonthlyIncome?: number;

  @Column({ name: 'father_ta', length: 20, nullable: true })
  fatherTa?: string;

  @Column({ name: 'father_residential_address', type: 'text', nullable: true })
  fatherResidentialAddress?: string;

  @Column({ name: 'father_postal_address', type: 'text', nullable: true })
  fatherPostalAddress?: string;

  @Column({ name: 'mother_first_name', length: 15, nullable: true })
  motherFirstName?: string;

  @Column({ name: 'mother_surname', length: 15, nullable: true })
  motherSurname?: string;

  @Column({ name: 'mother_national_id', length: 10, nullable: true })
  motherNationalId?: string;

  @Column({ name: 'mother_phone', length: 10, nullable: true })
  motherPhone?: string;

  @Column({ name: 'mother_profession', length: 15, nullable: true })
  motherProfession?: string;

  @Column({ name: 'mother_monthly_income', type: 'decimal', precision: 12, scale: 2, nullable: true })
  motherMonthlyIncome?: number;

  @Column({ name: 'mother_ta', length: 20, nullable: true })
  motherTa?: string;

  @Column({ name: 'mother_residential_address', type: 'text', nullable: true })
  motherResidentialAddress?: string;

  @Column({ name: 'mother_postal_address', type: 'text', nullable: true })
  motherPostalAddress?: string;

  @Column({ name: 'parent_first_name', length: 15, nullable: true })
  parentFirstName?: string;

  @Column({ name: 'parent_surname', length: 15, nullable: true })
  parentSurname?: string;

  @Column({ name: 'parent_national_id', length: 10, nullable: true })
  parentNationalId?: string;

  @Column({ name: 'parent_phone', length: 10, nullable: true })
  parentPhone?: string;

  @Column({ name: 'parent_monthly_income', type: 'decimal', precision: 12, scale: 2, nullable: true })
  parentMonthlyIncome?: number;

  @Column({ name: 'student_relationship', length: 10, nullable: true })
  studentRelationship?: string;

  @Column({ name: 'parent_ta', length: 15, nullable: true })
  parentTa?: string;

  @Column({ name: 'parent_residential_address', type: 'text', nullable: true })
  parentResidentialAddress?: string;

  @Column({ name: 'parent_postal_address', type: 'text', nullable: true })
  parentPostalAddress?: string;

  @Column({ name: 'deceased_parent_id', length: 50, nullable: true })
  deceasedParentId?: string;

  @Column({ name: 'guardian_first_name', length: 20, nullable: true })
  guardianFirstName?: string;

  @Column({ name: 'guardian_last_name', length: 20, nullable: true })
  guardianSurname?: string;

  @Column({ name: 'guardian_national_id', length: 10, nullable: true })
  guardianNationalId?: string;

  @Column({ name: 'guardian_phone', length: 10, nullable: true })
  guardianPhone?: string;

  @Column({ name: 'guardian_monthly_income', type: 'decimal', precision: 12, scale: 2, nullable: true })
  guardianMonthlyIncome?: number;

  @Column({ name: 'relationship_to_guardian', length: 10, nullable: true })
  relationshipToGuardian?: string;

  @Column({ name: 'guardian_ta', length: 20, nullable: true })
  guardianTa?: string;

  @Column({ name: 'guardian_residential_address', type: 'text', nullable: true })
  guardianResidentialAddress?: string;

  @Column({ name: 'guardian_postal_address', type: 'text', nullable: true })
  guardianPostalAddress?: string;

  @Column({ name: 'deceased_father_id', length: 10, nullable: true })
  deceasedFatherId?: string;

  @Column({ name: 'deceased_mother_id', length: 10, nullable: true })
  deceasedMotherId?: string;

  @Column({ name: 'number_of_siblings', type: 'integer', nullable: true })
  numberOfSiblings?: number;

  @Column({ name: 'number_still_in_school', type: 'integer', nullable: true })
  numberStillInSchool?: number;

  @Column({ name: 'siblings_in_primary', type: 'integer', nullable: true })
  siblingsInPrimary?: number;

  @Column({ name: 'siblings_in_secondary', type: 'integer', nullable: true })
  siblingsInSecondary?: number;

  @Column({ name: 'siblings_in_tertiary', type: 'integer', nullable: true })
  siblingsInTertiary?: number;

  @Column({ nullable: true })
  profession?: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ name: 'traditional_authority', length: 20, nullable: true })
  traditionalAuthority?: string;

  @Column({ name: 'residence_address', type: 'text', nullable: true })
  residenceAddress?: string;

  @Column({ name: 'postal_address', length: 50, nullable: true })
  postalAddress?: string;

  @Column({
    name: 'level_of_education',
    type: 'enum',
    enum: EducationLevel,
    default: EducationLevel.SECONDARY,
    nullable: true,
  })
  levelOfEducation?: EducationLevel;

  @Column({ name: 'death_certificate_url', nullable: true, type: 'text' })
  deathCertificateUrl?: string;

  @Column({ name: 'national_id_url', nullable: true, type: 'text' })
  nationalIdUrl?: string;

  @Column({ name: 'consent_form_url', nullable: true, type: 'text' })
  consentFormUrl?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Phone number validation method
  private validatePhoneNumber(phone: string | undefined, fieldName: string): void {
    if (!phone) return;
    
    let cleanedNumber = phone.replace(/[\s-]/g, '');
    
    if (cleanedNumber.startsWith('+265')) {
      cleanedNumber = cleanedNumber.substring(4);
    }
    
    cleanedNumber = cleanedNumber.replace(/^0+/, '');
    
    const phoneRegex = /^[89][0-9]{8}$/;
    
    if (!phoneRegex.test(cleanedNumber)) {
      throw new BadRequestException(
        `${fieldName} must be a valid Malawi phone number. Enter 9 digits starting with 8 (Airtel) or 9 (TNM). Example: 888123456 or 999123456`
      );
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  validatePhoneNumbers() {
    this.validatePhoneNumber(this.fatherPhone, "Father's phone number");
    this.validatePhoneNumber(this.motherPhone, "Mother's phone number");
    this.validatePhoneNumber(this.parentPhone, "Parent's phone number");
    this.validatePhoneNumber(this.guardianPhone, "Guardian's phone number");
  }
}