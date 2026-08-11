import { randomUUID } from 'crypto';
import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@ApiTags('Storage')
@ApiBearerAuth()

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @AuthenticatedOnly()
  @Post('upload')
  @ApiOperation({ summary: 'Upload a file (max 10MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: process.env.VERCEL ? '/tmp/uploads' : './uploads',
      filename: (req, file, cb) => {
        // Use a UUID as the filename — crypto.randomUUID() is CSPRNG-backed
        const ext = extname(file.originalname);
        cb(null, `${randomUUID()}${ext}`);
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      }
    }
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.storageService.handleFileUpload(file);
  }
}
