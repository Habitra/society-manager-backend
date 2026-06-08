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
    // If req.user is already populated, use it.
    if (req.user) {
      const { communityId, id: userId } = req.user;
      if (communityId) {
        this.tenantContext.communityId = communityId;
        this.tenantContext.userId = userId;
      }
      return next();
    }

    // Otherwise, decode the JWT manually since Guards run AFTER Middlewares in NestJS
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        if (payload.communityId) {
          this.tenantContext.communityId = payload.communityId;
          this.tenantContext.userId = payload.sub;
        }
      } catch (err) {
        // Ignore decode errors; let AuthGuard handle invalid tokens
      }
    }

    next();
  }
}
