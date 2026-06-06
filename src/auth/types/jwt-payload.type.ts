// src/auth/types/jwt-payload.type.ts
// ============================================================
// Typed representation of the Supabase JWT payload and the
// enriched request user object (after DB lookup).
// ============================================================

import { UserRole, UserStatus } from '@prisma/client';

/** Raw Supabase JWT user (from auth.users). */
export interface SupabaseUser {
  id: string;
  email?: string;
  phone?: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

/**
 * The enriched user attached to req.user after auth guard runs.
 * This is the public.users record joined with the Supabase identity.
 */
export interface RequestUser {
  /** UUID — from public.users (= auth.users.id) */
  id: string;

  /** Community this user belongs to */
  communityId: string;

  /** System role */
  role: UserRole;

  /** Account status */
  status: UserStatus;

  /** Display name */
  displayName: string;

  /** Email address */
  email: string;
}
