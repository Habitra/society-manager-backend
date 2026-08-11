// src/app.module.ts
// ============================================================
// Root application module.
//
// Registration order matters:
//  1. ConfigModule (loaded first — all other modules depend on env)
//  2. ThrottlerModule (rate limiting)
//  3. PrismaModule (global DB access)
//  4. SupabaseModule (global Supabase clients)
//  5. AuditModule (global audit service)
//  6. AuthModule (guards registered as global providers here)
//  7. TenantModule (middleware applied here)
//  8. Feature modules (to be added in Phase 1 features)
// ============================================================

import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AuditModule } from './audit/audit.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TenantInterceptor } from './tenant/tenant.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { TenantModule } from './tenant/tenant.module';
import { CommunityModule } from './community/community.module';
import { TowerModule } from './tower/tower.module';
import { UnitModule } from './unit/unit.module';
import { ResidentAssignmentModule } from './resident-assignment/resident-assignment.module';
import { VisitorModule } from './visitor/visitor.module';
import { GatePassModule } from './gate-pass/gate-pass.module';
import { GateEntryModule } from './gate-entry/gate-entry.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { ResidentModule } from './resident/resident.module';
import { ImportsModule } from './imports/imports.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BillingModule } from './billing/billing.module';
import { StaffModule } from './staff/staff.module';
import { LookupModule } from './lookup/lookup.module';
import { StorageModule } from './storage/storage.module';
import { SettingsModule } from './settings/settings.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AnnouncementModule } from './announcement/announcement.module';
import { AmenityModule } from './amenity/amenity.module';
import { FinancialControlCenterModule } from './financial-control-center/financial-control-center.module';
import { SecurityModule } from './security/security.module';
import { VendorsModule } from './vendors/vendors.module';
import { ContractsModule } from './contracts/contracts.module';
import { SecurityGuardsModule } from './security-guards/security-guards.module';
import { join } from 'path';

@Module({
  imports: [
    // ─── Configuration (must be first) ────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    ServeStaticModule.forRoot({
      rootPath: process.env.VERCEL ? '/tmp/uploads' : join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // ─── Rate Limiting ────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
      },
    ]),

    // ─── Infrastructure (global) ──────────────────────────────────────────
    PrismaModule,
    AuditModule,

    // ─── Auth ─────────────────────────────────────────────────────────────
    AuthModule,

    // ─── Tenant Isolation ─────────────────────────────────────────────────
    TenantModule,

    // ─── Feature Modules (add below as they are built) ────────────────────
    CommunityModule,
    TowerModule,
    UnitModule,
    ResidentAssignmentModule,
    VisitorModule,
    GatePassModule,
    GateEntryModule,
    SuperAdminModule,
    ResidentModule,
    ImportsModule,
    // UserModule,
    MaintenanceModule,
    DashboardModule,
    BillingModule,
    StaffModule,
    LookupModule,
    StorageModule,
    SettingsModule,
    AnnouncementModule,
    AmenityModule,
    FinancialControlCenterModule,
    SecurityModule,
    VendorsModule,
    ContractsModule,
    SecurityGuardsModule,
  ],

  controllers: [AppController],

  providers: [
    // ─── Global Rate Limit Guard ──────────────────────────────────────────
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },


    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // ─── Global Exception Filter ──────────────────────────────────────────
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // ─── Global Interceptors (applied in order) ───────────────────────────
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Apply TenantMiddleware to all API routes.
   * Excludes the health check endpoints which don't need tenant context.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: '', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
