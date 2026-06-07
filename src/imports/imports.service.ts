import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, ImportJob, ImportStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { toPaginatedResult, toPrismaPage } from '../common/utils/pagination.util';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportJobResponseDto } from './dto/import-job-response.dto';
import { ImportStatusResponseDto } from './dto/import-status-response.dto';
import { ListImportsDto } from './dto/list-imports.dto';
import { ImportsRepository } from './imports.repository';

@Injectable()
export class ImportsService {
  constructor(
    private readonly importsRepository: ImportsRepository,
    private readonly auditService: AuditService,
  ) {}

  private mapToResponseDto(job: ImportJob): ImportJobResponseDto {
    return {
      id: job.id,
      communityId: job.communityId,
      type: job.type,
      status: job.status,
      originalFileName: job.originalFileName,
      totalRows: job.totalRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
      errorFilePath: job.errorFilePath,
      resultFilePath: job.resultFilePath,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdById: job.createdById,
      createdAt: job.createdAt,
    };
  }

  async createImportJob(dto: CreateImportDto, actorId: string): Promise<ImportJobResponseDto> {
    const job = await this.importsRepository.create({
      type: dto.type,
      originalFileName: dto.originalFileName,
      status: ImportStatus.PENDING,
      createdById: actorId,
    }) as ImportJob;

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'import_jobs',
      recordId: job.id,
      newValues: { type: job.type, originalFileName: job.originalFileName },
    });

    return this.mapToResponseDto(job);
  }

  async listImportJobs(dto: ListImportsDto): Promise<PaginatedResult<ImportJobResponseDto>> {
    const { skip, take } = toPrismaPage(dto);

    const where: Record<string, unknown> = {};
    if (dto.type) {
      where.type = dto.type;
    }
    if (dto.status) {
      where.status = dto.status;
    }

    const [total, jobs] = await Promise.all([
      this.importsRepository.count({ where }),
      this.importsRepository.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return toPaginatedResult(
      (jobs as ImportJob[]).map((job) => this.mapToResponseDto(job)),
      total,
      dto,
    );
  }

  async getJobById(id: string): Promise<ImportJobResponseDto> {
    const job = await this.importsRepository.findById(id) as ImportJob;
    return this.mapToResponseDto(job);
  }

  async getJobStatus(id: string): Promise<ImportStatusResponseDto> {
    const job = await this.importsRepository.findById(id) as ImportJob;
    return {
      status: job.status,
      totalRows: job.totalRows,
      successRows: job.successRows,
      failedRows: job.failedRows,
    };
  }

  async getJobErrors(id: string): Promise<{ errorFilePath: string | null }> {
    const job = await this.importsRepository.findById(id) as ImportJob;
    return { errorFilePath: job.errorFilePath };
  }

  async getJobResult(id: string): Promise<{ resultFilePath: string | null }> {
    const job = await this.importsRepository.findById(id) as ImportJob;
    return { resultFilePath: job.resultFilePath };
  }
}
