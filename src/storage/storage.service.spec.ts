import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate valid static file URL', async () => {
    const mockFile: any = {
      filename: 'test-file.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    };

    const result = await service.handleFileUpload(mockFile);
    expect(result.fileName).toBe('test-file.jpg');
    expect(result.fileUrl).toContain('/uploads/test-file.jpg');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.size).toBe(1024);
  });
});
