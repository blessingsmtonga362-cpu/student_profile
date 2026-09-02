import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicDetails } from '../entities/academic_details.entity';
import { CreateAcademicDetailDto, UpdateAcademicDetailDto } from '../dto/create_academic_details.dto';

@Injectable()
export class AcademicDetailService {
  constructor(
    @InjectRepository(AcademicDetails)
    private academicDetailRepository: Repository<AcademicDetails>,
  ) {}

  async create(userId: string, createDto: CreateAcademicDetailDto): Promise<AcademicDetails> {
    // Check if academic details already exist for this user
    const existingDetails = await this.academicDetailRepository.findOne({
      where: { userId }
    });

    if (existingDetails) {
      throw new BadRequestException('Academic details already exist for this user. Use update instead.');
    }

    const academicDetail = this.academicDetailRepository.create({
      userId,
      ...createDto,
    });

    return await this.academicDetailRepository.save(academicDetail);
  }

  async upsertByUserId(userId: string, data: CreateAcademicDetailDto): Promise<AcademicDetails> {
    const existingDetails = await this.academicDetailRepository.findOne({
      where: { userId },
    });

    if (existingDetails) {
      Object.assign(existingDetails, data);
      return await this.academicDetailRepository.save(existingDetails);
    }

    return await this.create(userId, data);
  }

  async findAll(): Promise<AcademicDetails[]> {
    return await this.academicDetailRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AcademicDetails> {
    const academicDetail = await this.academicDetailRepository.findOne({
      where: { id },
    });

    if (!academicDetail) {
      throw new NotFoundException(`Academic details with ID ${id} not found`);
    }

    return academicDetail;
  }

  async findByUserId(userId: string): Promise<AcademicDetails> {
    const academicDetail = await this.academicDetailRepository.findOne({
      where: { userId },
    });

    if (!academicDetail) {
      throw new NotFoundException(`Academic details for user ${userId} not found`);
    }

    return academicDetail;
  }

  async update(id: string, updateDto: UpdateAcademicDetailDto): Promise<AcademicDetails> {
    const academicDetail = await this.findOne(id);
    Object.assign(academicDetail, updateDto);
    return await this.academicDetailRepository.save(academicDetail);
  }

  async updateByUserId(userId: string, updateDto: UpdateAcademicDetailDto): Promise<AcademicDetails> {
    const academicDetail = await this.findByUserId(userId);
    Object.assign(academicDetail, updateDto);
    return await this.academicDetailRepository.save(academicDetail);
  }

  async updateTranscript(userId: string, transcriptPdfUrl: string): Promise<AcademicDetails> {
    const academicDetail = await this.findByUserId(userId);
    academicDetail.transcriptPdfUrl = transcriptPdfUrl;
    return await this.academicDetailRepository.save(academicDetail);
  }

  async remove(id: string): Promise<void> {
    const academicDetail = await this.findOne(id);
    await this.academicDetailRepository.remove(academicDetail);
  }

  async removeByUserId(userId: string): Promise<void> {
    const academicDetail = await this.findByUserId(userId);
    await this.academicDetailRepository.remove(academicDetail);
  }

  async getYearOptions(): Promise<number[]> {
    return [1, 2, 3, 4, 5, 6];
  }
}
