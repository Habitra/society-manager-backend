import { Injectable } from '@nestjs/common';
import * as path from 'path';

@Injectable()
export class StorageService {
  constructor() {}

  // Local storage doesn't need to do much as FileInterceptor handles the saving.
  // This service exists to provide abstraction for future S3 migration.

  async handleFileUpload(file: Express.Multer.File): Promise<{ fileName: string, fileUrl: string, mimeType: string, size: number }> {
    const fileName = file.filename;
    // For localhost dev, hardcoded baseUrl. In prod, read from env.
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/uploads/${fileName}`;

    return {
      fileName,
      fileUrl,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
