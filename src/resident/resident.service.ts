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
      role: user.role,
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
        verificationStage: user.residentProfile!.verificationStage as any,
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

    // Owner Validation Rule
    if (dto.occupancyType === OccupancyType.OWNER_RESIDENT || dto.occupancyType === OccupancyType.OWNER_NON_RESIDENT) {
      const existingOwner = await this.prisma.residentUnitAssignment.findFirst({
        where: {
          communityId,
          unitId: dto.unitId,
          occupancyType: { in: [OccupancyType.OWNER_RESIDENT, OccupancyType.OWNER_NON_RESIDENT] },
          deletedAt: null,
        }
      });
      if (existingOwner) {
        throw new ConflictException(`Unit ${unit.unitNumber} already has an active owner.`);
      }
    }

    const tempPassword = this.generateSecureTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    const createdResident = await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.findUniqueOrThrow({ where: { id: communityId } });
      
      const currentYear = new Date().getFullYear().toString();
      const seq = await tx.usernameSequence.upsert({
        where: { communityId_userType: { communityId, userType: 'RESIDENT' } },
        update: { nextValue: { increment: 1 } },
        create: { communityId, userType: 'RESIDENT', nextValue: 2 },
      });

      const sequenceString = (seq.nextValue - 1).toString().padStart(4, '0');
      const username = `RES${currentYear}${sequenceString}`;

      const emergencyContact = {
        name: dto.emergencyContactName,
        phone: dto.emergencyContactNumber,
        relation: dto.emergencyContactRelation,
      };

      const user = await tx.user.create({
        data: {
          communityId,
          role: UserRole.RESIDENT,
          status: UserStatus.PENDING_VERIFICATION,
          username,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          displayName: dto.fullName,
          firstLoginCompleted: false,
          mustChangePassword: true,
          residentProfile: {
            create: {
              communityId,
              emergencyContact,
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
      newValues: { event: 'Resident Registered', username: createdResident.username, email: createdResident.email },
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'resident_unit_assignments',
      recordId: createdResident.id,
      newValues: { event: 'Unit Assigned', unitId: dto.unitId, occupancyType: dto.occupancyType },
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'users',
      recordId: createdResident.id,
      newValues: { event: 'Credentials Generated', action: 'Initial Setup' },
    });

    return {
      resident: this.mapResidentToDto(createdResident as ResidentWithRelations),
      credentials: {
        username: createdResident.username,
        temporaryPassword: tempPassword,
      },
    };
  }

  private generateSecureTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    const allChars = uppercase + lowercase + numbers + special;
    while (password.length < 12) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  async resetPassword(id: string, actorId: string): Promise<{ temporaryPassword: string }> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    const tempPassword = this.generateSecureTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { event: 'Password Reset', action: 'Generated New Temporary Password' },
    });

    return { temporaryPassword: tempPassword };
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

    if (dto.verificationStage) {
      where.residentProfile = {
        verificationStage: dto.verificationStage as any,
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
    if (dto.fullName) {
      displayName = dto.fullName.trim();
    }

    const updated = await this.residentRepository.update(id, {
      ...(dto.email ? { email: dto.email } : {}),
      ...(dto.phone ? { phone: dto.phone } : {}),
      ...(dto.fullName ? { displayName } : {}),
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

    const tempPassword = this.generateSecureTemporaryPassword();
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
    const displayName = dto.fullName.trim();

    const createdFamilyMember = await this.prisma.$transaction(async (tx) => {
      const community = await tx.community.findUniqueOrThrow({ where: { id: this.tenantContext.communityId } });
      const currentYear = new Date().getFullYear().toString();
      const seq = await tx.usernameSequence.upsert({
        where: { communityId_userType: { communityId: this.tenantContext.communityId, userType: 'FAMILY_MEMBER' } },
        update: { nextValue: { increment: 1 } },
        create: { communityId: this.tenantContext.communityId, userType: 'FAMILY_MEMBER', nextValue: 2 },
      });

      const sequenceString = (seq.nextValue - 1).toString().padStart(4, '0');
      const username = `RES${currentYear}${sequenceString}`;

      const user = await tx.user.create({
        data: {
          communityId: this.tenantContext.communityId,
          role: UserRole.FAMILY_MEMBER,
          status: UserStatus.PENDING_VERIFICATION,
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



  // ===========================================================================
  // RESIDENT OPERATIONS CENTER (PHASES 2-12)
  // ===========================================================================

  async getDashboardMetrics(): Promise<any> {
    const communityId = this.tenantContext.communityId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [
      totalResidents,
      owners,
      tenants,
      suspendedAccounts,
      vacantUnits,
      pendingVerification,
      recentlyMovedIn,
      recentlyMovedOut
    ] = await Promise.all([
      this.prisma.user.count({ where: { communityId, role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] }, deletedAt: null } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, occupancyType: { in: [OccupancyType.OWNER_RESIDENT, OccupancyType.OWNER_NON_RESIDENT] }, deletedAt: null, moveOutDate: null } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, occupancyType: OccupancyType.TENANT, deletedAt: null, moveOutDate: null } }),
      this.prisma.user.count({ where: { communityId, role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] }, status: UserStatus.SUSPENDED, deletedAt: null } }),
      this.prisma.unit.count({ where: { communityId, occupancy: 'VACANT', deletedAt: null } }),
      this.prisma.residentProfile.count({ where: { communityId, verificationStage: 'PENDING' } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, deletedAt: null, moveInDate: { gte: thirtyDaysAgo } } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, moveOutDate: { gte: thirtyDaysAgo } } })
    ]);

    return {
      totalResidents,
      owners,
      tenants,
      vacantUnits,
      pendingVerification,
      suspendedAccounts,
      recentlyMovedIn,
      recentlyMovedOut
    };
  }

  async updateVerificationStage(id: string, stage: 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW', actorId: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    await this.prisma.residentProfile.update({
      where: { userId: id },
      data: { verificationStage: stage as any }
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'resident_profiles',
      recordId: user.residentProfile!.id,
      newValues: { verificationStage: stage },
    });

    return this.mapResidentToDto(await this.residentRepository.findResidentById(id) as ResidentWithRelations);
  }

  async sendOnboardingOtp(id: string, actorId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    // Reusing PasswordResetOtp as instructed
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.passwordResetOtp.create({
      data: {
        communityId: this.tenantContext.communityId,
        phone: user.phone,
        otpHash,
        expiresAt,
      }
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.CREATE,
      tableName: 'password_reset_otps',
      recordId: user.id, // Using user ID as reference
      newValues: { purpose: 'ONBOARDING_OTP', phone: user.phone },
    });

    // In a real system, send SMS here. For now, we simulate it.
    console.log(`[ONBOARDING OTP] Sent ${otp} to ${user.phone}`);
    return { success: true, message: 'OTP Sent successfully' };
  }

  async verifyOnboardingOtp(id: string, otp: string, actorId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    const latestOtp = await this.prisma.passwordResetOtp.findFirst({
      where: { phone: user.phone, isUsed: false, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    });

    if (!latestOtp) throw new NotFoundException('No active OTP found or OTP expired');

    const isValid = await bcrypt.compare(otp, latestOtp.otpHash);
    if (!isValid) throw new ConflictException('Invalid OTP');

    await this.prisma.$transaction([
      this.prisma.passwordResetOtp.update({
        where: { id: latestOtp.id },
        data: { isUsed: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE },
      })
    ]);

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: user.id,
      newValues: { status: UserStatus.ACTIVE, onboardingCompleted: true },
    });

    return { success: true, message: 'OTP Verified successfully. Resident is now Active.' };
  }

  async getOccupancy(): Promise<any[]> {
    const assignments = await this.prisma.residentUnitAssignment.findMany({
      where: { communityId: this.tenantContext.communityId, deletedAt: null },
      include: {
        user: { select: { id: true, displayName: true, phone: true, role: true } },
        unit: { include: { tower: true } }
      },
      orderBy: { unit: { unitNumber: 'asc' } }
    });
    return assignments;
  }

  async getVehicles(): Promise<any[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { communityId: this.tenantContext.communityId, deletedAt: null, user: { role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] } } },
      include: {
        user: { select: { id: true, displayName: true, phone: true } },
        unit: { include: { tower: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return vehicles;
  }

  async suspendAccess(id: string, actorId: string, reason?: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    await this.residentRepository.update(id, { status: UserStatus.SUSPENDED });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { status: UserStatus.SUSPENDED, reason },
    });

    return this.mapResidentToDto(await this.residentRepository.findResidentById(id) as ResidentWithRelations);
  }

  async restoreAccess(id: string, actorId: string, reason?: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    await this.residentRepository.update(id, { status: UserStatus.ACTIVE });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { status: UserStatus.ACTIVE, reason },
    });

    return this.mapResidentToDto(await this.residentRepository.findResidentById(id) as ResidentWithRelations);
  }

  async processHandover(unitId: string, currentOwnerId: string, newOwnerId: string, actorId: string): Promise<{ success: boolean }> {
    const communityId = this.tenantContext.communityId;

    await this.prisma.$transaction(async (tx) => {
      // 1. Move out current owner
      await tx.residentUnitAssignment.updateMany({
        where: { unitId, userId: currentOwnerId, communityId, deletedAt: null },
        data: { moveOutDate: new Date(), deletedAt: new Date() }
      });

      // 2. Clear vehicles linked to the unit and current owner
      await tx.vehicle.updateMany({
        where: { unitId, userId: currentOwnerId, communityId, deletedAt: null },
        data: { deletedAt: new Date() }
      });

      // 3. Add new owner
      await tx.residentUnitAssignment.create({
        data: {
          communityId,
          userId: newOwnerId,
          unitId,
          occupancyType: OccupancyType.OWNER_RESIDENT,
          isPrimary: true,
          moveInDate: new Date()
        }
      });
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'units',
      recordId: unitId,
      newValues: { event: 'HANDOVER_COMPLETED', from: currentOwnerId, to: newOwnerId },
    });

    return { success: true };
  }

  async getResidentAuditTrail(id: string): Promise<any[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        communityId: this.tenantContext.communityId,
        OR: [
          { recordId: id }, // Direct updates to user
          { oldValues: { string_contains: id } as any },
          { newValues: { string_contains: id } as any }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return logs;
  }

  async getAnalytics(): Promise<any> {
    const communityId = this.tenantContext.communityId;
    
    // Group by Occupancy Type
    const occupancyData = await this.prisma.residentUnitAssignment.groupBy({
      by: ['occupancyType'],
      where: { communityId, deletedAt: null },
      _count: { id: true }
    });

    return {
      occupancyTrend: occupancyData.map(d => ({ name: d.occupancyType, count: d._count.id }))
    };
  }
}
