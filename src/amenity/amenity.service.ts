import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AmenityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================
  // AMENITIES
  // ==========================================

  async getAmenities() {
    return this.prisma.amenity.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAmenityById(id: string) {
    const amenity = await this.prisma.amenity.findFirst({
      where: {
        id,
        communityId: this.tenantContext.communityId,
        deletedAt: null,
      },
    });

    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }

  async createAmenity(dto: CreateAmenityDto, actorId: string) {
    const existing = await this.prisma.amenity.findFirst({
      where: { name: dto.name, communityId: this.tenantContext.communityId, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(`Amenity with name ${dto.name} already exists.`);
    }

    const amenity = await this.prisma.amenity.create({
      data: {
        communityId: this.tenantContext.communityId,
        ...dto,
      },
    });

    return amenity;
  }

  async updateAmenity(id: string, dto: UpdateAmenityDto, actorId: string) {
    await this.getAmenityById(id);

    if (dto.name) {
      const existing = await this.prisma.amenity.findFirst({
        where: { name: dto.name, communityId: this.tenantContext.communityId, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Amenity with name ${dto.name} already exists.`);
      }
    }

    const amenity = await this.prisma.amenity.update({
      where: { id },
      data: dto,
    });

    return amenity;
  }

  async deleteAmenity(id: string, actorId: string) {
    await this.getAmenityById(id);

    await this.prisma.amenity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  // ==========================================
  // RESERVATIONS
  // ==========================================

  async getReservations() {
    return this.prisma.amenityReservation.findMany({
      where: {
        communityId: this.tenantContext.communityId,
      },
      include: {
        amenity: true,
        resident: {
          select: { id: true, displayName: true, username: true },
        },
      },
      orderBy: { bookingDate: 'desc' },
    });
  }

  async getMyReservations(residentId: string) {
    return this.prisma.amenityReservation.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        residentId,
      },
      include: {
        amenity: true,
      },
      orderBy: { bookingDate: 'desc' },
    });
  }

  async getCalendarEvents(start: Date, end: Date) {
    return this.prisma.amenityReservation.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        bookingDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        amenity: true,
        resident: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });
  }

  async getReservationById(id: string) {
    const reservation = await this.prisma.amenityReservation.findFirst({
      where: { id, communityId: this.tenantContext.communityId },
      include: {
        amenity: true,
        resident: {
          select: { id: true, displayName: true, username: true },
        },
      },
    });

    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }

  async createReservation(dto: CreateReservationDto, residentId: string, actorId: string) {
    const amenity = await this.getAmenityById(dto.amenityId);

    if (!amenity.bookingEnabled) {
      throw new ConflictException('Booking is currently disabled for this amenity.');
    }

    // Convert strings to Date objects
    // We assume incoming bookingDate is just a date string "YYYY-MM-DD"
    // startTime and endTime are "HH:mm"
    const bookingDateObj = new Date(dto.bookingDate);
    
    // Check overlaps (simplified logic - just check if any approved/pending booking overlaps time)
    // For a robust system, we would parse start/end times and check overlaps.
    // Assuming simple format "HH:mm"
    
    const existingReservations = await this.prisma.amenityReservation.findMany({
      where: {
        amenityId: dto.amenityId,
        communityId: this.tenantContext.communityId,
        bookingDate: bookingDateObj,
        status: { in: [ReservationStatus.APPROVED, ReservationStatus.PENDING] }
      }
    });

    const hasOverlap = existingReservations.some(r => {
      const rStart = r.startTime.toISOString().substr(11, 5); // get HH:mm
      const rEnd = r.endTime.toISOString().substr(11, 5);
      
      // If new start is before existing end AND new end is after existing start
      return (dto.startTime < rEnd && dto.endTime > rStart);
    });

    if (hasOverlap && amenity.capacity === 1) {
       throw new ConflictException('Time slot is already booked.');
    }

    // Convert HH:mm to full Date objects for Postgres Time columns
    // We'll use a dummy date for time columns
    const startObj = new Date(`1970-01-01T${dto.startTime}:00Z`);
    const endObj = new Date(`1970-01-01T${dto.endTime}:00Z`);

    const reservation = await this.prisma.amenityReservation.create({
      data: {
        communityId: this.tenantContext.communityId,
        amenityId: dto.amenityId,
        residentId,
        bookingDate: bookingDateObj,
        startTime: startObj,
        endTime: endObj,
        status: amenity.autoApprove ? ReservationStatus.APPROVED : ReservationStatus.PENDING,
        notes: dto.notes,
      },
      include: {
        amenity: true,
      }
    });

    return reservation;
  }

  async updateReservation(id: string, dto: UpdateReservationDto, actorId: string) {
    const reservation = await this.getReservationById(id);

    const updated = await this.prisma.amenityReservation.update({
      where: { id },
      data: dto,
      include: {
        amenity: true,
        resident: {
          select: { id: true, displayName: true, username: true },
        },
      }
    });

    return updated;
  }

  async deleteReservation(id: string, actorId: string) {
    await this.getReservationById(id);

    await this.prisma.amenityReservation.delete({
      where: { id },
    });

    return { success: true };
  }
}
