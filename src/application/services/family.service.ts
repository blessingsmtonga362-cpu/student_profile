import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family, EducationLevel } from '../entities/family.entity';
import { CreateFamilyDto, UpdateFamilyDto } from '../dto/create_family.dto';

@Injectable()
export class FamilyService {
  constructor(
    @InjectRepository(Family)
    private familyRepository: Repository<Family>,
  ) {}

  // Combined validation and auto-calculation method
  private validateAndNormalizeSiblingNumbers(data: {
    numberOfSiblings?: number;
    numberStillInSchool?: number;
    siblingsInPrimary?: number;
    siblingsInSecondary?: number;
    siblingsInTertiary?: number;
  }): void {
    // Calculate the sum from level breakdowns
    const calculatedTotal = 
      (Number(data.siblingsInPrimary) || 0) + 
      (Number(data.siblingsInSecondary) || 0) + 
      (Number(data.siblingsInTertiary) || 0);
    
    // Auto-correct numberStillInSchool based on the sum
    if (data.numberStillInSchool !== calculatedTotal) {
      console.warn(
        `Auto-correcting numberStillInSchool from ${data.numberStillInSchool} to ${calculatedTotal}`
      );
      data.numberStillInSchool = calculatedTotal;
    }

    // Validate that siblings in school doesn't exceed total siblings
    if (data.numberOfSiblings !== undefined && calculatedTotal > data.numberOfSiblings) {
      throw new BadRequestException(
        `Number of siblings still in school (${calculatedTotal}) cannot exceed total number of siblings (${data.numberOfSiblings})`
      );
    }

    if (data.numberOfSiblings !== undefined && data.numberOfSiblings < 0) {
      throw new BadRequestException('Number of siblings cannot be negative');
    }
    
    if (calculatedTotal < 0) {
      throw new BadRequestException('Number of siblings in school cannot be negative');
    }
  }

  async create(userId: string, createDto: CreateFamilyDto): Promise<Family> {
    this.validateAndNormalizeSiblingNumbers(createDto);

    const existingFamily = await this.familyRepository.findOne({
      where: { userId }
    });

    if (existingFamily) {
      throw new BadRequestException('Family member already exists for this user');
    }

    const family = this.familyRepository.create({
      userId,
      ...createDto,
    });

    return await this.familyRepository.save(family);
  }

  async upsertByUserId(userId: string, data: CreateFamilyDto): Promise<Family> {
    this.validateAndNormalizeSiblingNumbers(data);

    const existingFamily = await this.familyRepository.findOne({
      where: { userId },
    });

    if (existingFamily) {
      Object.assign(existingFamily, data);
      return await this.familyRepository.save(existingFamily);
    }

    const family = this.familyRepository.create({
      userId,
      ...data,
    });

    return await this.familyRepository.save(family);
  }

  async createFromParents(userId: string, familyData: any): Promise<Family> {
    this.validateAndNormalizeSiblingNumbers(familyData);
    return this.upsertByUserId(userId, familyData);
  }

  async createFromGuarantor(userId: string, guarantorData: any): Promise<Family> {
    const existingFamily = await this.familyRepository.findOne({
      where: { userId }
    });

    if (existingFamily) {
      existingFamily.guardianFirstName = guarantorData.guarantorFullName?.split(' ')[0] || 'Not Provided';
      existingFamily.guardianSurname = guarantorData.guarantorFullName?.split(' ').slice(1).join(' ') || 'Not Provided';
      existingFamily.profession = guarantorData.relationshipToApplicant || 'Guardian';
      existingFamily.residenceAddress = guarantorData.guarantorAddress || 'Not Provided';
      existingFamily.postalAddress = guarantorData.guarantorAddress;
      return await this.familyRepository.save(existingFamily);
    }

    const family = this.familyRepository.create({
      userId,
      guardianFirstName: guarantorData.guarantorFullName?.split(' ')[0] || 'Not Provided',
      guardianSurname: guarantorData.guarantorFullName?.split(' ').slice(1).join(' ') || 'Not Provided',
      profession: guarantorData.relationshipToApplicant || 'Guardian',
      dateOfBirth: new Date('11-05-2001'),
      traditionalAuthority: 'Not Specified',
      residenceAddress: guarantorData.guarantorAddress || 'Not Provided',
      postalAddress: guarantorData.guarantorAddress,
      levelOfEducation: EducationLevel.SECONDARY,
      isActive: true,
    });

    return await this.familyRepository.save(family);
  }

  async findAll(): Promise<Family[]> {
    return await this.familyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Family> {
    const family = await this.familyRepository.findOne({
      where: { id },
    });

    if (!family) {
      throw new NotFoundException(`Family member with ID ${id} not found`);
    }

    return family;
  }

  async findByUserId(userId: string): Promise<Family> {
    const family = await this.familyRepository.findOne({
      where: { userId },
    });

    if (!family) {
      throw new NotFoundException(`Family member for user ${userId} not found`);
    }

    return family;
  }

  async update(id: string, updateDto: UpdateFamilyDto): Promise<Family> {
    this.validateAndNormalizeSiblingNumbers(updateDto);
    
    const family = await this.findOne(id);
    Object.assign(family, updateDto);
    return await this.familyRepository.save(family);
  }

  async updateByUserId(userId: string, updateDto: UpdateFamilyDto): Promise<Family> {
    this.validateAndNormalizeSiblingNumbers(updateDto);
    
    const family = await this.findByUserId(userId);
    Object.assign(family, updateDto);
    return await this.familyRepository.save(family);
  }

  // Updated: Only for consent form URL
  async updateConsentForm(userId: string, consentFormUrl: string): Promise<Family> {
    const family = await this.findByUserId(userId);
    family.consentFormUrl = consentFormUrl;
    return await this.familyRepository.save(family);
  }

  // Legacy method - kept for compatibility but only updates consent form
  async updateDocuments(
    userId: string, 
    deathCertificateUrl?: string, 
    nationalIdUrl?: string, 
    consentFormUrl?: string
  ): Promise<Family> {
    const family = await this.findByUserId(userId);
    
    if (consentFormUrl) family.consentFormUrl = consentFormUrl;
    // Death certificate and national ID are ignored now
    
    return await this.familyRepository.save(family);
  }

  async remove(id: string): Promise<void> {
    const family = await this.findOne(id);
    await this.familyRepository.remove(family);
  }

  async removeByUserId(userId: string): Promise<void> {
    const family = await this.findByUserId(userId);
    await this.familyRepository.remove(family);
  }

  async getEducationLevels(): Promise<string[]> {
    return Object.values(EducationLevel);
  }

  async getSiblingSummary(userId: string): Promise<{
    totalSiblings: number;
    siblingsInSchool: number;
    siblingsInPrimary: number;
    siblingsInSecondary: number;
    siblingsInTertiary: number;
  }> {
    const family = await this.findByUserId(userId);
    
    return {
      totalSiblings: family.numberOfSiblings || 0,
      siblingsInSchool: family.numberStillInSchool || 0,
      siblingsInPrimary: family.siblingsInPrimary || 0,
      siblingsInSecondary: family.siblingsInSecondary || 0,
      siblingsInTertiary: family.siblingsInTertiary || 0,
    };
  }
}