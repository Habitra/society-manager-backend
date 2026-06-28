import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { AmenityService } from './amenity.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedOnly } from '../auth/decorators/authenticated-only.decorator';

@Controller('amenities')

export class AmenityController {
  constructor(private readonly amenityService: AmenityService) {}

  @Post()
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  create(@Body() createAmenityDto: CreateAmenityDto, @Req() req: any) {
    return this.amenityService.createAmenity(createAmenityDto, req.user.id);
  }

  @AuthenticatedOnly()
  @Get()
  findAll() {
    return this.amenityService.getAmenities();
  }

  @AuthenticatedOnly()
  @Get('reservations')
  findAllReservations() {
    return this.amenityService.getReservations();
  }

  @AuthenticatedOnly()
  @Get('reservations/my')
  findMyReservations(@Req() req: any) {
    return this.amenityService.getMyReservations(req.user.id);
  }

  @AuthenticatedOnly()
  @Get('reservations/calendar')
  getCalendarEvents(@Query('start') start: string, @Query('end') end: string) {
    return this.amenityService.getCalendarEvents(new Date(start), new Date(end));
  }

  @AuthenticatedOnly()
  @Post('reservations')
  createReservation(@Body() createReservationDto: CreateReservationDto, @Req() req: any) {
    return this.amenityService.createReservation(createReservationDto, req.user.id, req.user.id);
  }

  @Patch('reservations/:id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  updateReservation(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto, @Req() req: any) {
    return this.amenityService.updateReservation(id, updateReservationDto, req.user.id);
  }

  @AuthenticatedOnly()
  @Delete('reservations/:id')
  deleteReservation(@Param('id') id: string, @Req() req: any) {
    return this.amenityService.deleteReservation(id, req.user.id);
  }

  @AuthenticatedOnly()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.amenityService.getAmenityById(id);
  }

  @Patch(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  update(@Param('id') id: string, @Body() updateAmenityDto: UpdateAmenityDto, @Req() req: any) {
    return this.amenityService.updateAmenity(id, updateAmenityDto, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.amenityService.deleteAmenity(id, req.user.id);
  }
}
