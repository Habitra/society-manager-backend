// src/auth/types/jwt-payload.type.ts
import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  username: string;
  communityId: string;
  role: UserRole;
  status: UserStatus;
}

export interface RequestUser {
  id: string;
  username: string;
  communityId: string;
  role: UserRole;
  status: UserStatus;
  displayName: string;
  email: string;
  mustChangePassword?: boolean;
  firstLoginCompleted?: boolean;
}
