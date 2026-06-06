// src/auth/guards/roles.guard.ts
// ============================================================
// Role-Based Access Control guard.
//
// Reads @Roles(...) metadata from the route handler.
// If no roles are specified, access is granted to any authenticated user.
// If roles are specified, the request user's role must be in the list.
//
// SUPER_ADMIN always bypasses role checks (platform-level access).
//
// Must be applied AFTER SupabaseAuthGuard (req.user must already be set).
// Registered globally in AppModule.
// ============================================================

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RequestUser } from '../types/jwt-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No role restriction on this route → allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const user = request.user;

    // SUPER_ADMIN bypasses all role checks
    if (user?.role === UserRole.SUPER_ADMIN) return true;

    // Check if user's role is in the required list
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${user?.role}.`,
      );
    }

    return true;
  }
}
