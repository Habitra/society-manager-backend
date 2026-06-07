import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { ImportsService } from './imports.service';
import { CreateImportDto } from './dto/create-import.dto';
import { ImportJobResponseDto } from './dto/import-job-response.dto';
import { ImportStatusResponseDto } from './dto/import-status-response.dto';
import { ListImportsDto } from './dto/list-imports.dto';

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new bulk import job' })
  @ApiCreatedResponse({ type: ImportJobResponseDto })
  async createImportJob(
    @Body() dto: CreateImportDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ImportJobResponseDto> {
    return this.importsService.createImportJob(dto, user.id);
  }

  @Get()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List import jobs with pagination and filtering' })
  async listImportJobs(@Query() dto: ListImportsDto): Promise<PaginatedResult<ImportJobResponseDto>> {
    return this.importsService.listImportJobs(dto);
  }

  @Get(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get full details of an import job by ID' })
  @ApiOkResponse({ type: ImportJobResponseDto })
  async getJobById(@Param('id', ParseUUIDPipe) id: string): Promise<ImportJobResponseDto> {
    return this.importsService.getJobById(id);
  }

  @Get(':id/status')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get current status of an import job' })
  @ApiOkResponse({ type: ImportStatusResponseDto })
  async getJobStatus(@Param('id', ParseUUIDPipe) id: string): Promise<ImportStatusResponseDto> {
    return this.importsService.getJobStatus(id);
  }

  @Get(':id/errors')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get the error file path for a failed/partial import' })
  async getJobErrors(@Param('id', ParseUUIDPipe) id: string): Promise<{ errorFilePath: string | null }> {
    return this.importsService.getJobErrors(id);
  }

  @Get(':id/result')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get the result file path for a completed import' })
  async getJobResult(@Param('id', ParseUUIDPipe) id: string): Promise<{ resultFilePath: string | null }> {
    return this.importsService.getJobResult(id);
  }
}
