// src/common/utils/pagination.util.ts
// ============================================================
// Helper to build Prisma skip/take from pagination DTOs and
// to format paginated results into the standard ApiPaginatedSuccessResponse shape.
// ============================================================

import { PaginatedResult, PaginationMeta } from '../dto/api-response.dto';
import { PaginationDto } from '../dto/pagination.dto';

export interface PrismaPage {
  skip: number;
  take: number;
}

/**
 * Convert PaginationDto → Prisma skip/take values.
 */
export function toPrismaPage(dto: PaginationDto): PrismaPage {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? 20;
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

/**
 * Wrap a list of items and total count into the standard PaginatedResult.
 */
export function toPaginatedResult<T>(
  items: T[],
  total: number,
  dto: PaginationDto,
): PaginatedResult<T> {
  const page = dto.page ?? 1;
  const limit = dto.limit ?? 20;
  const totalPages = Math.ceil(total / limit);

  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return {
    success: true,
    data: items,
    meta: { pagination },
  };
}
