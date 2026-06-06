// src/auth/decorators/public.decorator.ts
// ============================================================
// @Public() decorator — marks a route as publicly accessible.
// SupabaseAuthGuard checks for this metadata and skips JWT verification.
// ============================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
