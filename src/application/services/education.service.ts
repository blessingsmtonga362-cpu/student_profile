import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Education, EducationLevel, FeePayer } from '../entities/education.entity';
import { PrimaryEducationDto } from '../dto/education/primary-education.dto';
import { SecondaryEducationDto } from '../dto/education/secondary-education.dto';
import { TertiaryEducationDto } from '../dto/education/tertiary-education.dto';

@Injectable()
export class EducationService {
  constructor(
    @InjectRepository(Education)
    private educationRepository: Repository<Education>,
  ) {}
  async updatePrimary(id: string, updateDto: Partial<PrimaryEducationDto>): Promise<Education> {
  const education = await this.findOne(id);
  
  if (education.educationLevel !== EducationLevel.PRIMARY) {
    throw new BadRequestException('This education record is not primary level');
  }
  
  Object.assign(education, updateDto);
  return await this.educationRepository.save(education);
}

async updateSecondary(id: string, updateDto: Partial<SecondaryEducationDto>): Promise<Education> {
  const education = await this.findOne(id);
  
  if (education.educationLevel !== EducationLevel.SECONDARY) {
    throw new BadRequestException('This education record is not secondary level');
  }
  
  Object.assign(education, updateDto);
  return await this.educationRepository.save(education);
}

async updateTertiary(id: string, updateDto: Partial<TertiaryEducationDto>): Promise<Education> {
  const education = await this.findOne(id);
  
  if (education.educationLevel !== EducationLevel.TERTIARY) {
    throw new BadRequestException('This education record is not tertiary level');
  }
  
  Object.assign(education, updateDto);
  return await this.educationRepository.save(education);
}
  // Create Primary Education
  async createPrimary(userId: string, data: PrimaryEducationDto): Promise<Education> {
    // Validate other payer name if needed
    if (data.whoPaidFees === FeePayer.OTHER && !data.otherPayerName) {
      throw new BadRequestException('Please specify the payer name');
    }

    const education = this.educationRepository.create({
      userId,
      educationLevel: EducationLevel.PRIMARY,
      schoolName: data.schoolName,
      tuitionFees: data.tuitionFees,
      yearCompleted: data.yearCompleted,
      whoPaidFees: data.whoPaidFees,
      otherPayerName: data.otherPayerName,
      certificateUrl: data.certificateUrl,
      isSemesterBased: false,
    });

    return await this.educationRepository.save(education);
  }

  // Create Secondary Education
  async createSecondary(userId: string, data: SecondaryEducationDto): Promise<Education> {
    if (data.whoPaidFees === FeePayer.OTHER && !data.otherPayerName) {
      throw new BadRequestException('Please specify the payer name');
    }

    const education = this.educationRepository.create({
      userId,
      educationLevel: EducationLevel.SECONDARY,
      schoolName: data.schoolName,
      tuitionFees: data.tuitionFees,
      yearCompleted: data.yearCompleted,
      whoPaidFees: data.whoPaidFees,
      otherPayerName: data.otherPayerName,
      certificateUrl: data.certificateUrl,
      isSemesterBased: false,
    });

    return await this.educationRepository.save(education);
  }

  // Create Tertiary Education
  async createTertiary(userId: string, data: TertiaryEducationDto): Promise<Education> {
    if (data.whoPaidFees === FeePayer.OTHER && !data.otherPayerName) {
      throw new BadRequestException('Please specify the payer name');
    }

    const education = this.educationRepository.create({
      userId,
      educationLevel: EducationLevel.TERTIARY,
      schoolName: data.schoolName,
      tuitionFees: data.tuitionFees,
      yearCompleted: data.yearCompleted,
      whoPaidFees: data.whoPaidFees,
      otherPayerName: data.otherPayerName,
      certificateUrl: data.certificateUrl,
      isSemesterBased: data.isSemesterBased !== undefined ? data.isSemesterBased : true,
    });

    return await this.educationRepository.save(education);
  }

  async upsertByLevel(
    userId: string,
    level: EducationLevel,
    data: Partial<PrimaryEducationDto & SecondaryEducationDto & TertiaryEducationDto>,
  ): Promise<Education> {
    const existingRecords = await this.findByLevel(userId, level);
    const existingRecord = existingRecords[0];

    if (existingRecord) {
      Object.assign(existingRecord, data);
      return await this.educationRepository.save(existingRecord);
    }

    if (level === EducationLevel.PRIMARY) {
      return await this.createPrimary(userId, data as PrimaryEducationDto);
    }

    if (level === EducationLevel.SECONDARY) {
      return await this.createSecondary(userId, data as SecondaryEducationDto);
    }

    return await this.createTertiary(userId, data as TertiaryEducationDto);
  }

  // Get all education records for a user
  async findByUserId(userId: string): Promise<Education[]> {
    return await this.educationRepository.find({
      where: { userId },
      order: { yearCompleted: 'DESC' },
    });
  }

  // Get education by level
  async findByLevel(userId: string, level: EducationLevel): Promise<Education[]> {
    return await this.educationRepository.find({
      where: { userId, educationLevel: level },
      order: { yearCompleted: 'DESC' },
    });
  }

  // Get single education record
  async findOne(id: string): Promise<Education> {
    const education = await this.educationRepository.findOne({
      where: { id },
    });

    if (!education) {
      throw new NotFoundException(`Education record with ID ${id} not found`);
    }

    return education;
  }

  // Update education
  async update(id: string, updateDto: any): Promise<Education> {
    const education = await this.findOne(id);
    
    if (updateDto.whoPaidFees === FeePayer.OTHER && !updateDto.otherPayerName) {
      throw new BadRequestException('Please specify the payer name');
    }
    
    Object.assign(education, updateDto);
    return await this.educationRepository.save(education);
  }

  // Delete education
  async remove(id: string): Promise<void> {
    const education = await this.findOne(id);
    await this.educationRepository.remove(education);
  }

  // Get all education grouped by level (for dashboard)
  async getGroupedEducation(userId: string) {
    const allEducation = await this.findByUserId(userId);
    
    return {
      primary: allEducation.filter(e => e.educationLevel === EducationLevel.PRIMARY),
      secondary: allEducation.filter(e => e.educationLevel === EducationLevel.SECONDARY),
      tertiary: allEducation.filter(e => e.educationLevel === EducationLevel.TERTIARY),
    };
  }

  // Get statistics for a user
  async getEducationStats(userId: string) {
    const allEducation = await this.findByUserId(userId);
    
    const totalFeesPaid = allEducation.reduce((sum, edu) => sum + Number(edu.tuitionFees), 0);
    
    const feePayerStats = {
      self: allEducation.filter(e => e.whoPaidFees === FeePayer.SELF).length,
      parent: allEducation.filter(e => e.whoPaidFees === FeePayer.PARENT).length,
      guardian: allEducation.filter(e => e.whoPaidFees === FeePayer.GUARDIAN).length,
      sponsor: allEducation.filter(e => e.whoPaidFees === FeePayer.SPONSOR).length,
      scholarship: allEducation.filter(e => e.whoPaidFees === FeePayer.SCHOLARSHIP).length,
      other: allEducation.filter(e => e.whoPaidFees === FeePayer.OTHER).length,
    };

    return {
      totalEducationRecords: allEducation.length,
      totalFeesPaid,
      averageFees: totalFeesPaid / (allEducation.length || 1),
      feePayerStats,
      byLevel: {
        primary: allEducation.filter(e => e.educationLevel === EducationLevel.PRIMARY).length,
        secondary: allEducation.filter(e => e.educationLevel === EducationLevel.SECONDARY).length,
        tertiary: allEducation.filter(e => e.educationLevel === EducationLevel.TERTIARY).length,
      }
    };
  }

  // Admin methods
  async findAll(): Promise<Education[]> {
    return await this.educationRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getFeePayerOptions(): Promise<string[]> {
    return Object.values(FeePayer);
  }

  async getEducationLevels(): Promise<string[]> {
    return Object.values(EducationLevel);
  }
}
