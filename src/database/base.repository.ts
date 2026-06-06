// src/database/base.repository.ts
// ============================================================
// Base repository class for ALL domain repositories.
//
// CORE DESIGN: Multi-tenant safety by default.
//
// Every query is automatically scoped to:
//   1. The current community (communityId from TenantContextService)
//   2. Non-deleted records (deletedAt: null)
//
// Feature module repositories extend this class:
//   @Injectable()
//   export class UnitRepository extends BaseRepository<'unit'> {
//     constructor(prisma: PrismaService, tenant: TenantContextService) {
//       super(prisma, 'unit', tenant);
//     }
//   }
//
// The generic type T is the Prisma model name (lowercase) used to access
// the delegate: this.prisma[this.model].findMany(...)
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { CountOptions, FindManyOptions, FindOptions } from './repository.types';

type PrismaModelName = Exclude<keyof PrismaClient, `$${string}` | symbol>;

@Injectable()
export abstract class BaseRepository<TModelName extends PrismaModelName> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: TModelName,
    protected readonly tenantContext: TenantContextService,
  ) {
    this.logger = new Logger(`${String(model)}Repository`);
  }

  /** The Prisma model delegate (e.g. prisma.unit, prisma.user) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get delegate(): any {
    return this.prisma[this.model];
  }

  /** Current community ID from request context */
  protected get communityId(): string {
    return this.tenantContext.communityId;
  }

  /**
   * Base where clause that scopes queries to the current tenant.
   * Automatically excludes soft-deleted records unless includeSoftDeleted is true.
   */
  protected baseWhere(options?: FindOptions): Record<string, unknown> {
    const base: Record<string, unknown> = {
      communityId: this.communityId,
    };

    if (!options?.includeSoftDeleted) {
      base.deletedAt = null;
    }

    return base;
  }

  /**
   * Find a single record by ID within the current tenant.
   * Throws NotFoundException if not found.
   */
  async findById(
    id: string,
    options?: FindOptions,
  ): Promise<Record<string, unknown>> {
    const record = await this.delegate.findFirst({
      where: {
        ...this.baseWhere(options),
        id,
      },
      select: options?.select,
      include: options?.include,
    });

    if (!record) {
      throw new NotFoundException(`${String(this.model)} with id '${id}' not found`);
    }

    return record;
  }

  /**
   * Find a single record by arbitrary where clause (tenant-scoped).
   */
  async findOne(
    where: Record<string, unknown>,
    options?: FindOptions,
  ): Promise<Record<string, unknown> | null> {
    return this.delegate.findFirst({
      where: {
        ...this.baseWhere(options),
        ...where,
      },
      select: options?.select,
      include: options?.include,
    });
  }

  /**
   * Find many records with tenant scoping, pagination, and optional extra filters.
   */
  async findMany(options?: FindManyOptions): Promise<Record<string, unknown>[]> {
    return this.delegate.findMany({
      where: {
        ...this.baseWhere(options),
        ...(options?.where ?? {}),
      },
      select: options?.select,
      include: options?.include,
      orderBy: options?.orderBy,
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Count records with tenant scoping and optional extra filters.
   */
  async count(options?: CountOptions): Promise<number> {
    return this.delegate.count({
      where: {
        communityId: this.communityId,
        ...(options?.includeSoftDeleted ? {} : { deletedAt: null }),
        ...(options?.where ?? {}),
      },
    });
  }

  /**
   * Create a record — community_id is automatically injected.
   */
  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.delegate.create({
      data: {
        ...data,
        communityId: this.communityId,
      },
    });
  }

  /**
   * Update a record by ID — validates it belongs to the current tenant first.
   */
  async update(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // findById throws NotFoundException if not in this tenant
    await this.findById(id);

    return this.delegate.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft-delete a record by setting deletedAt to NOW().
   * The record remains in the DB but is filtered from all base queries.
   */
  async softDelete(id: string): Promise<Record<string, unknown>> {
    await this.findById(id); // Tenant ownership check

    return this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Restore a soft-deleted record.
   */
  async restore(id: string): Promise<Record<string, unknown>> {
    const record = await this.findById(id, { includeSoftDeleted: true });

    if (!record.deletedAt) {
      throw new Error(`${String(this.model)} '${id}' is not deleted`);
    }

    return this.delegate.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  /**
   * Check whether a record with the given ID exists in the current tenant.
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.delegate.count({
      where: {
        id,
        communityId: this.communityId,
        deletedAt: null,
      },
    });
    return count > 0;
  }
}
