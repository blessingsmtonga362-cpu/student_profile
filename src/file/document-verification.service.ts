import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationLog } from '../application/entities/verification-log.entity';

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
        pdfParse = require('pdf-parse');
      } catch (error) {
        console.error('Failed to load pdf-parse:', error);
        pdfParse = async () => ({ text: '' });
      }
    }
  }

  async extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
    try {
      await this.initPdfParse();
      if (!pdfParse) return '';
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

  async extractNamesFromConsentForm(fileBuffer: Buffer): Promise<{
    fatherName?: { firstName: string; lastName: string };
    motherName?: { firstName: string; lastName: string };
    guardianName?: { firstName: string; lastName: string };
    extractedText: string;
  }> {
    const extractedText = await this.extractTextFromPDF(fileBuffer);
    
    const result: any = {
      extractedText,
      fatherName: this.extractPersonName(extractedText, 'father'),
      motherName: this.extractPersonName(extractedText, 'mother'),
      guardianName: this.extractPersonName(extractedText, 'guardian'),
    };
    
    Object.keys(result).forEach(key => {
      if (result[key] === undefined) delete result[key];
    });
    
    return result;
  }

  private extractPersonName(text: string, personType: 'father' | 'mother' | 'guardian'): { firstName: string; lastName: string } | undefined {
    const patterns = {
      father: [
        new RegExp(`Father['']?s\\s+(?:First\\s+)?Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Father['']?s\\s+Full\\s+Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Father:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Parent\\/Father\\s+Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`I,\\s*([A-Za-z]+)\\s+([A-Za-z]+),\\s+father`, 'i'),
      ],
      mother: [
        new RegExp(`Mother['']?s\\s+(?:First\\s+)?Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Mother['']?s\\s+Full\\s+Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Mother:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Parent\\/Mother\\s+Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`I,\\s*([A-Za-z]+)\\s+([A-Za-z]+),\\s+mother`, 'i'),
      ],
      guardian: [
        new RegExp(`Guardian['']?s\\s+(?:First\\s+)?Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Guardian['']?s\\s+Full\\s+Name:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Guardian:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`Legal\\s+Guardian:\\s*([A-Za-z]+)\\s+([A-Za-z]+)`, 'i'),
        new RegExp(`I,\\s*([A-Za-z]+)\\s+([A-Za-z]+),\\s+guardian`, 'i'),
      ],
    };

    const personPatterns = patterns[personType];
    
    for (const pattern of personPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[2]) {
        return {
          firstName: match[1].trim(),
          lastName: match[2].trim(),
        };
      }
    }
    
    return undefined;
  }

  async verifyConsentForm(
    file: any,
    familyData: {
      fatherFirstName?: string;
      fatherSurname?: string;
      motherFirstName?: string;
      motherSurname?: string;
      guardianFirstName?: string;
      guardianSurname?: string;
    },
    userId: string
  ): Promise<{
    isVerified: boolean;
    mismatches: string[];
    warnings: string[];
    extractedData: any;
    matchedWith: string;
  }> {
    const extractedNames = await this.extractNamesFromConsentForm(file.buffer);
    const mismatches: string[] = [];
    const warnings: string[] = [];
    let isVerified = false;
    let matchedWith = '';

    // Check Father
    if (familyData.fatherFirstName && familyData.fatherSurname && extractedNames.fatherName) {
      const firstNameSimilarity = this.calculateSimilarity(
        familyData.fatherFirstName,
        extractedNames.fatherName.firstName
      );
      const lastNameSimilarity = this.calculateSimilarity(
        familyData.fatherSurname,
        extractedNames.fatherName.lastName
      );
      
      if (firstNameSimilarity >= 0.7 && lastNameSimilarity >= 0.7) {
        isVerified = true;
        matchedWith = 'father';
      }
    }

    // Check Mother
    if (!isVerified && familyData.motherFirstName && familyData.motherSurname && extractedNames.motherName) {
      const firstNameSimilarity = this.calculateSimilarity(
        familyData.motherFirstName,
        extractedNames.motherName.firstName
      );
      const lastNameSimilarity = this.calculateSimilarity(
        familyData.motherSurname,
        extractedNames.motherName.lastName
      );
      
      if (firstNameSimilarity >= 0.7 && lastNameSimilarity >= 0.7) {
        isVerified = true;
        matchedWith = 'mother';
      }
    }

    // Check Guardian
    if (!isVerified && familyData.guardianFirstName && familyData.guardianSurname && extractedNames.guardianName) {
      const firstNameSimilarity = this.calculateSimilarity(
        familyData.guardianFirstName,
        extractedNames.guardianName.firstName
      );
      const lastNameSimilarity = this.calculateSimilarity(
        familyData.guardianSurname,
        extractedNames.guardianName.lastName
      );
      
      if (firstNameSimilarity >= 0.7 && lastNameSimilarity >= 0.7) {
        isVerified = true;
        matchedWith = 'guardian';
      }
    }

    if (!isVerified) {
      if (extractedNames.fatherName || extractedNames.motherName || extractedNames.guardianName) {
        mismatches.push('The names on the consent form do not match any of the provided parent or guardian information.');
      } else {
        mismatches.push('Could not extract any names from the consent form. Please ensure the form is clearly filled out.');
      }
    }

    // Log verification
    try {
      const log = this.verificationLogRepository.create({
        userId,
        documentType: 'consent_form',
        isVerified,
        mismatches: JSON.stringify(mismatches),
        warnings: JSON.stringify(warnings),
        userInput: JSON.stringify(familyData),
        extractedData: JSON.stringify(extractedNames),
      });
      await this.verificationLogRepository.save(log);
    } catch (error) {
      console.error('Failed to log verification:', error);
    }

    return {
      isVerified,
      mismatches,
      warnings,
      extractedData: extractedNames,
      matchedWith,
    };
  }
}