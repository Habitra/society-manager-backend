// src/auth/guards/supabase-auth.guard.ts
// ============================================================
// Global authentication guard.
//
// Flow:
//   1. If route is marked @Public() → skip.
//   2. Extract Bearer token from Authorization header.
//   3. Call SupabaseService.verifyJwt() → get Supabase user.
//   4. Load the corresponding public.users record from DB.
//   5. Check user status is ACTIVE (not SUSPENDED/INACTIVE).
//   6. Attach RequestUser to req.user.
//
// Registered globally in AppModule so EVERY route is protected by default.
// Use @Public() to opt individual routes out.
// ============================================================

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser } from '../types/jwt-payload.type';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Skip @Public() routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user: RequestUser }>();

    // 2. Extract Bearer token
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // 3. Verify JWT via Supabase (server-side validation — not just decode)
    const supabaseUser = await this.supabaseService.verifyJwt(token);

    // 4. Load public.users record (contains role, communityId, status)
    const dbUser = await this.prismaService.user.findFirst({
      where: {
        id: supabaseUser.id,
        deletedAt: null,
      },
      select: {
        id: true,
        communityId: true,
        role: true,
        status: true,
        displayName: true,
        email: true,
      },
    });

    if (!dbUser) {
      this.logger.warn(`Auth user ${supabaseUser.id} has no public.users record`);
      throw new UnauthorizedException('User account not found. Contact your administrator.');
    }

    // 5. Check account status
    if (dbUser.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Your account has been suspended. Contact your administrator.');
    }
    if (dbUser.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Your account is inactive. Contact your administrator.');
    }

    // 6. Attach to request
    request.user = dbUser as RequestUser;

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
  }
}
