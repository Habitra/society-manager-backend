// src/common/decorators/audit-log.decorator.ts
// ============================================================
// @AuditLog() decorator — attach metadata to a controller method
// so the AuditLogInterceptor knows what to record.
//
// Usage:
//   @AuditLog({ table: 'units', action: AuditAction.CREATE, captureBody: true })
//   @Post()
//   createUnit(...) {}
// ============================================================

import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  /** DB table name being mutated */
  table: string;
  /** Audit action type */
  action?: AuditAction;
  /** Whether to capture request body in new_values (use sparingly — PII risk) */
  captureBody?: boolean;
}

export const AuditLog = (metadata: AuditLogMetadata) => SetMetadata(AUDIT_LOG_KEY, metadata);
