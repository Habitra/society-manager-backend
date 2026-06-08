import { 
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new announcement' })
  create(@Req() req: any, @Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.announcementService.create(
      req.user.communityId, 
      req.user.id, 
      createAnnouncementDto
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get tailored announcement feed for the current user' })
  findMyFeed(@Req() req: any) {
    return this.announcementService.findMyFeed(
      req.user.communityId, 
      req.user.id,
      req.user.role
    );
  }

  @Get()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all announcements (Admin)' })
  findAll(@Req() req: any) {
    return this.announcementService.findAll(req.user.communityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an announcement by id' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.announcementService.findOne(req.user.communityId, id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update an announcement' })
  update(@Req() req: any, @Param('id') id: string, @Body() updateAnnouncementDto: UpdateAnnouncementDto) {
    return this.announcementService.update(req.user.communityId, id, updateAnnouncementDto);
  }

  @Post(':id/publish')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Publish an announcement' })
  publish(@Req() req: any, @Param('id') id: string) {
    return this.announcementService.publish(req.user.communityId, id);
  }

  @Post(':id/archive')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Archive an announcement' })
  archive(@Req() req: any, @Param('id') id: string) {
    return this.announcementService.archive(req.user.communityId, id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark an announcement as read' })
  markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.announcementService.markAsRead(req.user.communityId, id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete an announcement' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.announcementService.remove(req.user.communityId, id);
  }
}
