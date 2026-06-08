import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { ResidentRepository, ResidentWithRelations } from './resident.repository';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { AddFamilyMemberDto } from './dto/add-family-member.dto';
import { ReassignUnitDto } from './dto/reassign-unit.dto';
import { ListResidentsDto } from './dto/list-residents.dto';
import { ResidentCredentialsResponseDto, ResidentResponseDto } from './dto/resident-response.dto';
import { AuditAction, OccupancyType, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { toPrismaPage, toPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ResidentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly residentRepository: ResidentRepository,
  ) {}

  private generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < 10; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  private mapResidentToDto(user: ResidentWithRelations): ResidentResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      status: user.status,
      firstLoginCompleted: user.firstLoginCompleted,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: {
        id: user.residentProfile!.id,
        occupation: user.residentProfile!.occupation,
        dateOfBirth: user.residentProfile!.dateOfBirth,
        vehicleCount: user.residentProfile!.vehicleCount,
        isCommitteeMember: user.residentProfile!.isCommitteeMember,
      },
      assignedUnits: user.residentAssignments.map(a => ({
        unitId: a.unitId,
        unitNumber: a.unit.unitNumber,
        towerName: a.unit.tower?.name,
        occupancyType: a.occupancyType,
        isPrimary: a.isPrimary,
      })),
    };
  }

  async createResident(dto: CreateResidentDto, actorId: string): Promise<ResidentCredentialsResponseDto> {
    const communityId = this.tenantContext.communityId;

    if (await this.residentRepository.emailExists(dto.email)) {
      throw new ConflictException(`Email '${dto.email}' is already in use in this community.`);
    }

    if (await this.residentRepository.phoneExists(dto.phone)) {
      throw new ConflictException(`Phone number '${dto.phone}' is already in use in this community.`);
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, communityId, deletedAt: null },
    });

    if (!unit) {
      throw new NotFoundException(`Unit '${dto.unitId}' not found in this community.`);
    }

    const tempPassword = this.generateTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    const displayName = `${dto.firstName} ${dto.lastName}`.trim();

    const createdResident = await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.findUniqueOrThrow({ where: { id: communityId } });
      const seq = await tx.usernameSequence.upsert({
        where: { communityId_userType: { communityId, userType: 'RESIDENT' } },
        update: { nextValue: { increment: 1 } },
        create: { communityId, userType: 'RESIDENT', nextValue: 2 },
      });

      const sequenceString = (seq.nextValue - 1).toString().padStart(6, '0');
      const username = `${community.code}-${sequenceString}`;

      const user = await tx.user.create({
        data: {
          communityId,
          role: UserRole.RESIDENT,
          status: UserStatus.ACTIVE, // Assuming active but requires password change
          username,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          displayName,
          firstLoginCompleted: false,
          mustChangePassword: true,
          residentProfile: {
            create: {
              communityId,
            },
          },
          residentAssignments: {
            create: {
              communityId,
              unitId: dto.unitId,
              occupancyType: dto.occupancyType,
              isPrimary: dto.isPrimaryResident ?? false,
            },
          },
        },
        include: {
          residentProfile: true,
          residentAssignments: {
            include: { unit: { include: { tower: true } } },
          },
        },
      });

      return user;
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'users',
      recordId: createdResident.id,
      newValues: { username: createdResident.username, email: createdResident.email },
    });

    return {
      resident: this.mapResidentToDto(createdResident as ResidentWithRelations),
      credentials: {
        username: createdResident.username,
        temporaryPassword: tempPassword,
      },
    };
  }

  async listResidents(dto: ListResidentsDto): Promise<PaginatedResult<ResidentResponseDto>> {
    const { skip, take } = toPrismaPage(dto);

    const where: Prisma.UserWhereInput = {
      communityId: this.tenantContext.communityId,
      role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] },
      deletedAt: null,
    };

    if (dto.search) {
      where.OR = [
        { displayName: { contains: dto.search, mode: 'insensitive' } },
        { username: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.phone) {
      where.phone = dto.phone;
    }

    if (dto.isActive !== undefined) {
      where.status = dto.isActive ? UserStatus.ACTIVE : { not: UserStatus.ACTIVE };
    }

    if (dto.firstLoginPending !== undefined) {
      where.firstLoginCompleted = !dto.firstLoginPending;
    }

    if (dto.unitId || dto.towerId || dto.occupancyType) {
      where.residentAssignments = {
        some: {
          deletedAt: null,
          ...(dto.unitId ? { unitId: dto.unitId } : {}),
          ...(dto.occupancyType ? { occupancyType: dto.occupancyType } : {}),
          ...(dto.towerId ? { unit: { towerId: dto.towerId } } : {}),
        },
      };
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { displayName: 'asc' }, // Sorting by name by default
        include: {
          residentProfile: true,
          residentAssignments: {
            where: { deletedAt: null },
            include: { unit: { include: { tower: true } } },
          },
        },
      }),
    ]);

    return toPaginatedResult(
      (users as ResidentWithRelations[]).map(u => this.mapResidentToDto(u)),
      total,
      dto
    );
  }

  async getResidentById(id: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) {
      throw new NotFoundException(`Resident '${id}' not found.`);
    }
    return this.mapResidentToDto(user);
  }

  async updateResident(id: string, dto: UpdateResidentDto, actorId: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    if (dto.email && dto.email !== user.email) {
      if (await this.residentRepository.emailExists(dto.email)) {
        throw new ConflictException(`Email '${dto.email}' is already in use.`);
      }
    }

    if (dto.phone && dto.phone !== user.phone) {
      if (await this.residentRepository.phoneExists(dto.phone)) {
        throw new ConflictException(`Phone number '${dto.phone}' is already in use.`);
      }
    }

    let displayName = user.displayName;
    if (dto.firstName || dto.lastName) {
      // Very naive split for simplicity; typically you'd want actual firstName/lastName fields
      const parts = user.displayName.split(' ');
      const currentFirst = parts[0] || '';
      const currentLast = parts.slice(1).join(' ') || '';
      displayName = `${dto.firstName ?? currentFirst} ${dto.lastName ?? currentLast}`.trim();
    }

    const updated = await this.residentRepository.update(id, {
      ...(dto.email ? { email: dto.email } : {}),
      ...(dto.phone ? { phone: dto.phone } : {}),
      ...(dto.firstName || dto.lastName ? { displayName } : {}),
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { email: dto.email, phone: dto.phone, displayName },
    });

    return this.mapResidentToDto(await this.residentRepository.findResidentById(id) as ResidentWithRelations);
  }

  async addFamilyMember(id: string, dto: AddFamilyMemberDto, actorId: string): Promise<ResidentCredentialsResponseDto> {
    const primaryResident = await this.residentRepository.findResidentById(id);
    if (!primaryResident) throw new NotFoundException(`Primary Resident '${id}' not found.`);

    if (dto.email && await this.residentRepository.emailExists(dto.email)) {
      throw new ConflictException(`Email '${dto.email}' is already in use.`);
    }

    if (await this.residentRepository.phoneExists(dto.phone)) {
      throw new ConflictException(`Phone number '${dto.phone}' is already in use.`);
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, communityId: this.tenantContext.communityId, deletedAt: null },
    });

    if (!unit) {
      throw new NotFoundException(`Unit '${dto.unitId}' not found.`);
    }

    const tempPassword = this.generateTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
    const displayName = `${dto.firstName} ${dto.lastName}`.trim();

    const createdFamilyMember = await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.findUniqueOrThrow({ where: { id: this.tenantContext.communityId } });
      const seq = await tx.usernameSequence.upsert({
        where: { communityId_userType: { communityId: this.tenantContext.communityId, userType: 'FAMILY_MEMBER' } },
        update: { nextValue: { increment: 1 } },
        create: { communityId: this.tenantContext.communityId, userType: 'FAMILY_MEMBER', nextValue: 2 },
      });

      const sequenceString = (seq.nextValue - 1).toString().padStart(6, '0');
      const username = `${community.code}-FAM-${sequenceString}`;

      const user = await tx.user.create({
        data: {
          communityId: this.tenantContext.communityId,
          role: UserRole.FAMILY_MEMBER,
          status: UserStatus.ACTIVE,
          username,
          email: dto.email || `${username}@placeholder.com`, // Email is unique and required in schema
          phone: dto.phone,
          passwordHash,
          displayName,
          firstLoginCompleted: false,
          mustChangePassword: true,
          residentProfile: {
            create: {
              communityId: this.tenantContext.communityId,
            },
          },
          residentAssignments: {
            create: {
              communityId: this.tenantContext.communityId,
              unitId: dto.unitId,
              occupancyType: OccupancyType.OWNER_RESIDENT, // Defaulting to owner resident for family, could be tenant
              isPrimary: false,
            },
          },
        },
        include: {
          residentProfile: true,
          residentAssignments: {
            include: { unit: { include: { tower: true } } },
          },
        },
      });

      return user;
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'users',
      recordId: createdFamilyMember.id,
      newValues: { username: createdFamilyMember.username, email: createdFamilyMember.email, role: 'FAMILY_MEMBER' },
    });

    return {
      resident: this.mapResidentToDto(createdFamilyMember as ResidentWithRelations),
      credentials: {
        username: createdFamilyMember.username,
        temporaryPassword: tempPassword,
      },
    };
  }

  async reassignUnit(id: string, dto: ReassignUnitDto, actorId: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    const newUnit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, communityId: this.tenantContext.communityId, deletedAt: null },
    });

    if (!newUnit) throw new NotFoundException(`Unit '${dto.unitId}' not found.`);

    // Deactivate previous assignment(s) and create a new one
    await this.prisma.$transaction(async (tx) => {
      // Soft delete current active assignments
      await tx.residentUnitAssignment.updateMany({
        where: { userId: id, communityId: this.tenantContext.communityId, deletedAt: null },
        data: { deletedAt: new Date(), moveOutDate: new Date() },
      });

      // Create new assignment
      await tx.residentUnitAssignment.create({
        data: {
          communityId: this.tenantContext.communityId,
          userId: id,
          unitId: dto.unitId,
          occupancyType: user.residentAssignments[0]?.occupancyType || OccupancyType.OWNER_RESIDENT,
          isPrimary: true, // Assuming reassignment makes them primary
          moveInDate: new Date(),
        },
      });
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'resident_unit_assignments',
      recordId: id,
      newValues: { newUnitId: dto.unitId },
    });

    return this.mapResidentToDto(await this.residentRepository.findResidentById(id) as ResidentWithRelations);
  }

  async activateResident(id: string, actorId: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    const updated = await this.residentRepository.update(id, { status: UserStatus.ACTIVE });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { status: UserStatus.ACTIVE },
    });

    user.status = UserStatus.ACTIVE;
    return this.mapResidentToDto(user);
  }

  async deactivateResident(id: string, actorId: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    const updated = await this.residentRepository.update(id, { status: UserStatus.INACTIVE });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { status: UserStatus.INACTIVE },
    });

    user.status = UserStatus.INACTIVE;
    return this.mapResidentToDto(user);
  }

  async resetPassword(id: string, actorId: string): Promise<{ temporaryPassword: string }> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    const tempPassword = this.generateTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    await this.residentRepository.update(id, {
      passwordHash,
      mustChangePassword: true,
      refreshTokenHash: null,
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { mustChangePassword: true },
    });

    return { temporaryPassword: tempPassword };
  }
}
