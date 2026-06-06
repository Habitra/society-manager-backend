// src/audit/audit.service.ts
// ============================================================
// AuditService — centralised write method for the audit_logs table.
//
// Used by:
//   1. AuditLogInterceptor (automatic, for all write HTTP methods)
//   2. Business services (explicit, for sensitive operations like
//      role changes, billing actions, gate pass approval, etc.)
//
// ALL writes are fire-and-forget from the call site.
// Errors in audit logging must NEVER fail a business transaction.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface WriteAuditLogDto {
  communityId?: string | null;
  actorId?: string | null;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Write an audit log entry.
   * Safe to call without await — errors are swallowed and logged.
   */
  async write(dto: WriteAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          communityId: dto.communityId ?? null,
          actorId: dto.actorId ?? null,
          action: dto.action,
          tableName: dto.tableName,
          recordId: dto.recordId,
          oldValues: dto.oldValues ? (dto.oldValues as unknown as Prisma.InputJsonValue) : undefined,
          newValues: dto.newValues ? (dto.newValues as unknown as Prisma.InputJsonValue) : undefined,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          metadata: (dto.metadata ?? {}) as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // Audit logging must NEVER crash the application
      this.logger.error(
        `Failed to write audit log: table=${dto.tableName} record=${dto.recordId} action=${dto.action}`,
        error,
      );
    }
  }

  /**
   * Convenience method for login events.
   */
  async logLogin(userId: string, communityId: string, ipAddress?: string): Promise<void> {
    await this.write({
      communityId,
      actorId: userId,
      action: AuditAction.LOGIN,
      tableName: 'users',
      recordId: userId,
      ipAddress,
    });
  }

  /**
   * Convenience method for soft-delete events.
   */
  async logSoftDelete(
    communityId: string,
    actorId: string,
    tableName: string,
    recordId: string,
  ): Promise<void> {
    await this.write({
      communityId,
      actorId,
      action: AuditAction.SOFT_DELETE,
      tableName,
      recordId,
    });
  }
}
