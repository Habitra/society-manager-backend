# Project Overview

* **Product name**: Society Manager
* **Product vision**: A comprehensive, multi-tenant SaaS for managing residential societies, commercial complexes, and gated communities.
* **Tech stack**: NestJS, Prisma, PostgreSQL (Supabase), Swagger, Jest
* **Architecture style**: Modular Monolith, REST APIs
* **Multi-tenancy approach**: Shared Database, Shared Schema (logical isolation via `communityId`)

# Current Development Phase

* **Current sprint**: Authentication Redesign & Top-Down Onboarding
* **Current milestone**: Local JWT Auth & First-Login Flow
* **Current focus**: Removing Supabase Auth dependence and implementing the hierarchical onboarding strategy (Platform Admin -> Community Admin -> Resident) with forced first-login password changes.

# Project Status Dashboard

## Completed

- [x] Initial Supabase + Prisma setup
- [x] Tenant Context & Base Repository pattern
- [x] Audit Logging Framework
- [x] Global Exception Filter & Swagger docs
- [x] CommunityModule (Create, Update, Get, List, Soft Delete)
- [x] TowerModule (Create, Update, List, Soft Delete)
- [x] UnitModule (Create, Update, Get, List, Search, Soft Delete)
- [x] ResidentAssignmentModule (Assign, Remove, List by Unit, List by User, Mark Primary)
- [x] Unit Tests for Property Management Services
- [x] VisitorModule (Pre-approved / On-arrival flows)
- [x] GatePassModule (QR Token generation & validation)
- [x] GateEntryModule (Entry & exit tracking)
- [x] Platform Super Admin Module (Cross-tenant access, Global stats, Community Admin creation)
- [x] ResidentModule (Resident creation, temporary credentials, profile, assignment, lists, activation)
- [x] VendorModule (Vendor registry, contract tracking, dashboard KPIs)
- [x] SecurityGuardModule (Guard shifts, attendance tracking, incident logging, Live Security Snapshot)

## In Progress

- [x] Schema update for local Auth (username, password_hash, first_login_completed)
- [x] Local JWT AuthModule & First-Login enforcement
- [x] Community Admin bootstrap via Community Creation
- [x] Password Recovery (OTP-based)
- [ ] Billing Module (Basic structure present, API endpoints in active development)
- [ ] Maintenance Module (Ticketing and attachments actively present)

## Pending

- [ ] Bulk Import Module (Excel/CSV for Towers, Units, Residents)
- [ ] Announcement Module
- [ ] Notification Module

## Blockers

- None currently.

# System Architecture

* **Backend architecture**: Modular Monolith (NestJS), loosely coupled domains.
* **Authentication architecture**: Custom Local JWT Authentication. Users authenticate using a system-generated `username` and `password`. First login enforces a password change and profile completion (email, phone). Supabase Auth has been deprecated in favor of this model.
* **Multi-tenancy approach**: Shared database, shared schema.
  * Every tenant-aware table has a `community_id` column.
  * A `TenantMiddleware` intercepts requests, extracts the JWT, and injects `communityId` into `TenantContextService`.
  * All database access is routed through a generic `BaseRepository<T>` that automatically appends `where: { communityId }` to every query, guaranteeing data isolation.
* **Onboarding Hierarchy**: 
  * Platform Super Admin creates communities and Community Admins.
  * Community Admins create Towers, Units, and Residents (generating temporary credentials).
  * Residents activate accounts on first login.
* **Database architecture**: Managed via Prisma ORM. `BaseRepository` automatically scopes all CRUD operations by `communityId` to prevent cross-tenant data leakage.

# Folder Structure

```
D:\SOCIETY MANAGER\SRC
|   app.controller.ts
|   app.module.ts
|   main.ts
|   
+---audit
|       audit.module.ts
|       audit.service.ts
|       
+---auth
|   |   auth.module.ts
|   |   
|   +---decorators
|   |       current-user.decorator.ts
|   |       public.decorator.ts
|   |       roles.decorator.ts
|   |       
|   +---guards
|   |       roles.guard.ts
|   |       supabase-auth.guard.ts
|   |       
|   \---types
|           jwt-payload.type.ts
|           
+---common
|   +---decorators
|   |       api-paginated-response.decorator.ts
|   |       audit-log.decorator.ts
|   |       
|   +---dto
|   |       api-response.dto.ts
|   |       pagination.dto.ts
|   |       
|   +---filters
|   |       global-exception.filter.ts
|   |       
|   +---interceptors
|   |       audit-log.interceptor.ts
|   |       response-transform.interceptor.ts
|   |       timeout.interceptor.ts
|   |       
|   \---utils
|           pagination.util.ts
|           slug.util.ts
|           
+---community
|   |   community.controller.ts
|   |   community.module.ts
|   |   community.repository.ts
|   |   community.service.spec.ts
|   |   community.service.ts
|   |   
|   \---dto
|           community-response.dto.ts
|           create-community.dto.ts
|           list-communities.dto.ts
|           update-community.dto.ts
|           
+---config
|       configuration.ts
|       validation.schema.ts
|       
+---database
|       base.repository.ts
|       repository.types.ts
|       
+---prisma
|       prisma.module.ts
|       prisma.service.ts
|       
+---resident-assignment
|   |   resident-assignment.controller.ts
|   |   resident-assignment.module.ts
|   |   resident-assignment.repository.ts
|   |   resident-assignment.service.spec.ts
|   |   resident-assignment.service.ts
|   |   
|   \---dto
|           assign-resident.dto.ts
|           resident-assignment-response.dto.ts
|           
+---supabase
|       supabase.module.ts
|       supabase.service.ts
|       
+---tenant
|       tenant-context.service.ts
|       tenant.middleware.ts
|       tenant.module.ts
|       
+---tower
|   |   tower.controller.ts
|   |   tower.module.ts
|   |   tower.repository.ts
|   |   tower.service.spec.ts
|   |   tower.service.ts
|   |   
|   \---dto
|           create-tower.dto.ts
|           tower-response.dto.ts
|           update-tower.dto.ts
|           
\---unit
    |   unit.controller.ts
    |   unit.module.ts
    |   unit.repository.ts
    |   unit.service.spec.ts
    |   unit.service.ts
    |   
    \---dto
            create-unit.dto.ts
            list-units.dto.ts
            unit-response.dto.ts
            update-unit.dto.ts
```

# Database

* **Prisma schema status**: Extensive Phase 1 models implemented.
* **Migration status**: Awaiting initial migration (`prisma migrate dev`).
* **Tables implemented**:
  - Tenant Root: `communities`
  - Property: `towers`, `units`
  - Users & Profiles: `users`, `resident_profiles`, `admin_profiles`, `staff_profiles`
  - Unit Assignment: `resident_unit_assignments`
  - Ext: `vehicles`, `visitor_requests`, `gate_passes`, `gate_entries`
  - Ops: `maintenance_categories`, `maintenance_tickets`, `maintenance_comments`, `maintenance_attachments`, `audit_logs`, `invoice_cycles`
* **Pending tables**: `Visitor`, `Billing`, `Announcement` and `Notification` module specific tables to be reviewed or added as those modules are fleshed out.

# Modules

## CommunityModule
* **Status**: Completed
* **Features**:
  * Create, update, get details, list communities, and soft delete.
* **Endpoints**:
  * `POST /communities`
  * `GET /communities`
  * `GET /communities/me`
  * `GET /communities/:id`
  * `PATCH /communities/:id`
  * `PATCH /communities/me`
  * `DELETE /communities/:id`
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## TowerModule
* **Status**: Completed
* **Features**:
  * Create, update, list, and soft delete towers.
* **Endpoints**:
  * `POST /towers`
  * `GET /towers`
  * `GET /towers/:id`
  * `PATCH /towers/:id`
  * `DELETE /towers/:id`
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## UnitModule
* **Status**: Completed
* **Features**:
  * Create, update, get details, list, search, and soft delete units.
* **Endpoints**:
  * `POST /units`
  * `GET /units`
  * `GET /units/:id`
  * `PATCH /units/:id`
  * `DELETE /units/:id`
* **Dependencies**: PrismaModule, TenantModule, AuditModule, TowerModule

## ResidentAssignmentModule
* **Status**: Completed
* **Features**:
  * Assign resident to unit, remove assignment, list residents in a unit, list units for a resident, mark primary resident.
* **Endpoints**:
  * `POST /resident-assignments`
  * `GET /resident-assignments/unit/:unitId`
  * `GET /resident-assignments/user/:userId`
  * `PATCH /resident-assignments/:id/primary`
  * `DELETE /resident-assignments/:id`
* **Dependencies**: PrismaModule, TenantModule, AuditModule, UnitModule

## GateEntryModule
* **Status**: Completed
* **Features**:
  * Record visitor entry, record visitor exit.
* **Endpoints**:
  * `POST /gate-entries`
  * `PATCH /gate-entries/:id/exit`
* **Dependencies**: PrismaModule, TenantModule, GatePassModule, VisitorModule

## SuperAdminModule
* **Status**: Completed
* **Features**:
  * Cross-tenant access bypassing standard TenantContext isolation.
  * Global dashboard statistics (communities, towers, units, residents, admins).
  * Community administration (activate, suspend).
  * Community Admin creation with transactional username/password generation.
  * Community Admin password resets.
* **Endpoints**:
  * `GET /super-admin/dashboard`
  * `GET /super-admin/communities`
  * `GET /super-admin/communities/:id`
  * `GET /super-admin/communities/:id/stats`
  * `PATCH /super-admin/communities/:id/activate`
  * `PATCH /super-admin/communities/:id/deactivate`
  * `POST /super-admin/community-admins`
  * `GET /super-admin/community-admins`
  * `GET /super-admin/community-admins/:id`
  * `POST /super-admin/community-admins/:id/reset-password`
* **Dependencies**: PrismaModule, AuditModule

## ResidentModule
* **Status**: Completed
* **Features**:
  * Create resident (creates user, profile, and unit assignment in a transaction).
  * Generate sequential usernames (`<COMMUNITY_CODE>-XXXXXX`) and temporary passwords.
  * List and search residents, get resident details.
  * Activate and deactivate residents.
  * Reset resident passwords (issues new temporary passwords).
  * Query unit assignments for residents.
* **Endpoints**:
  * `POST /residents`
  * `GET /residents`
  * `GET /residents/:id`
  * `PATCH /residents/:id/activate`
  * `PATCH /residents/:id/deactivate`
  * `POST /residents/:id/reset-password`
  * `GET /residents/:id/units`
  * `GET /residents/:id/current-unit`
* **Dependencies**: PrismaModule, TenantModule, AuditModule

# API Documentation Index

**Communities**
- `POST /communities` - Create community
- `GET /communities` - List all communities (Admin)
- `GET /communities/me` - Get own community
- `GET /communities/:id` - Get community by ID
- `PATCH /communities/:id` - Update community by ID
- `PATCH /communities/me` - Update own community
- `DELETE /communities/:id` - Soft delete community

**Towers**
- `POST /towers` - Create tower
- `GET /towers` - List all towers
- `GET /towers/:id` - Get tower by ID
- `PATCH /towers/:id` - Update tower details
- `DELETE /towers/:id` - Soft delete tower

**Units**
- `POST /units` - Create unit
- `GET /units` - List and search units
- `GET /units/:id` - Get unit by ID
- `PATCH /units/:id` - Update unit details
- `DELETE /units/:id` - Soft delete unit

**Resident Assignments**
- `POST /resident-assignments` - Assign resident to unit
- `GET /resident-assignments/unit/:unitId` - List residents in unit
- `GET /resident-assignments/user/:userId` - List units for a resident
- `PATCH /resident-assignments/:id/primary` - Set primary resident
- `DELETE /resident-assignments/:id` - Remove assignment

**Super Admin**
- `GET /super-admin/dashboard` - Get global statistics
- `GET /super-admin/communities` - List all communities globally
- `GET /super-admin/communities/:id` - Get specific community details
- `PATCH /super-admin/communities/:id/activate` - Activate a community
- `PATCH /super-admin/communities/:id/deactivate` - Deactivate a community
- `POST /super-admin/community-admins` - Create a Community Admin
- [x] List all Community Admins
- [POST /super-admin/community-admins/:id/reset-password] - Reset Community Admin password

**Residents**
- `POST /residents` - Create a new resident
- `GET /residents` - List and search residents
- `GET /residents/:id` - Get resident details
- `PATCH /residents/:id/activate` - Activate resident
- `PATCH /residents/:id/deactivate` - Deactivate resident
- `POST /residents/:id/reset-password` - Reset resident password
- `GET /residents/:id/units` - Get assigned units
- `GET /residents/:id/current-unit` - Get primary assigned unit

**Vendors**
- `GET /api/v1/vendors` - List and search outsourced vendors
- `GET /api/v1/vendors/stats` - Get vendor statistics (total, active, monthly spend)
- `GET /api/v1/vendors/:id` - Get specific vendor details
- `GET /api/v1/vendors/:id/contracts` - Get contracts for a specific vendor

**Security Guards**
- `GET /api/v1/security-guards` - List and search security guards
- `GET /api/v1/security-guards/stats` - Get live security snapshot (total, on duty, incidents)
- `GET /api/v1/security-guards/shifts` - View current duty roster and schedules
- `GET /api/v1/security-guards/attendance` - View clock-in/clock-out records
- `GET /api/v1/security-guards/incidents` - View security incidents
- `GET /api/v1/security-guards/compensation` - View compensation/vendor mapping
- `GET /api/v1/security-guards/:id` - Get specific security guard details

# Development Timeline

* **[Phase 1] Backend Foundation**: Completed base infrastructure including Supabase auth, multi-tenancy middleware, audit interceptors, and error handling.
* **[Phase 1] Property Management**: Completed creation of `Community`, `Tower`, `Unit`, and `ResidentAssignment` modules with comprehensive testing and swagger integrations.
* **[Phase 2] Operations Management**: Completed creation of `VendorModule` for third-party agency tracking, and the `SecurityGuardModule` utilizing existing User models for streamlined Phase 1 deployment. Both seamlessly integrated with a React/Vite Frontend using TanStack Query.

# Decisions Log

* **Multi-tenancy Strategy**: Chose a shared database and shared schema model relying on logical isolation (`communityId`). This approach scales better regarding migration management and aggregate analytics compared to schema-per-tenant, effectively securing data using a request-scoped `BaseRepository`.
* **Authentication Service**: Custom Local JWT authentication replacing Supabase Auth. Includes a top-down onboarding hierarchy, account locking, and first-login password enforcement.
* **Security Guard Architecture**: Decided NOT to create a separate `GUARD` system role to minimize complexity. Security Guards are structured as `User` entities linked to a `StaffProfile` with the `StaffCategory.SECURITY_GUARD` enum. This allows integration into existing personnel structures and avoids redundant HR schemas. Phase 2 will introduce complex HR features (Leaves/Compliance).
* **Audit Logging**: Handled via asynchronous (fire-and-forget) service execution and global interceptor bindings. This guarantees an immutable audit trail for all modification endpoints (`POST`, `PATCH`, `DELETE`) without blocking fast request response times.

# Next Recommended Task

* Implement the **Maintenance Module** (handling resident tickets, worker assignments, and resolution statuses).
