// src/supabase/supabase.service.ts
// ============================================================
// Supabase integration service.
//
// Exposes TWO clients:
//   - adminClient: uses SERVICE_ROLE_KEY — bypasses RLS.
//     Used for admin operations (creating users, verifying JWTs, etc.)
//   - anonClient:  uses ANON_KEY — respects RLS.
//     Useful for public operations.
//
// verifyJwt(): validates a Bearer token and returns the Supabase user.
// This is the primary method called by SupabaseAuthGuard.
// ============================================================

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { AppConfig } from '../config/configuration';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  /** Admin client — SERVICE_ROLE key. Bypasses RLS. Use with caution. */
  readonly adminClient: SupabaseClient;

  /** Anonymous client — ANON key. Respects RLS. */
  readonly anonClient: SupabaseClient;

  constructor(private readonly configService: ConfigService<AppConfig, true>) {
    const supabaseUrl = this.configService.get('supabase.url', { infer: true });
    const anonKey = this.configService.get('supabase.anonKey', { infer: true });
    const serviceRoleKey = this.configService.get('supabase.serviceRoleKey', { infer: true });

    this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.anonClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Verifies a Supabase JWT Bearer token.
   * Returns the authenticated Supabase user or throws UnauthorizedException.
   *
   * Uses getUser() which validates the token server-side — NOT just decode.
   * This ensures revoked tokens are rejected.
   */
  async verifyJwt(token: string): Promise<User> {
    const { data, error } = await this.adminClient.auth.getUser(token);

    if (error || !data.user) {
      this.logger.warn(`JWT verification failed: ${error?.message ?? 'no user returned'}`);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    return data.user;
  }

  /**
   * Creates a new user in Supabase Auth (admin operation).
   * Called during resident/staff onboarding flows.
   */
  async createAuthUser(email: string, password: string, metadata: Record<string, unknown> = {}) {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata,
      email_confirm: true,
    });

    if (error) {
      this.logger.error(`Failed to create auth user: ${error.message}`);
      throw error;
    }

    return data.user;
  }

  /**
   * Deletes a user from Supabase Auth (admin operation).
   * Should be called when a user is hard-deleted from public.users.
   */
  async deleteAuthUser(userId: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.deleteUser(userId);
    if (error) {
      this.logger.error(`Failed to delete auth user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
