// src/tenant/tenant.middleware.ts
// ============================================================
// Multi-tenant isolation middleware.
//
// Runs on every request AFTER authentication.
// Resolves the community_id from the authenticated user's DB record
// (already fetched and cached on req.user by SupabaseAuthGuard).
//
// Populates TenantContextService so repositories can scope all queries
// to the correct community without any manual wiring in service methods.
//
// WHY NOT use JWT claims for community_id?
// JWT claims can become stale (user moved between communities, role changed).
// We always trust the DB record set by SupabaseAuthGuard as the source of truth.
// ============================================================

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestUser } from '../auth/types/jwt-payload.type';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request & { user?: RequestUser }, _res: Response, next: NextFunction): void {
    // Tenant context is now securely set in JwtAuthGuard.handleRequest()
    // This middleware is kept as a pass-through to avoid breaking imports 
    // and to reserve the injection point for future request-level middleware.
    next();
  }
}
