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
    // Skip if no user is present (public routes, health checks)
    if (!req.user) {
      return next();
    }

    const { communityId, id: userId } = req.user;

    if (!communityId) {
      throw new UnauthorizedException(
        'Your account is not linked to a community. Contact your administrator.',
      );
    }

    // Populate the request-scoped context
    this.tenantContext.communityId = communityId;
    this.tenantContext.userId = userId;

    next();
  }
}
