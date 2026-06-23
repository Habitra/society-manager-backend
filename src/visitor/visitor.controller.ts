// src/visitor/visitor.controller.ts
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, HttpCode, HttpStatus, Query, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { VisitorService } from './visitor.service';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import { VisitorRequestResponseDto } from './dto/visitor-request-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ListVisitorsDto } from './dto/list-visitors.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';

@ApiTags('Visitor Requests')
@ApiBearerAuth()
@Controller('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  @Roles(UserRole.RESIDENT, UserRole.GUARD, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a visitor request (Pre-approved or On-Arrival)' })
  @ApiCreatedResponse({ type: VisitorRequestResponseDto })
  async createRequest(
    @Body() dto: CreateVisitorRequestDto,
    @CurrentUser() user: RequestUser,
  ): Promise<VisitorRequestResponseDto> {
    return this.visitorService.createRequest(dto, user.id);
  }

  @Get()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all visitor requests globally' })
  @ApiPaginatedResponse(VisitorRequestResponseDto)
  async getAllVisitors(@Query() dto: ListVisitorsDto) {
    return this.visitorService.listAllVisitors(dto);
  }

  @Get('my')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List visitor history for the current resident' })
  @ApiPaginatedResponse(VisitorRequestResponseDto)
  async getMyRequests(
    @CurrentUser() user: RequestUser,
    @Query() dto: PaginationDto,
  ) {
    return this.visitorService.listResidentRequests(user.id, dto);
  }

  @Get(':id')
  @Roles(UserRole.RESIDENT, UserRole.GUARD, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get visitor request details' })
  @ApiOkResponse({ type: VisitorRequestResponseDto })
  async getRequest(@Param('id', ParseUUIDPipe) id: string): Promise<VisitorRequestResponseDto> {
    return this.visitorService.getRequestById(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.RESIDENT, UserRole.GUARD)
  @ApiOperation({ summary: 'Approve an ON_ARRIVAL visitor request' })
  @ApiOkResponse({ type: VisitorRequestResponseDto })
  async approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<VisitorRequestResponseDto> {
    return this.visitorService.approveOnArrival(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.RESIDENT, UserRole.GUARD)
  @ApiOperation({ summary: 'Reject an ON_ARRIVAL visitor request' })
  @ApiOkResponse({ type: VisitorRequestResponseDto })
  async rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<VisitorRequestResponseDto> {
    return this.visitorService.rejectOnArrival(id, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.RESIDENT, UserRole.COMMUNITY_ADMIN)
  @ApiOperation({ summary: 'Delete a visitor request' })
  @ApiOkResponse({ description: 'Visitor successfully deleted' })
  async deleteVisitor(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.visitorService.deleteRequest(id, user.id);
  }
}
