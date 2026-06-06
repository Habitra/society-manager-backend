// src/tenant/tenant-context.service.ts
// ============================================================
// REQUEST-SCOPED service that holds the current community context.
//
// Scope.REQUEST means a NEW instance is created per HTTP request.
// This is the NestJS equivalent of AsyncLocalStorage for tenant context.
//
// TenantMiddleware sets communityId and userId.
// All repositories and services inject this to scope DB queries.
//
// WHY REQUEST SCOPE vs AsyncLocalStorage?
// NestJS request scope gives us full DI support and testability.
// AsyncLocalStorage would be more performant but harder to test/mock.
// For Phase 1 load (< 1000 RPS), request scope is sufficient.
// ============================================================

import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private _communityId: string | null = null;
  private _userId: string | null = null;

  set communityId(id: string) {
    this._communityId = id;
  }

  get communityId(): string {
    if (!this._communityId) {
      throw new Error(
        'TenantContext: communityId is not set. Ensure TenantMiddleware is applied to this route.',
      );
    }
    return this._communityId;
  }

  set userId(id: string) {
    this._userId = id;
  }

  get userId(): string | null {
    return this._userId;
  }

  /** Returns true if the context has been initialised (for optional tenant routes). */
  get isInitialised(): boolean {
    return this._communityId !== null;
  }
}
