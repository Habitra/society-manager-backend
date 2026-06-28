import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceCommentService } from './maintenance-comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';
import { AuditLog } from '../common/decorators/audit-log.decorator';

@ApiTags('Maintenance Comments')
@ApiBearerAuth()

@Controller('maintenance')
export class MaintenanceCommentController {
  constructor(private readonly commentService: MaintenanceCommentService) {}

  @Post('tickets/:id/comments')
  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER, UserRole.STAFF, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @AuditLog({ table: 'maintenance_comments', action: AuditAction.CREATE })
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  async createComment(@Param('id') ticketId: string, @Body() createCommentDto: CreateCommentDto, @Req() req: any) {
    return this.commentService.createComment(ticketId, createCommentDto, req.user.role);
  }

  @Get('tickets/:id/comments')
  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER, UserRole.STAFF, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List comments for a ticket' })
  async getComments(@Param('id') ticketId: string, @Req() req: any) {
    return this.commentService.getComments(ticketId, req.user.role);
  }

  @Patch('comments/:id')
  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER, UserRole.STAFF, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @AuditLog({ table: 'maintenance_comments', action: AuditAction.UPDATE })
  @ApiOperation({ summary: 'Update a comment' })
  async updateComment(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto, @Req() req: any) {
    return this.commentService.updateComment(id, updateCommentDto, req.user.role);
  }

  @Delete('comments/:id')
  @Roles(UserRole.RESIDENT, UserRole.FAMILY_MEMBER, UserRole.STAFF, UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @AuditLog({ table: 'maintenance_comments', action: AuditAction.SOFT_DELETE })
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(@Param('id') id: string, @Req() req: any) {
    return this.commentService.deleteComment(id, req.user.role);
  }
}
