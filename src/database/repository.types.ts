// src/database/repository.types.ts
// ============================================================
// Shared types for the base repository pattern.
// ============================================================

export interface FindOptions {
  /** Include soft-deleted records. Default: false */
  includeSoftDeleted?: boolean;
  /** Prisma select clause */
  select?: Record<string, unknown>;
  /** Prisma include clause */
  include?: Record<string, unknown>;
  /** Prisma orderBy clause */
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
}

export interface FindManyOptions extends FindOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
}

export interface CountOptions {
  includeSoftDeleted?: boolean;
  where?: Record<string, unknown>;
}
