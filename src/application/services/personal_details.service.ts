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

  // Add this validation method
  private validatePaymentPhone(paymentMethod: string, phoneNumber: string): void {
    if (!phoneNumber) return;
    
    // Remove any non-digit characters (if user enters +265 or spaces)
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    // Take last 10 digits (in case user includes country code 265)
    const last10Digits = cleanedNumber.slice(-10);
    
    if (paymentMethod === 'tnm' || paymentMethod === 'tnm_mpamba') {
      if (!last10Digits.startsWith('08')) {
        throw new BadRequestException(
          'TNM Mpamba number must start with 08. Examples: 0888123456 or +265888123456'
        );
      }
      if (last10Digits.length !== 10) {
        throw new BadRequestException(
          'TNM Mpamba number must be exactly 10 digits long'
        );
      }
    }
    
    if (paymentMethod === 'airtel' || paymentMethod === 'airtel_money') {
      if (!last10Digits.startsWith('09')) {
        throw new BadRequestException(
          'Airtel Money number must start with 09. Examples: 0999123456 or +265999123456'
        );
      }
      if (last10Digits.length !== 10) {
        throw new BadRequestException(
          'Airtel Money number must be exactly 10 digits long'
        );
      }
    }
  }

  // Helper method to validate before any payment update
  private validatePaymentDetails(paymentMethod?: string, paymentPhoneNumber?: string): void {
    if (paymentMethod && paymentPhoneNumber) {
      this.validatePaymentPhone(paymentMethod, paymentPhoneNumber);
    }
    
    // If only phone number is provided without payment method, we can't validate
    if (!paymentMethod && paymentPhoneNumber) {
      throw new BadRequestException(
        'Payment method is required when providing payment phone number'
      );
    }
  }

  async create(userId: string, createDto: CreatePersonalDetailDto): Promise<PersonalDetails> {
    // Validate payment details before creating
    this.validatePaymentDetails(createDto.paymentMethod, createDto.paymentPhoneNumber);

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

    const saved = await this.personalDetailRepository.save(personalDetail);
    await this.adminService.syncProfile(saved);
    return saved;
  }

  async upsertByUserId(userId: string, data: CreatePersonalDetailDto): Promise<PersonalDetails> {
    // Validate payment details before upsert
    this.validatePaymentDetails(data.paymentMethod, data.paymentPhoneNumber);

    const existingDetails = await this.personalDetailRepository.findOne({
      where: { userId },
    });

    if (existingDetails) {
      return await this.update(existingDetails.id, data);
    }

    return await this.create(userId, data);
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
    
    // Validate payment details if they are being updated
    if (updateDto.paymentMethod || updateDto.paymentPhoneNumber) {
      const paymentMethod = updateDto.paymentMethod || personalDetail.paymentMethod;
      const paymentPhoneNumber = updateDto.paymentPhoneNumber || personalDetail.paymentPhoneNumber;
      this.validatePaymentDetails(paymentMethod, paymentPhoneNumber);
    }
    
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
    
    // Validate payment details before updating
    const paymentMethod = (paymentDto as any).paymentMethod || personalDetail.paymentMethod;
    const paymentPhoneNumber = (paymentDto as any).paymentPhoneNumber || personalDetail.paymentPhoneNumber;
    this.validatePaymentDetails(paymentMethod, paymentPhoneNumber);
    
    if (paymentDto.paymentBranch !== undefined) personalDetail.paymentBranch = paymentDto.paymentBranch;
    if ((paymentDto as any).paymentMethod !== undefined) personalDetail.paymentMethod = (paymentDto as any).paymentMethod;
    if ((paymentDto as any).paymentPhoneNumber !== undefined) personalDetail.paymentPhoneNumber = (paymentDto as any).paymentPhoneNumber;
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