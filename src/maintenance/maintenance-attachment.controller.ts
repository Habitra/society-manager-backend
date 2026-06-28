import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceAttachmentService } from './maintenance-attachment.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';
import { AuditLog } from '../common/decorators/audit-log.decorator';

@ApiTags('Maintenance Attachments')
@ApiBearerAuth()

@Controller('maintenance/tickets/:id/attachments')
export class MaintenanceAttachmentController {
  constructor(private readonly attachmentService: MaintenanceAttachmentService) {}

  @Post()
  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER, UserRole.STAFF, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @AuditLog({ table: 'maintenance_attachments', action: AuditAction.CREATE })
  @ApiOperation({ summary: 'Add attachment metadata to a ticket' })
  async addAttachment(@Param('id') ticketId: string, @Body() createAttachmentDto: CreateAttachmentDto, @Req() req: any) {
    return this.attachmentService.addAttachment(ticketId, createAttachmentDto, req.user.role);
  }

  @Get()
  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER, UserRole.STAFF, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List attachments for a ticket' })
  async getAttachments(@Param('id') ticketId: string, @Req() req: any) {
    return this.attachmentService.getAttachments(ticketId, req.user.role);
  }
}
