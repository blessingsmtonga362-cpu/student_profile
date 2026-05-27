import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationLog } from '../application/entities/verification-log.entity';

// Declare as any to avoid TypeScript issues
let pdfParse: any;

@Injectable()
export class DocumentVerificationService {
  constructor(
    @InjectRepository(VerificationLog)
    private verificationLogRepository: Repository<VerificationLog>,
  ) {
    this.initPdfParse();
  }

  private async initPdfParse() {
    if (!pdfParse) {
      try {
        // Use require instead of import for better compatibility
        pdfParse = require('pdf-parse');
      } catch (error) {
        console.error('Failed to load pdf-parse:', error);
        // Create a fallback function
        pdfParse = async () => ({ text: '' });
      }
    }
  }

  async extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
    try {
      await this.initPdfParse();
      if (!pdfParse) {
        return '';
      }
      const data = await pdfParse(fileBuffer);
      return data.text || '';
    } catch (error) {
      console.error('PDF extraction error:', error);
      return '';
    }
  }

  calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const normalizedText1 = text1.toLowerCase().trim();
    const normalizedText2 = text2.toLowerCase().trim();
    
    if (normalizedText1 === normalizedText2) return 1;
    
    const longer = normalizedText1.length > normalizedText2.length ? normalizedText1 : normalizedText2;
    const shorter = normalizedText1.length > normalizedText2.length ? normalizedText2 : normalizedText1;
    
    if (longer.length === 0) return 1;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    return matches / longer.length;
  }

  async verifyNationalId(file: any, userData: any, userId: string): Promise<{
    isVerified: boolean;
    mismatches: string[];
    warnings: string[];
    extractedData: any;
  }> {
    const extractedText = await this.extractTextFromPDF(file.buffer);
    const mismatches: string[] = [];
    const warnings: string[] = [];
    let isVerified = true;

    const extractedName = this.extractNameFromText(extractedText);
    
    if (userData.firstName && extractedName) {
      const similarity = this.calculateSimilarity(userData.firstName, extractedName);
      if (similarity < 0.7) {
        isVerified = false;
        mismatches.push(`First name mismatch: Expected "${userData.firstName}", Found "${extractedName}"`);
      } else if (similarity < 0.9) {
        warnings.push(`First name slight mismatch: Expected "${userData.firstName}", Found "${extractedName}"`);
      }
    }

    if (userData.lastName && extractedName) {
      const similarity = this.calculateSimilarity(userData.lastName, extractedName);
      if (similarity < 0.7) {
        isVerified = false;
        mismatches.push(`Last name mismatch: Expected "${userData.lastName}", Found "${extractedName}"`);
      }
    }

    // Log verification
    try {
      const log = this.verificationLogRepository.create({
        userId,
        documentType: 'national_id',
        isVerified,
        mismatches: JSON.stringify(mismatches),
        warnings: JSON.stringify(warnings),
        userInput: JSON.stringify(userData),
        extractedData: JSON.stringify({ extractedName }),
      });
      await this.verificationLogRepository.save(log);
    } catch (error) {
      console.error('Failed to log verification:', error);
    }

    return { isVerified, mismatches, warnings, extractedData: { extractedName } };
  }

  async verifyStudentId(file: any, userData: any, userId: string): Promise<{
    isVerified: boolean;
    mismatches: string[];
    warnings: string[];
    extractedData: any;
  }> {
    const extractedText = await this.extractTextFromPDF(file.buffer);
    const mismatches: string[] = [];
    const warnings: string[] = [];
    let isVerified = true;

    const extractedName = this.extractNameFromText(extractedText);
    
    if (userData.firstName && extractedName) {
      const similarity = this.calculateSimilarity(userData.firstName, extractedName);
      if (similarity < 0.7) {
        isVerified = false;
        mismatches.push(`Name mismatch on student ID: Expected "${userData.firstName}", Found "${extractedName}"`);
      }
    }

    if (userData.registrationNumber) {
      const extractedRegNumber = this.extractRegistrationNumberFromText(extractedText);
      if (extractedRegNumber) {
        const similarity = this.calculateSimilarity(userData.registrationNumber, extractedRegNumber);
        if (similarity < 0.8) {
          isVerified = false;
          mismatches.push(`Registration number mismatch: Expected "${userData.registrationNumber}", Found "${extractedRegNumber}"`);
        }
      }
    }

    // Log verification
    try {
      const log = this.verificationLogRepository.create({
        userId,
        documentType: 'student_id',
        isVerified,
        mismatches: JSON.stringify(mismatches),
        warnings: JSON.stringify(warnings),
        userInput: JSON.stringify(userData),
        extractedData: JSON.stringify({ extractedName }),
      });
      await this.verificationLogRepository.save(log);
    } catch (error) {
      console.error('Failed to log verification:', error);
    }

    return { isVerified, mismatches, warnings, extractedData: { extractedName } };
  }

  private extractNameFromText(text: string): string {
    const patterns = [
      /Name:\s*([A-Za-z\s]+)/i,
      /Full Name:\s*([A-Za-z\s]+)/i,
      /Student Name:\s*([A-Za-z\s]+)/i,
      /Applicant Name:\s*([A-Za-z\s]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  private extractRegistrationNumberFromText(text: string): string {
    const patterns = [
      /Registration Number:\s*([A-Z0-9\-]+)/i,
      /Student ID:\s*([A-Z0-9\-]+)/i,
      /Reg No:\s*([A-Z0-9\-]+)/i,
      /ID Number:\s*([A-Z0-9\-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }
}