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

  async create(userId: string, createDto: CreateFamilyDto): Promise<Family> {
    // Check if family member already exists for this user
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
  }// Add this method to FamilyService class
async createFromGuarantor(userId: string, guarantorData: any): Promise<Family> {
  const existingFamily = await this.familyRepository.findOne({
    where: { userId }
  });

  if (existingFamily) {
    // Update existing instead of throwing error
    existingFamily.guardianFirstName = guarantorData.guarantorFullName.split(' ')[0] || 'Not Provided';
    existingFamily.guardianLastName = guarantorData.guarantorFullName.split(' ').slice(1).join(' ') || 'Not Provided';
    existingFamily.profession = guarantorData.relationshipToApplicant || 'Guardian';
    existingFamily.residenceAddress = guarantorData.guarantorAddress || 'Not Provided';
    existingFamily.postalAddress = guarantorData.guarantorAddress;
    return await this.familyRepository.save(existingFamily);
  }

  const family = this.familyRepository.create({
    userId,
    guardianFirstName: guarantorData.guarantorFullName.split(' ')[0] || 'Not Provided',
    guardianLastName: guarantorData.guarantorFullName.split(' ').slice(1).join(' ') || 'Not Provided',
    profession: guarantorData.relationshipToApplicant || 'Guardian',
    dateOfBirth: new Date('1970-01-01'),
    traditionalAuthority: 'Not Specified',
    residenceAddress: guarantorData.guarantorAddress || 'Not Provided',
    postalAddress: guarantorData.guarantorAddress,
    levelOfEducation: EducationLevel.SECONDARY,
    isActive: true,
  });

  return await this.familyRepository.save(family);
}

  // New method: Create family from parent data (father/mother)
  async createFromParents(userId: string, familyData: any): Promise<Family> {
    // Check if family member already exists for this user
    const existingFamily = await this.familyRepository.findOne({
      where: { userId }
    });

    if (existingFamily) {
      throw new BadRequestException('Family member already exists for this user');
    }

    // Transform frontend parent data to backend guardian data
    const transformedData = {
      guardianFirstName: familyData.fatherFirstName || familyData.motherFirstName || 'Not Provided',
      guardianLastName: familyData.fatherLastName || familyData.motherLastName || 'Not Provided',
      profession: familyData.fatherProfession || familyData.motherProfession || 'Not Provided',
      traditionalAuthority: familyData.fatherTa || familyData.motherTa || 'Not Provided',
      residenceAddress: familyData.fatherResidentialAddress || familyData.motherResidentialAddress || 'Not Provided',
      postalAddress: familyData.fatherPostalAddress || familyData.motherPostalAddress || 'Not Provided',
      dateOfBirth: new Date(),
      userId: userId,
    };
    
    // Add optional fields if they exist
    if (familyData.fatherPhone) {
      (transformedData as any).phoneNumber = familyData.fatherPhone;
    }
    
    // ✅ Fixed: Only pass transformedData (it already contains userId)
    const family = this.familyRepository.create(transformedData);

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
    const family = await this.findOne(id);
    Object.assign(family, updateDto);
    return await this.familyRepository.save(family);
  }

  async updateByUserId(userId: string, updateDto: UpdateFamilyDto): Promise<Family> {
    const family = await this.findByUserId(userId);
    Object.assign(family, updateDto);
    return await this.familyRepository.save(family);
  }

  async updateDocuments(
    userId: string, 
    deathCertificateUrl?: string, 
    nationalIdUrl?: string, 
    consentFormUrl?: string
  ): Promise<Family> {
    const family = await this.findByUserId(userId);
    
    if (deathCertificateUrl) family.deathCertificateUrl = deathCertificateUrl;
    if (nationalIdUrl) family.nationalIdUrl = nationalIdUrl;
    if (consentFormUrl) family.consentFormUrl = consentFormUrl;
    
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
}