# Project Overview

* **Product name**: Society Manager
* **Product vision**: A comprehensive, multi-tenant SaaS for managing residential societies, commercial complexes, and gated communities.
* **Tech stack**: 
  * **Backend**: NestJS, Prisma, PostgreSQL (Supabase), Swagger, Jest
  * **Frontend**: React, Vite, Axios, TanStack Query, TailwindCSS
* **Architecture style**: Modular Monolith, REST APIs
* **Multi-tenancy approach**: Shared Database, Shared Schema (logical isolation via `communityId`)

# Current Development Phase

* **Current sprint**: Operations Center & Financial Control Integrations
* **Current milestone**: Operations Center (Vendors, Contracts, Security Guards), Financial Control Center (Billing, Invoices, Payment Tracking), Maintenance Ticketing, and Community Utilities (Amenities, Announcements) Fully Integrated and Verified
* **Current focus**: Production validation, performance tuning, and expanding advanced analytics features (e.g. AI-driven contract renewal intelligence, vendor risk assessments).

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
- [x] Local Auth Refactoring (Local JWT Authentication, first-login enforcement, password reset OTPs)
- [x] Financial Control Center (Billing cycles, automated invoice generation, payment allocations, outstanding balances tracker)
- [x] Maintenance Module (Service request tickets, workflow status updates, assignment rosters, comments, file attachments)
- [x] Operations Center (Security watchlists, real-time activity feeds, gate assignments, guards shift management)
- [x] Vendor Management & AI Renewal Intelligence (Risk scoring, performance rating, blacklist directory, contract renewal prediction alerts)
- [x] Community utilities (Announcements publishing & read logs, Amenities registry & reservation calendars)
- [x] Resident Bulk Import Framework (Transactional imports tracking & validation logs)
- [x] Front-end Web Dashboard (React/Vite app fully integrating all administrators features under tenant isolation filters)

## In Progress

- [x] End-to-End API Integration & UI review (Confirmed live via end-to-end automation scripts and screenshots verification)
- [ ] Security Hardening (Blueprint v2.1)
  - [x] Sprint 1: Cryptographic Security & Log Sanitization (TASK-001 to TASK-004)
  - [x] Sprint 2: Secure Defaults & Secrets (TASK-005 to TASK-008)
  - [x] Sprint 3: Tenant Middleware Fix (TASK-009)
  - [x] Sprint 3: Logout Endpoint (TASK-010)
  - [x] Sprint 3: Default Deny Roles Guard (TASK-011)
  - [x] Sprint 3: Production Seeder Constraints (TASK-012)
  - [x] Sprint 4: Deprecate Legacy Decorators (TASK-013)
  - [x] Sprint 4: Clean up unused legacy components (TASK-014)
  - [x] Sprint 4: Uninstall @supabase/supabase-js (TASK-015)
  - [x] Sprint 5: Update Automation Scripts (TASK-016)
  - [x] Sprint 6: Create SECURITY.md (TASK-017)
  - [x] Sprint 6: Final Audit & Freeze (TASK-018)
- [ ] Multi-tenant performance load testing
- [ ] Notification and Consent delivery channels integration

## Pending

- [ ] SMS and Email gateway integration (for OTPs, announcements, and billing alerts)
- [ ] Native mobile apps for Security Guards and Residents (QR scanning, visitor pre-approvals)

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

## Backend Directory Structure
```
D:\habita\backend\society manager\src
|   app.controller.ts
|   app.module.ts
|   main.ts
|   
+---amenity                     # Amenity registry and booking reservation
+---announcement                # Announcements & broadcast read tracking
+---audit                       # Audit logging module
+---auth                        # Local authentication and login logic
+---billing                     # Automated invoicing and payment tracking
+---common                      # Filters, interceptors, decorators, and utilities
+---community                   # Community administration
+---config                      # Environment settings and validations
+---contracts                   # Vendor contracts & renewal intelligence
+---dashboard                   # Tenant dashboard and KPI metrics
+---database                    # BaseRepository & DB-scoped layers
+---financial-control-center    # Administrative financial dashboards
+---gate-entry                  # Gate checkins & checkouts logs
+---gate-pass                   # Visitor QR gate pass generation
+---imports                     # Excel/CSV transactional imports
+---lookup                      # Dropdown quick selections
+---maintenance                 # Ticketing and maintenance request tracking
+---prisma                      # Prisma service and setup
+---resident                    # Resident profiles and workflows
+---resident-assignment         # Unit assignments
+---security                    # Watchlists and operations dashboard
+---security-guards             # Guard shifts, incident logs, attendance
+---settings                    # Global community settings config
+---staff                       # Service staff registers
+---storage                     # Local files attachment uploading
+---supabase                    # Legacy Supabase integration
+---super-admin                 # Cross-tenant administration
+---tenant                      # Multi-tenancy context and middlewares
+---tower                       # Tower settings
+---unit                        # Units database
+---vendors                     # Vendor contract center & performance logs
\---visitor                     # Visitor registration details
```

## Frontend Directory Structure
```
D:\habita\frontend\society_maneger_web\src
+---app                         # Store configuration, providers, and routers
+---assets                      # Static assets and images
+---components                  # Global reusable UI widgets
+---layouts                     # Dashboard base panels and navigation frames
+---pages                       # Module pages and sub-routes (e.g. vendors)
+---services                    # REST API integrations using Axios
\---features                    # Role-specific modules
    +---community-admin         # Admin portals pages (Dashboard, Billing, Maintenance, Guards registry)
    \---super-admin             # Global platform administration portals
```

# Database

* **Prisma schema status**: Fully migrated. Extensive models for all phases implemented.
* **Migration status**: Database is fully migrated and synced via `prisma migrate dev`.
* **Tables implemented**:
  - Tenant Root: `communities`, `UsernameSequence`
  - Property: `towers`, `units`
  - Users & Profiles: `users`, `resident_profiles`, `admin_profiles`, `staff_profiles`
  - Unit Assignment: `resident_unit_assignments`, `PasswordResetOtp`
  - Ext: `vehicles`, `visitor_requests`, `gate_passes`, `gate_entries`, `SecurityWatchlist`
  - Ops: `maintenance_categories`, `maintenance_tickets`, `maintenance_comments`, `maintenance_attachments`, `audit_logs`, `ImportJob`
  - Finance: `invoice_cycles`, `invoices`, `invoice_line_items`, `payments`
  - Utilities: `announcements`, `announcement_read_statuses`, `amenities`, `amenity_reservations`
  - Staff & Security: `staff_profiles`, `gate_assignments`, `guard_shifts`, `guard_attendance`, `guard_incidents`
  - Vendors & Contracts: `vendors`, `contracts`, `contract_renewal_histories`, `work_orders`, `compliance_records`, `vendor_payments`, `vendor_feedbacks`, `vendor_performance_metrics`
  - System logs: `notification_logs`, `consent_logs`

# Modules

## CommunityModule
* **Status**: Completed
* **Features**: Create, update, get details, list communities, and soft delete.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## TowerModule
* **Status**: Completed
* **Features**: Create, update, list, and soft delete towers.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## UnitModule
* **Status**: Completed
* **Features**: Create, update, get details, list, search, and soft delete units.
* **Dependencies**: PrismaModule, TenantModule, AuditModule, TowerModule

## ResidentAssignmentModule
* **Status**: Completed
* **Features**: Assign resident to unit, remove assignment, list residents in a unit, list units for a resident, mark primary resident.
* **Dependencies**: PrismaModule, TenantModule, AuditModule, UnitModule

## GateEntryModule
* **Status**: Completed
* **Features**: Record visitor entry, record visitor exit.
* **Dependencies**: PrismaModule, TenantModule, GatePassModule, VisitorModule

## SuperAdminModule
* **Status**: Completed
* **Features**: Cross-tenant access, global dashboard stats, community activation, admin credentials provisioning.
* **Dependencies**: PrismaModule, AuditModule

## ResidentModule
* **Status**: Completed
* **Features**: Create resident, sequential username generator, status activation/suspension, unit reassignments, password resets.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## Billing & Financial Control Center Modules
* **Status**: Completed
* **Features**: Invoice cycle scheduling, automated invoicing runs, outstanding balance calculations, revenue metrics dashboard, payment logging, and AI financial risk analysis.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## MaintenanceModule
* **Status**: Completed
* **Features**: Interactive ticketing system, categorization, technician assignment, timelines, user comments, and files upload.
* **Dependencies**: PrismaModule, TenantModule, AuditModule, StorageModule

## Vendors & Contracts Modules
* **Status**: Completed
* **Features**: Vendor directory, contract trackers, compliance registers, AI Contract Renewal Intelligence (renewal notifications/alerts), and risk scoring models.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## SecurityGuardsModule
* **Status**: Completed
* **Features**: Roster schedules, shift gate assignments, clock-in/out attendance tracker, and incident reporting.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

## AnnouncementModule & AmenityModule
* **Status**: Completed
* **Features**: Notice announcements with read status tracking, Amenity bookings calendar, reservation conflicts prevention.
* **Dependencies**: PrismaModule, TenantModule, AuditModule

# API Documentation Index

### Auth
- `POST /api/v1/auth/login` - Authenticate user
- `POST /api/v1/auth/refresh` - Refresh access token

### Communities
- `POST /api/v1/communities` - Create community
- `GET /api/v1/communities` - List all communities (Super Admin)
- `GET /api/v1/communities/me` - Get own community
- `GET /api/v1/communities/:id` - Get community by ID
- `PATCH /api/v1/communities/:id` - Update community by ID
- `PATCH /api/v1/communities/me` - Update own community
- `DELETE /api/v1/communities/:id` - Soft delete community

### Towers
- `POST /api/v1/towers` - Create tower
- `GET /api/v1/towers` - List all towers
- `GET /api/v1/towers/:id` - Get tower by ID
- `PATCH /api/v1/towers/:id` - Update tower details
- `DELETE /api/v1/towers/:id` - Soft delete tower

### Units
- `POST /api/v1/units` - Create unit
- `GET /api/v1/units` - List and search units
- `GET /api/v1/units/:id` - Get unit by ID
- `PATCH /api/v1/units/:id` - Update unit details
- `DELETE /api/v1/units/:id` - Soft delete unit

### Resident Assignments
- `POST /api/v1/resident-assignments` - Assign resident to unit
- `GET /api/v1/resident-assignments/unit/:unitId` - List residents in unit
- `GET /api/v1/resident-assignments/user/:userId` - List units for a resident
- `PATCH /api/v1/resident-assignments/:id/primary` - Set primary resident
- `DELETE /api/v1/resident-assignments/:id` - Remove assignment

### Super Admin
- `GET /api/v1/super-admin/dashboard` - Get global statistics
- `GET /api/v1/super-admin/communities` - List all communities globally
- `GET /api/v1/super-admin/communities/:id` - Get specific community details
- `PATCH /api/v1/super-admin/communities/:id/activate` - Activate a community
- `PATCH /api/v1/super-admin/communities/:id/deactivate` - Deactivate a community
- `POST /api/v1/super-admin/community-admins` - Create a Community Admin
- `GET /api/v1/super-admin/community-admins` - List all Community Admins
- `POST /api/v1/super-admin/community-admins/:id/reset-password` - Reset Community Admin password

### Residents
- `POST /api/v1/residents` - Create a new resident
- `GET /api/v1/residents` - List and search residents
- `GET /api/v1/residents/dashboard` - Get resident dashboard stats
- `GET /api/v1/residents/:id` - Get resident details
- `PATCH /api/v1/residents/:id` - Update resident profile
- `POST /api/v1/residents/:id/family` - Add family member/sub-resident
- `PATCH /api/v1/residents/:id/units/reassign` - Reassign unit mapping
- `PATCH /api/v1/residents/:id/activate` - Activate resident
- `PATCH /api/v1/residents/:id/deactivate` - Deactivate resident
- `POST /api/v1/residents/:id/reset-password` - Reset resident password
- `GET /api/v1/residents/:id/units` - Get assigned units
- `GET /api/v1/residents/:id/current-unit` - Get primary assigned unit
- `POST /api/v1/residents/:id/send-otp` - Trigger password verification OTP
- `POST /api/v1/residents/:id/verify-otp` - Verify password update OTP

### Financial Control Center & Billing
- `POST /api/v1/billing/cycles` - Create invoice cycle
- `GET /api/v1/billing/cycles` - List invoice cycles
- `GET /api/v1/billing/cycles/:id` - Get invoice cycle details
- `POST /api/v1/billing/cycles/:id/generate` - Generate invoices for cycle
- `GET /api/v1/billing/invoices` - List invoices
- `GET /api/v1/billing/invoices/:id` - Get invoice details
- `POST /api/v1/billing/invoices/:id/payments` - Record payment for invoice
- `GET /api/v1/billing/my-invoices` - Get logged-in user's invoices
- `GET /api/v1/billing/dashboard/outstanding` - Get outstanding dashboard KPI values
- `GET /api/v1/financial-control-center/overview` - Financial dashboard overview metrics
- `GET /api/v1/financial-control-center/insights` - AI financial insights
- `GET /api/v1/financial-control-center/units` - List of property units status (billing status)
- `GET /api/v1/financial-control-center/defaulters` - Defaulters list
- `GET /api/v1/financial-control-center/analytics` - Revenue and payment collection analytics
- `GET /api/v1/financial-control-center/audit` - Financial transaction audit logs
- `PATCH /api/v1/financial-control-center/unit/:id` - Edit unit parameters/billing rate
- `POST /api/v1/financial-control-center/bulk-actions` - Perform bulk invoice actions

### Maintenance
- `POST /api/v1/maintenance/tickets` - Create a ticket
- `GET /api/v1/maintenance/my-tickets` - List logged in resident's tickets
- `GET /api/v1/maintenance/tickets` - List all tickets
- `GET /api/v1/maintenance/tickets/:id` - Get ticket details
- `PATCH /api/v1/maintenance/tickets/:id/status` - Update ticket status (e.g. OPEN -> IN_PROGRESS -> RESOLVED)
- `PATCH /api/v1/maintenance/tickets/:id/assign` - Assign staff to a ticket
- `GET /api/v1/maintenance/tickets/:id/timeline` - Get ticket audit trail and timeline
- `POST /api/v1/maintenance/tickets/:id/comments` - Add comment to a ticket
- `GET /api/v1/maintenance/tickets/:id/comments` - List comments of a ticket
- `PATCH /api/v1/maintenance/comments/:id` - Edit a comment
- `DELETE /api/v1/maintenance/comments/:id` - Delete a comment
- `POST /api/v1/maintenance/categories` - Create a maintenance category
- `GET /api/v1/maintenance/categories` - List categories
- `GET /api/v1/maintenance/categories/:id` - Get category
- `PATCH /api/v1/maintenance/categories/:id` - Update category
- `DELETE /api/v1/maintenance/categories/:id` - Delete category
- `POST /api/v1/maintenance/attachments` - Upload a maintenance attachment file
- `GET /api/v1/maintenance/attachments` - List attachments

### Announcements & Amenities
- `POST /api/v1/announcements` - Create announcement
- `GET /api/v1/announcements` - List announcements
- `GET /api/v1/announcements/my` - Get announcements for current logged-in resident
- `GET /api/v1/announcements/:id` - Get details of an announcement
- `PATCH /api/v1/announcements/:id` - Update announcement
- `POST /api/v1/announcements/:id/publish` - Publish announcement
- `POST /api/v1/announcements/:id/archive` - Archive announcement
- `POST /api/v1/announcements/:id/read` - Mark announcement as read by user
- `DELETE /api/v1/announcements/:id` - Delete announcement
- `POST /api/v1/amenities` - Register a community amenity
- `GET /api/v1/amenities` - List registered amenities
- `GET /api/v1/amenities/:id` - Get amenity details
- `PATCH /api/v1/amenities/:id` - Update amenity details
- `DELETE /api/v1/amenities/:id` - Delete amenity
- `GET /api/v1/amenities/reservations` - List all reservations
- `GET /api/v1/amenities/reservations/calendar` - Calendar view of reservations
- `POST /api/v1/amenities/reservations` - Book/reserve an amenity
- `PATCH /api/v1/amenities/reservations/:id` - Update reservation details
- `DELETE /api/v1/amenities/reservations/:id` - Cancel reservation

### Vendors & Contracts
- `GET /api/v1/vendors` - List and search outsourced vendors
- `GET /api/v1/vendors/dashboard` - Get vendor dashboard stats
- `GET /api/v1/vendors/analytics` - Operational costs and contract value charts
- `GET /api/v1/vendors/performance` - Vendor ratings and log entries
- `GET /api/v1/vendors/contracts` - Get contracts
- `GET /api/v1/vendors/work-orders` - List work orders
- `GET /api/v1/vendors/compliance` - List compliance logs
- `GET /api/v1/vendors/payments` - List vendor invoices/payments
- `GET /api/v1/vendors/blacklist` - Track blacklisted vendors
- `GET /api/v1/vendors/renewal-intelligence` - AI-based contract renewal intelligence alerts
- `GET /api/v1/vendors/audit` - Change logs for vendor records

### Security & Guards Operations
- `GET /api/v1/security/dashboard` - Security operations center KPI summary
- `GET /api/v1/security/activity-feed` - Real-time gates activity logs
- `GET /api/v1/security/visitors` - Registered visitor list
- `GET /api/v1/security/deliveries` - Dynamic deliveries tracking
- `GET /api/v1/security/vendors` - Regular vendors checkins
- `GET /api/v1/security/service-staff` - Verified staff lists
- `GET /api/v1/security/vehicles` - Vehicle checks
- `GET /api/v1/security/currently-inside` - Logs of individuals currently inside the complex
- `GET /api/v1/security/emergency-roll-call` - Roll call snapshot in emergencies
- `GET /api/v1/security/alerts` - Rerouted emergency alerts
- `GET /api/v1/security/analytics` - Entry/exit traffic volumes
- `GET /api/v1/security/guards` - Shift guards schedules
- `GET /api/v1/security/watchlist` - Flagged suspects database
- `POST /api/v1/security/watchlist` - Add entry to watchlist
- `PATCH /api/v1/security/watchlist/:id` - Update watchlist details
- `GET /api/v1/security-guards/dashboard` - Guards performance metrics
- `GET /api/v1/security-guards` - List security guards
- `GET /api/v1/security-guards/shifts` - Roster assignments
- `GET /api/v1/security-guards/attendance` - Shift check-in/out records
- `GET /api/v1/security-guards/incidents` - Incident reporting log
- `GET /api/v1/security-guards/performance` - Performance audit logs
- `GET /api/v1/security-guards/audit` - Guards metadata logs
- `POST /api/v1/security-guards/incidents` - Record a new security incident
- `PATCH /api/v1/security-guards/:id` - Edit guard record details
- `PATCH /api/v1/security-guards/shifts/:id` - Reassign shift

### Bulk Imports
- `POST /api/v1/imports` - Trigger bulk import job
- `GET /api/v1/imports` - List historical import jobs
- `GET /api/v1/imports/:id` - Get specific job parameters
- `GET /api/v1/imports/:id/status` - Get job completion status
- `GET /api/v1/imports/:id/errors` - Query failed rows and validation messages
- `GET /api/v1/imports/:id/result` - Query result details (created IDs)

# Development Timeline

* **[Phase 1] Backend Foundation**: Completed base infrastructure including Supabase auth, multi-tenancy middleware, audit interceptors, and error handling.
* **[Phase 1] Property Management**: Completed creation of `Community`, `Tower`, `Unit`, and `ResidentAssignment` modules with comprehensive testing and swagger integrations.
* **[Phase 2] Operations & Guards**: Implemented `VendorModule` contract registries, `SecurityGuardModule` shifts scheduling, gate assignments, incident logging, and visitor QR codes. Integrated front-end layouts.
* **[Phase 3] Financial & Core Utilities**: Implemented Billing Cycles scheduler, automated invoicing runs, outstanding collections dashboard, Maintenance board with categories/technicians and comments timeline, announcements read status trackers, and amenities booking calendars. Verified live integrations.

# Decisions Log

* **Multi-tenancy Strategy**: Chose a shared database and shared schema model relying on logical isolation (`communityId`). This approach scales better regarding migration management and aggregate analytics compared to schema-per-tenant, effectively securing data using a request-scoped `BaseRepository`.
* **Authentication Service**: Custom Local JWT authentication replacing Supabase Auth. Includes a top-down onboarding hierarchy, account locking, and first-login password enforcement.
* **Security Guard Architecture**: Decided NOT to create a separate `GUARD` system role to minimize complexity. Security Guards are structured as `User` entities linked to a `StaffProfile` with the `StaffCategory.SECURITY_GUARD` enum. This allows integration into existing personnel structures and avoids redundant HR schemas. Phase 2 will introduce complex HR features (Leaves/Compliance).
* **Audit Logging**: Handled via asynchronous (fire-and-forget) service execution and global interceptor bindings. This guarantees an immutable audit trail for all modification endpoints (`POST`, `PATCH`, `DELETE`) without blocking fast request response times.
* **Double-Entry Financial Integrity**: Invoices are structured with individual line-items and connected to automated Billing Cycles. Collection updates run transactionally to avoid records mismatch.
* **Contract Renewal Intelligence**: Contract renewals calculate risk indices based on past performance ratings, compliance status, and billing deviation percentages to assist administrative decisions.
* **Local Storage Service**: Enabled local uploading of invoice reports and maintenance logs attachments using a static folder mapping (`/uploads`).

# Next Recommended Task

* Integrate notification delivery gateways (such as Twilio SMS and SendGrid email) to automatically notify residents when billing cycles trigger or announcements are published.
