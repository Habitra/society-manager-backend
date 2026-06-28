# Habitra Backend Security Policy

This document serves as the primary security handbook for all developers contributing to the Habitra Backend.

Our architecture prioritizes a **Default Deny** zero-trust model tailored specifically for our early-stage startup context.

For the full architectural specification, refer to the **Habitra Security Blueprint v2.1** (internal artifact).

## 1. Authentication

Habitra uses a custom Local JWT authentication flow. 
- **Legacy Supabase Auth** has been completely deprecated and removed.
- Access tokens expire in 15 minutes.
- The `JWT_SECRET` and `JWT_REFRESH_SECRET` must be cryptographically secure strings of at least 32 characters. 
- If these secrets are missing or too short, the application will refuse to start in production.

## 2. Default Deny Architecture

The backend operates on a strict **Default Deny** architecture via the global `RolesGuard`.

**If you create a new endpoint, it will throw a `403 Forbidden` by default unless you explicitly annotate it.**

### Securing Your Routes

When adding a new route, you **must** apply one of the following decorators:

1. **`@Roles(UserRole.X, ...)`**
   Use this to restrict a route to specific roles (e.g., `COMMUNITY_ADMIN`, `GUARD`).
   ```typescript
   @Roles(UserRole.COMMUNITY_ADMIN, UserRole.MANAGER)
   @Get('analytics')
   getAnalytics() {}
   ```

2. **`@AuthenticatedOnly()`**
   Use this if the route requires a valid JWT, but does not require a specific role (e.g., fetching one's own profile).
   ```typescript
   @AuthenticatedOnly()
   @Get('profile')
   getProfile() {}
   ```

3. **`@Public()`**
   Use this ONLY for routes that must be accessible without authentication (e.g., login, password reset).
   ```typescript
   @Public()
   @Post('login')
   login() {}
   ```

*Note: You can apply these decorators at the class level to protect all routes within a controller.*

## 3. Multi-Tenancy

Habitra is a multi-tenant platform. Tenant isolation is strictly enforced at the data access layer via `BaseRepository`.

- You do **not** need to manually query `where: { communityId }` in your services.
- The `JwtAuthGuard` securely extracts the `communityId` from the verified JWT payload and injects it into the `TenantContextService`.
- The `BaseRepository` automatically scopes all `find`, `update`, and `delete` operations to the authenticated user's community.

## 4. Secrets Hygiene

- **Never** commit `.env`, `.env.production`, `.env.staging`, `*.pem`, or `*.key` files.
- The `.env.example` file is actively maintained and serves as the template for local development. Do not add real secrets to it.
- Audit logs are automatically written for critical actions (e.g., login, logout, soft deletes). Do not bypass the `AuditService`.

## 5. Production Seeding

The Prisma seeder (`prisma/seed.ts`) is designed exclusively for local development and contains dummy passwords and mock tenant data.
- It is strictly configured to `process.exit(0)` if executed when `NODE_ENV === 'production'`.
- To bootstrap a live production environment, use the dedicated Super Admin CLI tooling instead.
