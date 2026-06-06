// src/auth/decorators/current-user.decorator.ts
// ============================================================
// @CurrentUser() parameter decorator.
// Extracts the RequestUser from req.user (set by SupabaseAuthGuard).
//
// Usage:
//   getProfile(@CurrentUser() user: RequestUser) { ... }
//   getProfile(@CurrentUser('id') userId: string) { ... }
// ============================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../types/jwt-payload.type';

export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: RequestUser }>();
    const user = request.user;

    return field ? user?.[field] : user;
  },
);
