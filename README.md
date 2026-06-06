# Society Manager - Backend API

A comprehensive, multi-tenant SaaS backend for managing residential societies, commercial complexes, and gated communities. 

This repository contains the backend architecture developed using a Modular Monolith approach.

## 🚀 Tech Stack

- **Framework:** [NestJS](https://nestjs.com/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** PostgreSQL (Hosted on [Supabase](https://supabase.com/))
- **Authentication:** Supabase Auth (JWTs)
- **Testing:** Jest

## 🏗️ Architecture Highlights

- **Multi-Tenancy:** We utilize a shared database and shared schema model. Tenant isolation is managed via a logical `communityId` enforced safely through a custom `BaseRepository`.
- **Role-Based Access Control (RBAC):** Access to endpoints is secured globally using a Supabase Auth Guard, paired with `@Roles()` decorators for granular permissions (`SUPER_ADMIN`, `COMMUNITY_ADMIN`, `GUARD`, `RESIDENT`, etc.).
- **Audit Logging:** An asynchronous, non-blocking `AuditService` coupled with a global interceptor guarantees an immutable audit trail for all modifications (`CREATE`, `UPDATE`, `SOFT_DELETE`).

## 📦 Implemented Modules

Currently, the following core domains are fully implemented and unit-tested:

1. **Property Management**
   - `CommunityModule`: Manage multi-tenant roots.
   - `TowerModule`: Manage towers/blocks inside a community.
   - `UnitModule`: Manage physical flats/villas/shops.
   - `ResidentAssignmentModule`: Manage resident occupancy and primary allocations.

2. **Visitor Management**
   - `VisitorModule`: Manage pre-approved and on-arrival visitor requests.
   - `GatePassModule`: Secure QR token and passcode generation for physical gate entry.
   - `GateEntryModule`: Immutable logging of guard-verified physical entries and exits.

*(For detailed, up-to-date documentation on endpoints, features, and pending work, please see the [PROJECT_STATUS.md](./PROJECT_STATUS.md))*

## ⚙️ Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/Anushka-chaurasia-prog/society-manager.git
cd society-manager
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the sample environment file and fill in your Supabase credentials:
```bash
cp .env.example .env
```
Ensure you provide the correct `DATABASE_URL` (PgBouncer connection pooler) and `DIRECT_URL` (for Prisma migrations), along with your Supabase JWT secrets.

### 4. Database Setup
Push the schema to your PostgreSQL instance and generate the Prisma Client:
```bash
npx prisma db push
npx prisma generate
```

### 5. Run the Application
```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## 🧪 Testing

The codebase includes comprehensive unit tests for all business logic services.

```bash
# run all unit tests
npm run test

# watch mode
npm run test:watch

# test coverage
npm run test:cov
```
