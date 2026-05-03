import { Injectable, BadRequestException } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileService {
  private readonly uploadDir = 'uploads';

  constructor() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: any, subFolder: string = 'documents'): Promise<{ url: string; filename: string }> {
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    const folderPath = join(this.uploadDir, subFolder);
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const fileExtension = file.originalname.split('.').pop();
    const uniqueFilename = `${uuidv4()}-${Date.now()}.${fileExtension}`;
    const filePath = join(folderPath, uniqueFilename);

    // Fix the write stream promise
    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(filePath);
      writeStream.write(file.buffer);
      writeStream.end();
      writeStream.on('finish', () => resolve());
      writeStream.on('error', (error) => reject(error));
    });

    const url = `/${folderPath}/${uniqueFilename}`;
    return { url, filename: file.originalname };
  }

  async uploadMultipleFiles(files: any[], subFolder: string = 'documents'): Promise<Array<{ url: string; filename: string }>> {
    const uploadPromises = files.map(file => this.uploadFile(file, subFolder));
    return Promise.all(uploadPromises);
  }
}