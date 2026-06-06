// src/common/dto/api-response.dto.ts
// ============================================================
// TypeScript types for the standard API response envelope.
// Used for Swagger documentation and typed service return values.
// ============================================================

import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNextPage!: boolean;
  @ApiProperty() hasPreviousPage!: boolean;
}

export class ApiSuccessResponse<T> {
  @ApiProperty({ example: true })
  success!: true;

  data!: T;

  @ApiProperty()
  meta!: {
    timestamp: string;
    requestId?: string;
  };
}

export class ApiPaginatedSuccessResponse<T> {
  @ApiProperty({ example: true })
  success!: true;

  data!: T[];

  @ApiProperty()
  meta!: {
    timestamp: string;
    pagination: PaginationMeta;
  };
}

/** Generic paginated result returned from service methods */
export interface PaginatedResult<T> {
  success: true;
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}
