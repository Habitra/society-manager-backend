// src/auth/guards/roles.guard.ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AUTHENTICATED_ONLY_KEY } from '../decorators/authenticated-only.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../types/jwt-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isAuthenticatedOnly = this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const hasRoles = requiredRoles && requiredRoles.length > 0;

    // If route explicitly says any authenticated user is allowed, AND no specific roles are required
    if (isAuthenticatedOnly && !hasRoles) return true;

    // DEFAULT DENY: If no roles and not explicitly marked authenticated-only
    if (!hasRoles) {
      const requestObject = context.switchToHttp().getRequest<Request>();
      this.logger.error(
        `SECURITY_VIOLATION: Unprotected route accessed! Route ${requestObject.method} ${requestObject.url} has no @Roles() or @AuthenticatedOnly() decorators.`
      );
      throw new ForbiddenException('Access denied.');
    }

    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const user = request.user; console.log("RolesGuard user:", user);

    // SUPER_ADMIN bypasses all role checks
    if (user?.role === UserRole.SUPER_ADMIN) return true;

    // Check if user's role is in the required list
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}
