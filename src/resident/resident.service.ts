import { randomBytes, randomInt } from 'crypto';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { ResidentRepository, ResidentWithRelations } from './resident.repository';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { AddFamilyMemberDto } from './dto/add-family-member.dto';
import { ReassignUnitDto } from './dto/reassign-unit.dto';
import { UpdateResidentAccessDto, AccessAction } from './dto/update-resident-access.dto';
import { ListResidentsDto } from './dto/list-residents.dto';
import { ResidentCredentialsResponseDto, ResidentResponseDto } from './dto/resident-response.dto';
import { AuditAction, OccupancyType, Prisma, UserRole, UserStatus, VerificationStage } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginatedResult } from '../common/dto/api-response.dto';
import { toPrismaPage, toPaginatedResult } from '../common/utils/pagination.util';

@Injectable()
export class ResidentService {
  private readonly logger = new Logger(ResidentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly residentRepository: ResidentRepository,
  ) {}

  /**
   * Generates a cryptographically secure temporary password.
   *
   * Uses crypto.randomBytes() for character selection, ensuring uniform distribution
   * backed by the OS CSPRNG. Shuffles with a Fisher-Yates algorithm (also CSPRNG-backed)
   * to prevent any positional bias.
   *
   * Output: 12-character string guaranteed to contain at least one uppercase,
   * one lowercase, one digit, and one special character.
   */
  private generateTemporaryPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;

    // Guarantee at least one character from each required class
    const chars: string[] = [
      uppercase[randomInt(uppercase.length)],
      lowercase[randomInt(lowercase.length)],
      numbers[randomInt(numbers.length)],
      special[randomInt(special.length)],
    ];

    // Fill remaining positions to reach length 12
    while (chars.length < 12) {
      chars.push(allChars[randomInt(allChars.length)]);
    }

    // Fisher-Yates shuffle using crypto.randomBytes() for index selection
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomBytes(1)[0] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
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
      mustChangePassword: user.mustChangePassword,
      lockedUntil: user.lockedUntil,
      failedLoginAttempts: user.failedLoginAttempts,
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

  /**
   * @deprecated Alias for generateTemporaryPassword().
   * Kept to avoid renaming 3 call sites in this release.
   * All callers will be migrated to generateTemporaryPassword() in a future cleanup.
   */
  private generateSecureTemporaryPassword(): string {
    return this.generateTemporaryPassword();
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
        firstLoginCompleted: false,
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
        const stages = dto.verificationStage.split(',').map(s => s.trim() as VerificationStage);
        where.residentProfile = {
          ...(where.residentProfile as any),
          verificationStage: { in: stages },
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

    await this.prisma.$transaction(async (tx) => {
      let displayName = user.displayName;
      if (dto.fullName) {
        displayName = dto.fullName.trim();
      }

      await tx.user.update({
        where: { id },
        data: {
          ...(dto.email ? { email: dto.email } : {}),
          ...(dto.phone ? { phone: dto.phone } : {}),
          ...(dto.fullName ? { displayName } : {}),
          ...(dto.role ? { role: dto.role } : {}),
        }
      });

      if (dto.verificationStage && user.residentProfile) {
        await tx.residentProfile.update({
          where: { id: user.residentProfile.id },
          data: { verificationStage: dto.verificationStage }
        });
      }

      if (dto.unitId || dto.occupancyType || dto.isPrimary !== undefined) {
        const existingAssignment = await tx.residentUnitAssignment.findFirst({
           where: { userId: id, communityId: this.tenantContext.communityId, deletedAt: null },
           orderBy: { isPrimary: 'desc' }
        });

        if (existingAssignment) {
           // Validate if changing to owner and unit already has an owner
           if (dto.occupancyType && (dto.occupancyType === OccupancyType.OWNER_RESIDENT || dto.occupancyType === OccupancyType.OWNER_NON_RESIDENT)) {
             const existingOwner = await tx.residentUnitAssignment.findFirst({
               where: {
                 communityId: this.tenantContext.communityId,
                 unitId: dto.unitId || existingAssignment.unitId,
                 occupancyType: { in: [OccupancyType.OWNER_RESIDENT, OccupancyType.OWNER_NON_RESIDENT] },
                 deletedAt: null,
                 id: { not: existingAssignment.id }
               }
             });
             if (existingOwner) {
               throw new ConflictException(`Unit already has an active owner.`);
             }
           }

           await tx.residentUnitAssignment.update({
             where: { id: existingAssignment.id },
             data: {
               ...(dto.unitId ? { unitId: dto.unitId } : {}),
               ...(dto.occupancyType ? { occupancyType: dto.occupancyType } : {}),
               ...(dto.isPrimary !== undefined ? { isPrimary: dto.isPrimary } : {}),
             }
           });
        }
      }
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { event: 'Resident Full Update', dto },
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
      recentlyMovedOut,
      totalUnits
    ] = await Promise.all([
      this.prisma.user.count({ where: { communityId, role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] }, deletedAt: null } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, occupancyType: { in: [OccupancyType.OWNER_RESIDENT, OccupancyType.OWNER_NON_RESIDENT] }, deletedAt: null, moveOutDate: null } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, occupancyType: OccupancyType.TENANT, deletedAt: null, moveOutDate: null } }),
      this.prisma.user.count({ where: { communityId, role: { in: [UserRole.RESIDENT, UserRole.FAMILY_MEMBER] }, status: UserStatus.SUSPENDED, deletedAt: null } }),
      this.prisma.unit.count({ where: { communityId, occupancy: 'VACANT', deletedAt: null } }),
      this.prisma.residentProfile.count({ where: { communityId, verificationStage: 'PENDING' } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, deletedAt: null, moveInDate: { gte: thirtyDaysAgo } } }),
      this.prisma.residentUnitAssignment.count({ where: { communityId, moveOutDate: { gte: thirtyDaysAgo } } }),
      this.prisma.unit.count({ where: { communityId, deletedAt: null } })
    ]);

    const occupiedUnits = totalUnits - vacantUnits;

    return {
      totalResidents,
      owners,
      tenants,
      vacantUnits,
      occupiedUnits,
      pendingVerification,
      suspendedAccounts,
      recentlyMovedIn,
      recentlyMovedOut
    };
  }

  async getTenantVerificationQueue(dto: ListResidentsDto): Promise<PaginatedResult<ResidentResponseDto>> {
    const queueDto = { ...dto, verificationStage: 'PENDING,UNDER_REVIEW' };
    return this.listResidents(queueDto);
  }

  async getTenantVerificationHistory(dto: ListResidentsDto): Promise<PaginatedResult<ResidentResponseDto>> {
    const historyDto = { ...dto, verificationStage: dto.verificationStage || 'APPROVED,REJECTED' };
    return this.listResidents(historyDto);
  }

  async getTenantVerificationMetrics(): Promise<any> {
    const communityId = this.tenantContext.communityId;
    
    const [
      pendingVerification,
      underReview,
      approved,
      rejected
    ] = await Promise.all([
      this.prisma.residentProfile.count({ where: { communityId, verificationStage: 'PENDING' } }),
      this.prisma.residentProfile.count({ where: { communityId, verificationStage: 'UNDER_REVIEW' } }),
      this.prisma.residentProfile.count({ where: { communityId, verificationStage: 'APPROVED' } }),
      this.prisma.residentProfile.count({ where: { communityId, verificationStage: 'REJECTED' } })
    ]);

    return {
      pendingVerification,
      underReview,
      approved,
      rejected
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
    const otp = randomInt(100000, 1000000).toString(); // crypto.randomInt is CSPRNG-backed
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
    // OTP value is intentionally NOT logged. Retrieve from DB (password_reset_otps) for local testing.
    this.logger.debug(`Onboarding OTP created for resident userId=${user.id}`);
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
    const units = await this.prisma.unit.findMany({
      where: { communityId: this.tenantContext.communityId, deletedAt: null },
      include: {
        tower: true,
        residentAssignments: {
          where: { deletedAt: null },
          include: {
            user: {
              include: { residentProfile: true }
            }
          }
        }
      },
      orderBy: { unitNumber: 'asc' }
    });

    return units.map(unit => {
      const primaryAssignment = unit.residentAssignments.find(a => a.isPrimary) || unit.residentAssignments[0];
      const primaryUser = primaryAssignment?.user;

      return {
        unitId: unit.id,
        tower: unit.tower?.name || '-',
        unitNumber: unit.unitNumber,
        occupancyStatus: unit.occupancy,
        primaryResidentId: primaryUser?.id || null,
        primaryResident: primaryUser?.displayName || '-',
        username: primaryUser?.username || '-',
        phone: primaryUser?.phone || '-',
        residentType: primaryAssignment?.occupancyType || '-',
        numberOfOccupants: unit.residentAssignments.length,
        verificationStatus: primaryUser?.residentProfile?.verificationStage || 'N/A',
        accessStatus: primaryUser?.status || 'N/A',
        moveInDate: primaryAssignment?.moveInDate || null,
        occupants: unit.residentAssignments.map(a => ({
          id: a.user.id,
          name: a.user.displayName,
          type: a.occupancyType,
          isPrimary: a.isPrimary,
          phone: a.user.phone,
          status: a.user.status,
          verification: a.user.residentProfile?.verificationStage
        }))
      };
    });
  }

  async setPrimaryResident(unitId: string, userId: string, actorId: string): Promise<{ success: boolean }> {
    const communityId = this.tenantContext.communityId;

    await this.prisma.$transaction(async (tx) => {
      // Unset all primary assignments for this unit
      await tx.residentUnitAssignment.updateMany({
        where: { unitId, communityId, deletedAt: null },
        data: { isPrimary: false }
      });

      // Set the new primary assignment
      await tx.residentUnitAssignment.updateMany({
        where: { unitId, userId, communityId, deletedAt: null },
        data: { isPrimary: true }
      });
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'resident_unit_assignments',
      recordId: unitId,
      newValues: { event: 'Changed Primary Resident', primaryResidentId: userId },
    });

    return { success: true };
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

  async updateAccess(id: string, dto: UpdateResidentAccessDto, actorId: string): Promise<ResidentResponseDto> {
    const user = await this.residentRepository.findResidentById(id);
    if (!user) throw new NotFoundException(`Resident '${id}' not found.`);

    let newStatus = user.status;
    let lockedUntil = user.lockedUntil;
    
    switch (dto.action) {
      case AccessAction.SUSPEND:
        newStatus = UserStatus.SUSPENDED;
        break;
      case AccessAction.RESTORE:
        newStatus = UserStatus.ACTIVE;
        break;
      case AccessAction.FORCE_LOGOUT:
        // Invalidate token
        break;
      case AccessAction.LOCK:
        lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 years
        break;
      case AccessAction.UNLOCK:
        lockedUntil = null;
        break;
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: newStatus,
        lockedUntil,
        ...(dto.action === AccessAction.FORCE_LOGOUT ? { refreshTokenHash: null } : {})
      }
    });

    void this.auditService.write({
      actorId,
      action: AuditAction.UPDATE,
      tableName: 'users',
      recordId: id,
      newValues: { event: 'Access Control Update', action: dto.action, reason: dto.reason },
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
    
    // 1. Resident Type / Occupancy Type
    const occupancyData = await this.prisma.residentUnitAssignment.groupBy({
      by: ['occupancyType'],
      where: { communityId, deletedAt: null },
      _count: { id: true }
    });
    const residentType = occupancyData.map(d => ({ name: d.occupancyType.replace(/_/g, ' '), count: d._count.id }));

    // 2. Verification Status
    const verificationData = await this.prisma.residentProfile.groupBy({
      by: ['verificationStage'],
      where: { communityId },
      _count: { id: true }
    });
    const verificationStatus = verificationData.map(d => ({ name: d.verificationStage.replace(/_/g, ' '), count: d._count.id }));

    // 3. Tower Occupancy
    const towers = await this.prisma.tower.findMany({
      where: { communityId, deletedAt: null },
      include: {
        units: {
          where: { deletedAt: null }
        }
      }
    });
    const towerOccupancy = towers.map(t => {
      const occupied = t.units.filter(u => u.occupancy === 'OWNER' || u.occupancy === 'TENANT').length;
      const vacant = t.units.filter(u => u.occupancy === 'VACANT').length;
      return { name: t.name, occupied, vacant };
    });

    // 4. Monthly Resident Growth
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const recentUsers = await this.prisma.user.findMany({
      where: {
        communityId,
        role: { in: ['RESIDENT', 'FAMILY_MEMBER'] as any }, // Using any to avoid import issues if UserRole isn't imported, but it should be
        deletedAt: null,
        createdAt: { gte: sixMonthsAgo }
      },
      select: { createdAt: true }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyGrowthMap = new Map<string, number>();

    // Initialize last 6 months to 0
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyGrowthMap.set(key, 0);
    }

    recentUsers.forEach(u => {
      const key = `${monthNames[u.createdAt.getMonth()]} ${u.createdAt.getFullYear()}`;
      if (monthlyGrowthMap.has(key)) {
        monthlyGrowthMap.set(key, monthlyGrowthMap.get(key)! + 1);
      }
    });

    const monthlyGrowth = Array.from(monthlyGrowthMap.entries())
      .map(([name, count]) => ({ name, count }))
      .reverse();

    return {
      residentType,
      verificationStatus,
      towerOccupancy,
      monthlyGrowth,
      occupancyTrend: residentType 
    };
  }
}
