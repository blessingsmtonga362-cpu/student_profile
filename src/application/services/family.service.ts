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
  }

  async upsertByUserId(userId: string, data: CreateFamilyDto): Promise<Family> {
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

  // New method: Create family from parent data (father/mother)
  async createFromParents(userId: string, familyData: any): Promise<Family> {
    return this.upsertByUserId(userId, familyData);
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
