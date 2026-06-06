// src/auth/decorators/roles.decorator.ts
// ============================================================
// @Roles(...roles) decorator — sets required roles on a route.
// Consumed by RolesGuard.
// ============================================================

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
