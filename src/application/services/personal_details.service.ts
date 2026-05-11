import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalDetails, MaritalStatus, Gender, Disability } from '../entities/personal_details.entity';
import { CreatePersonalDetailDto, UpdatePersonalDetailDto, UpdatePaymentDetailsDto } from '../dto/create_personal_details.dto';
import { AdminService } from 'src/admin/admin.service';
@Injectable()
export class PersonalDetailService {
  constructor(
    @InjectRepository(PersonalDetails)
    private personalDetailRepository: Repository<PersonalDetails>,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService
  ) {}

  async create(userId: string, createDto: CreatePersonalDetailDto): Promise<PersonalDetails> {
    const existingDetails = await this.personalDetailRepository.findOne({
      where: { userId }
    });

    if (existingDetails) {
      throw new BadRequestException('Personal details already exist for this user. Use update instead.');
    }

    const existingNationalId = await this.personalDetailRepository.findOne({
      where: { nationalIdNumber: createDto.nationalIdNumber }
    });

    if (existingNationalId) {
      throw new ConflictException('National ID number already registered');
    }

    const existingRegNumber = await this.personalDetailRepository.findOne({
      where: { registrationNumber: createDto.registrationNumber }
    });

    if (existingRegNumber) {
      throw new ConflictException('Registration number already exists');
    }

    const personalDetail = this.personalDetailRepository.create({
      userId,
      ...createDto,
    });

    const saved= await this.personalDetailRepository.save(personalDetail);
    await this.adminService.syncProfile(saved);
    return saved;
  }

  async findAll(): Promise<PersonalDetails[]> {
    return await this.personalDetailRepository.find({
      order: { createdAt: 'DESC' } as any,
    });
  }

  async findOne(id: string): Promise<PersonalDetails> {
    const personalDetail = await this.personalDetailRepository.findOne({
      where: { id },
    });

    if (!personalDetail) {
      throw new NotFoundException(`Personal details with ID ${id} not found`);
    }

    return personalDetail;
  }

  async findByUserId(userId: string): Promise<PersonalDetails> {
    const personalDetail = await this.personalDetailRepository.findOne({
      where: { userId },
    });

    if (!personalDetail) {
      throw new NotFoundException(`Personal details for user ${userId} not found`);
    }

    return personalDetail;
  }

  async update(id: string, updateDto: UpdatePersonalDetailDto): Promise<PersonalDetails> {
    const personalDetail = await this.findOne(id);
    
    if (updateDto.nationalIdNumber && updateDto.nationalIdNumber !== personalDetail.nationalIdNumber) {
      const existing = await this.personalDetailRepository.findOne({
        where: { nationalIdNumber: updateDto.nationalIdNumber }
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('National ID number already registered');
      }
    }
    
    if (updateDto.registrationNumber && updateDto.registrationNumber !== personalDetail.registrationNumber) {
      const existing = await this.personalDetailRepository.findOne({
        where: { registrationNumber: updateDto.registrationNumber }
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Registration number already exists');
      }
    }
    
    Object.assign(personalDetail, updateDto);
    return await this.personalDetailRepository.save(personalDetail);
  }

  async updateByUserId(userId: string, updateDto: UpdatePersonalDetailDto): Promise<PersonalDetails> {
    const personalDetail = await this.findByUserId(userId);
    return await this.update(personalDetail.id, updateDto);
  }

  async updateDocuments(
    userId: string,
    studentIdPdfUrl?: string,
    studentIdFilename?: string,
    nationalIdPdfUrl?: string,
    nationalIdFilename?: string
  ): Promise<PersonalDetails> {
    const personalDetail = await this.findByUserId(userId);
    
    if (studentIdPdfUrl !== undefined) {
      personalDetail.studentIdPdfUrl = studentIdPdfUrl;
    }
    if (studentIdFilename !== undefined) {
      personalDetail.studentIdFilename = studentIdFilename;
    }
    
    if (nationalIdPdfUrl !== undefined) {
      personalDetail.nationalIdPdfUrl = nationalIdPdfUrl;
    }
    if (nationalIdFilename !== undefined) {
      personalDetail.nationalIdFilename = nationalIdFilename;
    }
    
    return await this.personalDetailRepository.save(personalDetail);
  }

  async updatePaymentDetails(userId: string, paymentDto: UpdatePaymentDetailsDto): Promise<PersonalDetails> {
    const personalDetail = await this.findByUserId(userId);
    
    if (paymentDto.paymentBranch !== undefined) personalDetail.paymentBranch = paymentDto.paymentBranch;
    if (paymentDto.bankName !== undefined) personalDetail.bankName = paymentDto.bankName;
    if (paymentDto.bankAccount !== undefined) personalDetail.bankAccount = paymentDto.bankAccount;
    if (paymentDto.accountName !== undefined) personalDetail.accountName = paymentDto.accountName;
    
    return await this.personalDetailRepository.save(personalDetail);
  }

  async remove(id: string): Promise<void> {
    const personalDetail = await this.findOne(id);
    await this.personalDetailRepository.remove(personalDetail);
  }

  async removeByUserId(userId: string): Promise<void> {
    const personalDetail = await this.findByUserId(userId);
    await this.personalDetailRepository.remove(personalDetail);
  }

  async getMaritalStatuses(): Promise<string[]> {
    return Object.values(MaritalStatus);
  }

  async getGenders(): Promise<string[]> {
    return Object.values(Gender);
  }

  async getDisabilities(): Promise<string[]> {
    return Object.values(Disability);
  }
}
