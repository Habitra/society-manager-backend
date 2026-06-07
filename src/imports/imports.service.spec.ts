import { Test, TestingModule } from '@nestjs/testing';
import { ImportsService } from './imports.service';
import { ImportsRepository } from './imports.repository';
import { AuditService } from '../audit/audit.service';
import { ImportStatus, ImportType } from '@prisma/client';

describe('ImportsService', () => {
  let service: ImportsService;
  let importsRepository: jest.Mocked<ImportsRepository>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
    };
    const mockAudit = {
      write: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportsService,
        { provide: ImportsRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ImportsService>(ImportsService);
    importsRepository = module.get(ImportsRepository);
    auditService = module.get(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createImportJob', () => {
    it('should create an import job and write an audit log', async () => {
      importsRepository.create.mockResolvedValue({ id: 'job-1', type: ImportType.RESIDENT, originalFileName: 'test.csv' } as any);

      const result = await service.createImportJob({
        type: ImportType.RESIDENT,
        originalFileName: 'test.csv',
      }, 'admin-1');

      expect(result.id).toBe('job-1');
      expect(importsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: ImportType.RESIDENT,
        status: ImportStatus.PENDING,
      }));
      expect(auditService.write).toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    it('should return the job status', async () => {
      importsRepository.findById.mockResolvedValue({ status: ImportStatus.PROCESSING, totalRows: 100, successRows: 50, failedRows: 0 } as any);

      const result = await service.getJobStatus('job-1');
      expect(result.status).toBe(ImportStatus.PROCESSING);
      expect(result.totalRows).toBe(100);
      expect(result.successRows).toBe(50);
    });
  });
});
