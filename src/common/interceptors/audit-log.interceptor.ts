// src/common/interceptors/audit-log.interceptor.ts
// ============================================================
// Audit logging interceptor for write operations.
//
// Automatically logs CREATE / UPDATE / DELETE operations to audit_logs.
// Runs AFTER the handler succeeds (non-blocking — uses fire-and-forget).
//
// Reads @AuditLog() metadata (optional) from the handler to customise
// the table name and action. Falls back to HTTP method heuristics.
//
// DOES NOT log GET requests (read-only operations).
// DOES NOT block the response — audit write is fire-and-forget.
// ============================================================

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';
import { RequestUser } from '../../auth/types/jwt-payload.type';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const method = request.method.toUpperCase();

    // Only log mutating operations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const metadata = this.reflector.get<AuditLogMetadata>(AUDIT_LOG_KEY, context.getHandler());

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Fire-and-forget — never await, never block the response
          this.writeAuditLog(request, method, metadata, responseData).catch((err) => {
            this.logger.error('Audit log write failed (non-critical)', err);
          });
        },
      }),
    );
  }

  private async writeAuditLog(
    request: Request & { user?: RequestUser },
    method: string,
    metadata: AuditLogMetadata | undefined,
    responseData: unknown,
  ): Promise<void> {
    const user = request.user;
    if (!user) return;

    const action = metadata?.action ?? this.methodToAction(method);
    const tableName = metadata?.table ?? 'unknown';
    const recordId = this.extractRecordId(request, responseData);

    await this.auditService.write({
      communityId: user.communityId,
      actorId: user.id,
      action,
      tableName,
      recordId,
      newValues: metadata?.captureBody ? (request.body as Record<string, unknown>) : undefined,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  private methodToAction(method: string): AuditAction {
    const map: Record<string, AuditAction> = {
      POST: AuditAction.CREATE,
      PATCH: AuditAction.UPDATE,
      PUT: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };
    return map[method] ?? AuditAction.UPDATE;
  }

  private extractRecordId(
    request: Request,
    responseData: unknown,
  ): string {
    // Try to get ID from route params first
    const params = request.params as Record<string, string>;
    if (params.id) return params.id;

    // Try from response body
    if (responseData && typeof responseData === 'object') {
      const data = responseData as Record<string, unknown>;
      if (typeof data.id === 'string') return data.id;
      const nested = data.data as Record<string, unknown> | undefined;
      if (typeof nested?.id === 'string') return nested.id;
    }

    return 'unknown';
  }
}
