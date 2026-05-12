import { Injectable, BadRequestException } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService {
  private readonly uploadDir = 'uploads';

  constructor() {
    this.ensureDirectoryExists(this.uploadDir);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async uploadFile(
    file: any, 
    subFolder: string = 'documents',
    customFilename?: string
  ): Promise<{ url: string; filename: string; originalName: string }> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Create folder structure
    const folderPath = join(this.uploadDir, subFolder);
    this.ensureDirectoryExists(folderPath);

    // Generate filename
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFilename = customFilename 
      ? `${customFilename}-${Date.now()}.${fileExtension}`
      : `${uuidv4()}-${Date.now()}.${fileExtension}`;
    
    const filePath = join(folderPath, uniqueFilename);

    // Save file
    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.write(file.buffer);
      writeStream.end();
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (error) => reject(error));
    });

    // Return URL (relative path for serving static files)
    const url = `/uploads/${subFolder}/${uniqueFilename}`;
    return { 
      url, 
      filename: uniqueFilename, 
      originalName: file.originalname 
    };
  }

  async uploadMultipleFiles(
    files: any[], 
    subFolder: string = 'documents'
  ): Promise<Array<{ url: string; filename: string; originalName: string }>> {
    const uploadPromises = files.map(file => this.uploadFile(file, subFolder));
    return Promise.all(uploadPromises);
  }

  async uploadImageFile(
    file: any,
    subFolder: string = 'images',
    customFilename?: string,
  ): Promise<{ url: string; filename: string; originalName: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
    if (!allowedTypes.has(file.mimetype)) {
      throw new BadRequestException('Only PNG, JPG, JPEG, or WEBP images are allowed');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Image size exceeds 5MB limit');
    }

    const folderPath = join(this.uploadDir, subFolder);
    this.ensureDirectoryExists(folderPath);

    const fileExtension = file.originalname.split('.').pop();
    const uniqueFilename = customFilename
      ? `${customFilename}-${Date.now()}.${fileExtension}`
      : `${uuidv4()}-${Date.now()}.${fileExtension}`;

    const filePath = join(folderPath, uniqueFilename);

    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.write(file.buffer);
      writeStream.end();
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (error) => reject(error));
    });

    const url = `/uploads/${subFolder}/${uniqueFilename}`;
    return {
      url,
      filename: uniqueFilename,
      originalName: file.originalname,
    };
  }
}
