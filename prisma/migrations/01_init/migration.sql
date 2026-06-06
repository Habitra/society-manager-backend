-- =============================================================================
-- Society Management SaaS - Phase 1 Database Migration
-- =============================================================================
-- Migration  : 01_init
-- Database   : PostgreSQL 15+
-- Tenancy    : Shared Database, Shared Schema (community_id on all tables)
-- Auth       : Supabase (auth.users → public.users)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE community_status AS ENUM (
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED'
);

CREATE TYPE community_type AS ENUM (
  'APARTMENT_COMPLEX',
  'GATED_COLONY',
  'VILLA_COMPLEX',
  'COMMERCIAL'
);

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'COMMUNITY_ADMIN',
  'MANAGER',
  'GUARD',
  'STAFF',
  'RESIDENT',
  'FAMILY_MEMBER'
);

CREATE TYPE user_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING_VERIFICATION'
);

CREATE TYPE unit_occupancy_type AS ENUM (
  'OWNER',
  'TENANT',
  'VACANT'
);

CREATE TYPE unit_type AS ENUM (
  'APARTMENT',
  'VILLA',
  'PLOT',
  'SHOP',
  'OFFICE',
  'PENTHOUSE'
);

CREATE TYPE visitor_type AS ENUM (
  'GUEST',
  'DELIVERY',
  'DOMESTIC_HELP',
  'SERVICE',
  'CAB',
  'VENDOR',
  'CONTRACTOR',
  'EMERGENCY'
);

CREATE TYPE gate_pass_status AS ENUM (
  'PENDING',
  'APPROVED',
  'DENIED',
  'EXPIRED',
  'CANCELLED',
  'USED'
);

CREATE TYPE ticket_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE ticket_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
  'REOPENED'
);

CREATE TYPE invoice_cycle_frequency AS ENUM (
  'MONTHLY',
  'QUARTERLY',
  'HALF_YEARLY',
  'YEARLY',
  'ONE_TIME'
);

CREATE TYPE invoice_status AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'DISPUTED',
  'WAIVED'
);

CREATE TYPE payment_mode AS ENUM (
  'UPI',
  'NETBANKING',
  'CARD',
  'NEFT_RTGS',
  'CHEQUE',
  'CASH',
  'WALLET'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

CREATE TYPE announcement_scope AS ENUM (
  'ALL_RESIDENTS',
  'SPECIFIC_TOWER',
  'SPECIFIC_UNIT',
  'ADMINS_ONLY',
  'GUARDS_ONLY',
  'STAFF_ONLY'
);

CREATE TYPE announcement_category AS ENUM (
  'GENERAL',
  'MAINTENANCE',
  'EMERGENCY',
  'EVENT',
  'BILLING',
  'SECURITY',
  'POLICY'
);

CREATE TYPE notification_channel AS ENUM (
  'PUSH',
  'SMS',
  'EMAIL',
  'IN_APP',
  'WHATSAPP'
);

CREATE TYPE vehicle_type AS ENUM (
  'TWO_WHEELER',
  'THREE_WHEELER',
  'FOUR_WHEELER',
  'HEAVY_VEHICLE'
);

CREATE TYPE staff_category AS ENUM (
  'SECURITY_GUARD',
  'HOUSEKEEPING',
  'PLUMBER',
  'ELECTRICIAN',
  'CARPENTER',
  'LIFT_TECHNICIAN',
  'GARDENER',
  'ACCOUNTS',
  'MANAGER',
  'OTHER'
);

CREATE TYPE audit_action AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'SOFT_DELETE',
  'RESTORE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'PERMISSION_CHANGE'
);

-- =============================================================================
-- TABLE: communities
-- =============================================================================
-- Root entity for every tenant. Every other business table has a FK to this.
-- Deletion is blocked (RESTRICT) to protect data integrity.
-- Use status='ARCHIVED' to deactivate a community.
-- =============================================================================

CREATE TABLE communities (
  id              UUID          NOT NULL DEFAULT gen_random_uuid(),
  name            VARCHAR(200)  NOT NULL,
  slug            VARCHAR(100)  NOT NULL,          -- URL-safe tenant identifier
  type            community_type NOT NULL,
  status          community_status NOT NULL DEFAULT 'PENDING',
  logo_url        TEXT,
  address         JSONB         NOT NULL DEFAULT '{}',
  geo_location    JSONB,
  contact_email   VARCHAR(254)  NOT NULL,
  contact_phone   VARCHAR(20)   NOT NULL,
  timezone        VARCHAR(50)   NOT NULL DEFAULT 'Asia/Kolkata',
  currency        CHAR(3)       NOT NULL DEFAULT 'INR',
  total_units     INTEGER       NOT NULL DEFAULT 0,
  settings        JSONB         NOT NULL DEFAULT '{}',
  metadata        JSONB         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT pk_communities           PRIMARY KEY (id),
  CONSTRAINT uq_communities_slug      UNIQUE (slug),
  CONSTRAINT chk_communities_currency CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT chk_communities_email    CHECK (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT chk_communities_units    CHECK (total_units >= 0)
);

-- Indexes for communities
CREATE INDEX idx_communities_status     ON communities (status)     WHERE deleted_at IS NULL;
CREATE INDEX idx_communities_deleted_at ON communities (deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE  communities             IS 'Root tenant entity. Every other table is scoped to a community.';
COMMENT ON COLUMN communities.slug        IS 'URL-safe, globally unique slug. Used in subdomains and API routing.';
COMMENT ON COLUMN communities.settings    IS 'Per-tenant feature flags and configuration knobs.';
COMMENT ON COLUMN communities.deleted_at  IS 'Soft delete marker. NULL means active.';

-- =============================================================================
-- TABLE: towers
-- =============================================================================
-- Optional grouping of units. Flat societies without towers won't use this.
-- Tower code must be unique within a community.
-- =============================================================================

CREATE TABLE towers (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID         NOT NULL,
  name         VARCHAR(100) NOT NULL,
  code         VARCHAR(20)  NOT NULL,
  total_floors INTEGER      NOT NULL DEFAULT 0,
  total_units  INTEGER      NOT NULL DEFAULT 0,
  amenities    JSONB        NOT NULL DEFAULT '[]',
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT pk_towers                    PRIMARY KEY (id),
  CONSTRAINT fk_towers_community          FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT uq_towers_community_code     UNIQUE (community_id, code),
  CONSTRAINT chk_towers_floors            CHECK (total_floors >= 0),
  CONSTRAINT chk_towers_units             CHECK (total_units  >= 0)
);

CREATE INDEX idx_towers_community_id         ON towers (community_id);
CREATE INDEX idx_towers_community_deleted_at ON towers (community_id, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE towers IS 'Optional tower/block grouping within a community. Villas/plots may have no towers.';

-- =============================================================================
-- TABLE: units
-- =============================================================================
-- The smallest addressable and billable entity. Flats, shops, villas, plots.
--
-- DESIGN DECISION — Conditional Unique Constraint:
--   In a multi-tower society, "Unit 101" exists in Tower A AND Tower B.
--   A single unique(community_id, unit_number) would incorrectly prevent this.
--   We use TWO partial unique indexes:
--     1. When tower_id IS NOT NULL → unique per tower
--     2. When tower_id IS NULL     → unique per community
-- =============================================================================

CREATE TABLE units (
  id           UUID                NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID                NOT NULL,
  tower_id     UUID,
  unit_number  VARCHAR(20)         NOT NULL,
  floor        INTEGER,
  type         unit_type           NOT NULL DEFAULT 'APARTMENT',
  occupancy    unit_occupancy_type NOT NULL DEFAULT 'VACANT',
  area_sq_ft   DECIMAL(8,2),
  bedrooms     SMALLINT,
  bathrooms    SMALLINT,
  is_commercial BOOLEAN            NOT NULL DEFAULT FALSE,
  metadata     JSONB               NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT pk_units                 PRIMARY KEY (id),
  CONSTRAINT fk_units_community       FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_units_tower           FOREIGN KEY (tower_id)     REFERENCES towers (id)      ON DELETE SET NULL,
  CONSTRAINT chk_units_area           CHECK (area_sq_ft   IS NULL OR area_sq_ft   > 0),
  CONSTRAINT chk_units_bedrooms       CHECK (bedrooms     IS NULL OR bedrooms     >= 0),
  CONSTRAINT chk_units_bathrooms      CHECK (bathrooms    IS NULL OR bathrooms    >= 0)
);

-- Partial unique indexes for unit_number uniqueness (see design note above)
CREATE UNIQUE INDEX uq_units_tower_number
  ON units (tower_id, unit_number)
  WHERE tower_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX uq_units_community_number
  ON units (community_id, unit_number)
  WHERE tower_id IS NULL AND deleted_at IS NULL;

CREATE INDEX idx_units_community_id          ON units (community_id);
CREATE INDEX idx_units_tower_id              ON units (tower_id) WHERE tower_id IS NOT NULL;
CREATE INDEX idx_units_community_occupancy   ON units (community_id, occupancy);
CREATE INDEX idx_units_community_deleted_at  ON units (community_id, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE  units            IS 'Smallest addressable unit. Each flat, villa, shop or plot.';
COMMENT ON COLUMN units.tower_id   IS 'NULL for villa/plot communities without tower groupings.';
COMMENT ON COLUMN units.occupancy  IS 'Drives billing logic: OWNER invoices vs TENANT invoices.';

-- =============================================================================
-- TABLE: users
-- =============================================================================
-- Core identity table. id is a FK to Supabase auth.users(id).
-- A user belongs to exactly ONE community. Cross-community users
-- are separate rows (with the same Supabase auth id is intentionally
-- NOT enforced here because one person can manage multiple societies).
-- =============================================================================

CREATE TABLE users (
  id           UUID         NOT NULL,  -- Comes from Supabase auth.users.id
  community_id UUID         NOT NULL,
  role         user_role    NOT NULL,
  status       user_status  NOT NULL DEFAULT 'PENDING_VERIFICATION',
  email        VARCHAR(254) NOT NULL,
  phone        VARCHAR(20),
  display_name VARCHAR(200) NOT NULL,
  avatar_url   TEXT,
  fcm_token    TEXT,
  last_login_at TIMESTAMPTZ,
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT pk_users               PRIMARY KEY (id),
  CONSTRAINT fk_users_community     FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  -- NOTE: FK to auth.users is enforced at the application layer via Supabase triggers.
  -- A raw SQL FK is possible only if both tables are in the same Postgres schema.
  -- For Supabase, auth.users is in the 'auth' schema. The app ensures referential integrity.
  CONSTRAINT uq_users_community_email UNIQUE (community_id, email),
  CONSTRAINT chk_users_email          CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE INDEX idx_users_community_id         ON users (community_id);
CREATE INDEX idx_users_community_role       ON users (community_id, role);
CREATE INDEX idx_users_community_status     ON users (community_id, status);
CREATE INDEX idx_users_email                ON users (email);
CREATE INDEX idx_users_community_deleted_at ON users (community_id, deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE  users         IS 'Platform user. id references Supabase auth.users(id).';
COMMENT ON COLUMN users.id      IS 'UUID from Supabase auth.users. Do NOT generate here.';
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging push token. Overwritten on each login.';

-- =============================================================================
-- TABLE: resident_profiles
-- =============================================================================
-- Extended attributes for RESIDENT and FAMILY_MEMBER roles.
-- One-to-one with users.
-- =============================================================================

CREATE TABLE resident_profiles (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL,
  community_id         UUID        NOT NULL,
  is_owner             BOOLEAN     NOT NULL DEFAULT TRUE,
  occupation           VARCHAR(200),
  date_of_birth        DATE,
  emergency_contact    JSONB,
  vehicle_count        SMALLINT    NOT NULL DEFAULT 0,
  is_committee_member  BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata             JSONB       NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,

  CONSTRAINT pk_resident_profiles             PRIMARY KEY (id),
  CONSTRAINT fk_resident_profiles_user        FOREIGN KEY (user_id)      REFERENCES users (id)       ON DELETE CASCADE,
  CONSTRAINT uq_resident_profiles_user        UNIQUE (user_id),
  CONSTRAINT chk_resident_profiles_vehicle_count CHECK (vehicle_count >= 0)
);

CREATE INDEX idx_resident_profiles_community_id ON resident_profiles (community_id);
CREATE INDEX idx_resident_profiles_is_owner     ON resident_profiles (community_id, is_owner);

-- =============================================================================
-- TABLE: admin_profiles
-- =============================================================================
-- Extended attributes for COMMUNITY_ADMIN and MANAGER roles.
-- =============================================================================

CREATE TABLE admin_profiles (
  id                       UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL,
  community_id             UUID        NOT NULL,
  designation              VARCHAR(200),
  permissions              JSONB       NOT NULL DEFAULT '[]',
  can_approve_gates        BOOLEAN     NOT NULL DEFAULT FALSE,
  can_manage_billing       BOOLEAN     NOT NULL DEFAULT FALSE,
  can_publish_announcements BOOLEAN   NOT NULL DEFAULT FALSE,
  metadata                 JSONB       NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ,

  CONSTRAINT pk_admin_profiles          PRIMARY KEY (id),
  CONSTRAINT fk_admin_profiles_user     FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT uq_admin_profiles_user     UNIQUE (user_id)
);

CREATE INDEX idx_admin_profiles_community_id ON admin_profiles (community_id);

-- =============================================================================
-- TABLE: staff_profiles
-- =============================================================================
-- Extended attributes for GUARD and STAFF roles.
-- employee_code is unique within a community.
-- =============================================================================

CREATE TABLE staff_profiles (
  id             UUID           NOT NULL DEFAULT gen_random_uuid(),
  user_id        UUID           NOT NULL,
  community_id   UUID           NOT NULL,
  employee_code  VARCHAR(50),
  category       staff_category NOT NULL,
  shift          VARCHAR(50),
  shift_start    TIME,
  shift_end      TIME,
  joining_date   DATE,
  identity_proof JSONB,
  agency_name    VARCHAR(200),
  is_outsourced  BOOLEAN        NOT NULL DEFAULT FALSE,
  rating         DECIMAL(3,2),
  metadata       JSONB          NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT pk_staff_profiles                 PRIMARY KEY (id),
  CONSTRAINT fk_staff_profiles_user            FOREIGN KEY (user_id)      REFERENCES users (id)       ON DELETE CASCADE,
  CONSTRAINT fk_staff_profiles_community       FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT uq_staff_profiles_user            UNIQUE (user_id),
  CONSTRAINT uq_staff_profiles_emp_code        UNIQUE (community_id, employee_code),
  CONSTRAINT chk_staff_profiles_rating         CHECK (rating IS NULL OR (rating >= 0.00 AND rating <= 5.00))
);

CREATE INDEX idx_staff_profiles_community_id       ON staff_profiles (community_id);
CREATE INDEX idx_staff_profiles_community_category ON staff_profiles (community_id, category);

-- =============================================================================
-- TABLE: resident_unit_assignments
-- =============================================================================
-- Many-to-many junction: a user can occupy multiple units;
-- a unit can have multiple residents.
-- Only ONE assignment per unit should have is_primary = TRUE (enforced in app).
-- =============================================================================

CREATE TABLE resident_unit_assignments (
  id            UUID                NOT NULL DEFAULT gen_random_uuid(),
  community_id  UUID                NOT NULL,
  user_id       UUID                NOT NULL,
  unit_id       UUID                NOT NULL,
  occupancy     unit_occupancy_type NOT NULL,
  is_primary    BOOLEAN             NOT NULL DEFAULT FALSE,
  move_in_date  DATE,
  move_out_date DATE,
  lease_end_date DATE,
  metadata      JSONB               NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,

  CONSTRAINT pk_resident_unit_assignments          PRIMARY KEY (id),
  CONSTRAINT fk_rua_community                      FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_rua_user                           FOREIGN KEY (user_id)      REFERENCES users (id)       ON DELETE CASCADE,
  CONSTRAINT fk_rua_unit                           FOREIGN KEY (unit_id)      REFERENCES units (id)       ON DELETE RESTRICT,
  CONSTRAINT chk_rua_dates                         CHECK (
    move_out_date IS NULL OR move_in_date IS NULL OR move_out_date >= move_in_date
  )
);

-- Prevent duplicate active assignments (partial unique index)
CREATE UNIQUE INDEX uq_rua_active_user_unit
  ON resident_unit_assignments (user_id, unit_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_rua_community_id         ON resident_unit_assignments (community_id);
CREATE INDEX idx_rua_unit_id              ON resident_unit_assignments (unit_id);
CREATE INDEX idx_rua_user_id              ON resident_unit_assignments (user_id);
CREATE INDEX idx_rua_community_deleted_at ON resident_unit_assignments (community_id, deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: vehicles
-- =============================================================================
-- Vehicle registry. Vehicle plate is unique globally in the real world,
-- but we allow re-registration after soft-delete via the unique partial index.
-- =============================================================================

CREATE TABLE vehicles (
  id             UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id   UUID         NOT NULL,
  user_id        UUID         NOT NULL,
  unit_id        UUID,
  vehicle_number VARCHAR(20)  NOT NULL,
  type           vehicle_type NOT NULL,
  make           VARCHAR(100),
  model          VARCHAR(100),
  color          VARCHAR(50),
  rfid_tag       VARCHAR(100),
  sticker_number VARCHAR(50),
  is_verified    BOOLEAN      NOT NULL DEFAULT FALSE,
  metadata       JSONB        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT pk_vehicles              PRIMARY KEY (id),
  CONSTRAINT fk_vehicles_community    FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_vehicles_user         FOREIGN KEY (user_id)      REFERENCES users (id)       ON DELETE CASCADE,
  CONSTRAINT fk_vehicles_unit         FOREIGN KEY (unit_id)      REFERENCES units (id)       ON DELETE SET NULL,
  CONSTRAINT chk_vehicles_number      CHECK (vehicle_number <> '')
);

-- Allow same plate to be re-registered after soft delete
CREATE UNIQUE INDEX uq_vehicles_number_active
  ON vehicles (vehicle_number)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_vehicles_community_id      ON vehicles (community_id);
CREATE INDEX idx_vehicles_community_user_id ON vehicles (community_id, user_id);
CREATE INDEX idx_vehicles_vehicle_number    ON vehicles (vehicle_number);

-- =============================================================================
-- TABLE: visitor_requests
-- =============================================================================
-- A pre-authorization created by a resident for an expected visitor.
-- Supports one-time, date-range, and recurring (daily-help) visitors.
-- =============================================================================

CREATE TABLE visitor_requests (
  id              UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id    UUID         NOT NULL,
  requested_by_id UUID         NOT NULL,
  unit_id         UUID         NOT NULL,
  visitor_name    VARCHAR(200) NOT NULL,
  visitor_phone   VARCHAR(20),
  visitor_photo   TEXT,
  vehicle_number  VARCHAR(20),
  visitor_type    visitor_type NOT NULL,
  purpose         VARCHAR(500),
  valid_from      TIMESTAMPTZ  NOT NULL,
  valid_until     TIMESTAMPTZ,
  is_recurring    BOOLEAN      NOT NULL DEFAULT FALSE,
  recurring_days  JSONB,
  allowed_entries INTEGER      NOT NULL DEFAULT 1,
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT pk_visitor_requests             PRIMARY KEY (id),
  CONSTRAINT fk_vr_community                 FOREIGN KEY (community_id)    REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_vr_requested_by              FOREIGN KEY (requested_by_id) REFERENCES users (id)       ON DELETE RESTRICT,
  CONSTRAINT fk_vr_unit                      FOREIGN KEY (unit_id)         REFERENCES units (id)       ON DELETE RESTRICT,
  CONSTRAINT chk_vr_valid_window             CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT chk_vr_allowed_entries          CHECK (allowed_entries = -1 OR allowed_entries > 0),
  CONSTRAINT chk_vr_recurring_requires_days  CHECK (
    is_recurring = FALSE OR recurring_days IS NOT NULL
  )
);

CREATE INDEX idx_vr_community_id            ON visitor_requests (community_id);
CREATE INDEX idx_vr_community_requested_by  ON visitor_requests (community_id, requested_by_id);
CREATE INDEX idx_vr_community_unit_id       ON visitor_requests (community_id, unit_id);
CREATE INDEX idx_vr_community_valid_window  ON visitor_requests (community_id, valid_from, valid_until);
CREATE INDEX idx_vr_community_deleted_at    ON visitor_requests (community_id, deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: gate_passes
-- =============================================================================
-- One gate pass per visitor request. Contains the QR + passCode credential.
-- Pass code is short (human-readable). QR token is long and cryptographic.
-- =============================================================================

CREATE TABLE gate_passes (
  id                 UUID             NOT NULL DEFAULT gen_random_uuid(),
  community_id       UUID             NOT NULL,
  visitor_request_id UUID             NOT NULL,
  qr_token           VARCHAR(500)     NOT NULL,
  pass_code          VARCHAR(10)      NOT NULL,
  status             gate_pass_status NOT NULL DEFAULT 'PENDING',
  approved_by_id     UUID,
  approved_at        TIMESTAMPTZ,
  denied_reason      VARCHAR(500),
  expires_at         TIMESTAMPTZ      NOT NULL,
  metadata           JSONB            NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,

  CONSTRAINT pk_gate_passes                  PRIMARY KEY (id),
  CONSTRAINT fk_gp_visitor_request           FOREIGN KEY (visitor_request_id) REFERENCES visitor_requests (id) ON DELETE RESTRICT,
  CONSTRAINT fk_gp_approved_by               FOREIGN KEY (approved_by_id)     REFERENCES users (id)            ON DELETE SET NULL,
  CONSTRAINT uq_gate_passes_visitor_request  UNIQUE (visitor_request_id),
  CONSTRAINT uq_gate_passes_qr_token         UNIQUE (qr_token),
  CONSTRAINT chk_gp_approved_requires_at     CHECK (
    approved_by_id IS NULL OR approved_at IS NOT NULL
  ),
  CONSTRAINT chk_gp_denied_requires_reason   CHECK (
    status <> 'DENIED' OR denied_reason IS NOT NULL
  )
);

-- Pass code unique within community for ACTIVE passes only
CREATE UNIQUE INDEX uq_gp_community_pass_code_active
  ON gate_passes (community_id, pass_code)
  WHERE status IN ('PENDING', 'APPROVED') AND deleted_at IS NULL;

CREATE INDEX idx_gp_community_id     ON gate_passes (community_id);
CREATE INDEX idx_gp_community_status ON gate_passes (community_id, status);
CREATE INDEX idx_gp_qr_token         ON gate_passes (qr_token);
CREATE INDEX idx_gp_expires_at       ON gate_passes (community_id, expires_at);

-- =============================================================================
-- TABLE: gate_entries
-- =============================================================================
-- Physical entry/exit events logged by the guard.
-- These are immutable audit records: NO soft delete.
-- A single visitor request can have multiple entries (recurring/multi-use passes).
-- =============================================================================

CREATE TABLE gate_entries (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  community_id       UUID        NOT NULL,
  visitor_request_id UUID,
  gate_pass_id       UUID,
  guard_id           UUID,
  visitor_name       VARCHAR(200) NOT NULL,
  vehicle_number     VARCHAR(20),
  is_vehicle_entry   BOOLEAN     NOT NULL DEFAULT FALSE,
  in_time            TIMESTAMPTZ NOT NULL,
  out_time           TIMESTAMPTZ,
  photo              TEXT,
  notes              VARCHAR(500),
  metadata           JSONB       NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_gate_entries            PRIMARY KEY (id),
  CONSTRAINT fk_ge_visitor_request      FOREIGN KEY (visitor_request_id) REFERENCES visitor_requests (id) ON DELETE SET NULL,
  CONSTRAINT fk_ge_gate_pass            FOREIGN KEY (gate_pass_id)       REFERENCES gate_passes (id)      ON DELETE SET NULL,
  CONSTRAINT chk_ge_out_after_in        CHECK (out_time IS NULL OR out_time > in_time)
  -- guard_id is intentionally NOT a FK to allow walk-in entries by unknown guards
  -- and prevent cascading issues; guard identity is validated at app layer
);

CREATE INDEX idx_ge_community_id          ON gate_entries (community_id);
CREATE INDEX idx_ge_community_gate_pass   ON gate_entries (community_id, gate_pass_id);
CREATE INDEX idx_ge_community_in_time     ON gate_entries (community_id, in_time);
CREATE INDEX idx_ge_community_visitor_req ON gate_entries (community_id, visitor_request_id);

-- =============================================================================
-- TABLE: maintenance_categories
-- =============================================================================
-- Two-level category hierarchy (parent → child).
-- e.g. "Plumbing" → "Water Leakage", "Blockage"
-- =============================================================================

CREATE TABLE maintenance_categories (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID         NOT NULL,
  parent_id    UUID,
  name         VARCHAR(200) NOT NULL,
  icon         VARCHAR(100),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_maintenance_categories            PRIMARY KEY (id),
  CONSTRAINT fk_mc_community                      FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_mc_parent                         FOREIGN KEY (parent_id)    REFERENCES maintenance_categories (id) ON DELETE SET NULL,
  CONSTRAINT uq_mc_community_name_parent          UNIQUE (community_id, name, parent_id),
  CONSTRAINT chk_mc_no_self_reference             CHECK (id <> parent_id)
);

CREATE INDEX idx_mc_community_id     ON maintenance_categories (community_id);
CREATE INDEX idx_mc_community_active ON maintenance_categories (community_id, is_active);

-- =============================================================================
-- TABLE: maintenance_tickets
-- =============================================================================
-- Core complaint/service request. Can be raised for a unit or common area.
-- ticket_number is human-readable and community-unique (e.g. "TKT-2024-0001").
-- =============================================================================

CREATE TABLE maintenance_tickets (
  id              UUID           NOT NULL DEFAULT gen_random_uuid(),
  community_id    UUID           NOT NULL,
  unit_id         UUID,
  category_id     UUID           NOT NULL,
  raised_by_id    UUID           NOT NULL,
  assigned_to_id  UUID,
  ticket_number   VARCHAR(30)    NOT NULL,
  title           VARCHAR(500)   NOT NULL,
  description     TEXT           NOT NULL,
  priority        ticket_priority NOT NULL DEFAULT 'MEDIUM',
  status          ticket_status   NOT NULL DEFAULT 'OPEN',
  is_common_area  BOOLEAN         NOT NULL DEFAULT FALSE,
  scheduled_at    TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  resolution_note TEXT,
  rating          SMALLINT,
  rating_note     VARCHAR(500),
  metadata        JSONB           NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT pk_maintenance_tickets        PRIMARY KEY (id),
  CONSTRAINT fk_mt_community               FOREIGN KEY (community_id)   REFERENCES communities (id)          ON DELETE RESTRICT,
  CONSTRAINT fk_mt_unit                    FOREIGN KEY (unit_id)        REFERENCES units (id)                ON DELETE SET NULL,
  CONSTRAINT fk_mt_category               FOREIGN KEY (category_id)    REFERENCES maintenance_categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_mt_raised_by              FOREIGN KEY (raised_by_id)   REFERENCES users (id)                ON DELETE RESTRICT,
  CONSTRAINT fk_mt_assigned_to            FOREIGN KEY (assigned_to_id) REFERENCES users (id)                ON DELETE SET NULL,
  CONSTRAINT uq_mt_community_ticket_number UNIQUE (community_id, ticket_number),
  CONSTRAINT chk_mt_rating                 CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  CONSTRAINT chk_mt_unit_or_common         CHECK (
    (unit_id IS NOT NULL AND is_common_area = FALSE) OR
    (unit_id IS NULL     AND is_common_area = TRUE)
  )
);

CREATE INDEX idx_mt_community_id          ON maintenance_tickets (community_id);
CREATE INDEX idx_mt_community_status      ON maintenance_tickets (community_id, status);
CREATE INDEX idx_mt_community_priority    ON maintenance_tickets (community_id, priority);
CREATE INDEX idx_mt_community_raised_by   ON maintenance_tickets (community_id, raised_by_id);
CREATE INDEX idx_mt_community_assigned_to ON maintenance_tickets (community_id, assigned_to_id);
CREATE INDEX idx_mt_community_category    ON maintenance_tickets (community_id, category_id);
CREATE INDEX idx_mt_community_deleted_at  ON maintenance_tickets (community_id, deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: maintenance_comments
-- =============================================================================
-- Thread of updates on a ticket (resident and staff comments).
-- Soft-delete supported so guard admins can hide inappropriate content.
-- =============================================================================

CREATE TABLE maintenance_comments (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID        NOT NULL,
  ticket_id    UUID        NOT NULL,
  author_id    UUID        NOT NULL,
  body         TEXT        NOT NULL,
  is_internal  BOOLEAN     NOT NULL DEFAULT FALSE,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT pk_maintenance_comments  PRIMARY KEY (id),
  CONSTRAINT fk_mcomment_ticket       FOREIGN KEY (ticket_id)  REFERENCES maintenance_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_mcomment_author       FOREIGN KEY (author_id)  REFERENCES users (id)               ON DELETE RESTRICT,
  CONSTRAINT chk_mcomment_body        CHECK (LENGTH(TRIM(body)) > 0)
);

CREATE INDEX idx_mcomment_community_id ON maintenance_comments (community_id);
CREATE INDEX idx_mcomment_ticket_id    ON maintenance_comments (ticket_id);

-- =============================================================================
-- TABLE: maintenance_attachments
-- =============================================================================
-- File attachments uploaded to maintenance tickets.
-- No soft delete: files are physically deleted from storage and DB simultaneously.
-- =============================================================================

CREATE TABLE maintenance_attachments (
  id            UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id  UUID         NOT NULL,
  ticket_id     UUID         NOT NULL,
  uploaded_by_id UUID        NOT NULL,
  file_url      TEXT         NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_size     INTEGER      NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  metadata      JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_maintenance_attachments  PRIMARY KEY (id),
  CONSTRAINT fk_mattach_ticket           FOREIGN KEY (ticket_id) REFERENCES maintenance_tickets (id) ON DELETE CASCADE,
  CONSTRAINT chk_mattach_file_size       CHECK (file_size > 0),
  CONSTRAINT chk_mattach_file_url        CHECK (file_url <> '')
);

CREATE INDEX idx_mattach_community_id ON maintenance_attachments (community_id);
CREATE INDEX idx_mattach_ticket_id    ON maintenance_attachments (ticket_id);

-- =============================================================================
-- TABLE: invoice_cycles
-- =============================================================================
-- Admin-defined billing cycle. Invoices are bulk-generated per cycle.
-- Once a cycle is published, its base configuration should not change.
-- =============================================================================

CREATE TABLE invoice_cycles (
  id            UUID                    NOT NULL DEFAULT gen_random_uuid(),
  community_id  UUID                    NOT NULL,
  name          VARCHAR(200)            NOT NULL,
  frequency     invoice_cycle_frequency NOT NULL,
  start_date    DATE                    NOT NULL,
  end_date      DATE                    NOT NULL,
  due_date      DATE                    NOT NULL,
  base_amount   DECIMAL(12,2)           NOT NULL,
  late_fee_type VARCHAR(20),
  late_fee_value DECIMAL(10,2),
  is_published  BOOLEAN                 NOT NULL DEFAULT FALSE,
  metadata      JSONB                   NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,

  CONSTRAINT pk_invoice_cycles          PRIMARY KEY (id),
  CONSTRAINT fk_ic_community            FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT chk_ic_dates               CHECK (end_date > start_date),
  CONSTRAINT chk_ic_due_date            CHECK (due_date >= start_date),
  CONSTRAINT chk_ic_base_amount         CHECK (base_amount >= 0),
  CONSTRAINT chk_ic_late_fee_type       CHECK (late_fee_type IS NULL OR late_fee_type IN ('FLAT', 'PERCENTAGE')),
  CONSTRAINT chk_ic_late_fee_percentage CHECK (
    late_fee_type IS NULL OR late_fee_type <> 'PERCENTAGE' OR (late_fee_value >= 0 AND late_fee_value <= 100)
  )
);

CREATE INDEX idx_ic_community_id         ON invoice_cycles (community_id);
CREATE INDEX idx_ic_community_published  ON invoice_cycles (community_id, is_published);
CREATE INDEX idx_ic_community_dates      ON invoice_cycles (community_id, start_date, end_date);

-- =============================================================================
-- TABLE: invoices
-- =============================================================================
-- One invoice per unit per billing cycle.
-- Unique constraint on (cycle_id, unit_id) prevents duplicate invoicing.
-- =============================================================================

CREATE TABLE invoices (
  id             UUID           NOT NULL DEFAULT gen_random_uuid(),
  community_id   UUID           NOT NULL,
  cycle_id       UUID           NOT NULL,
  unit_id        UUID           NOT NULL,
  invoice_number VARCHAR(50)    NOT NULL,
  status         invoice_status NOT NULL DEFAULT 'DRAFT',
  subtotal       DECIMAL(12,2)  NOT NULL,
  tax_amount     DECIMAL(12,2)  NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  late_fee       DECIMAL(12,2)  NOT NULL DEFAULT 0,
  total_amount   DECIMAL(12,2)  NOT NULL,
  paid_amount    DECIMAL(12,2)  NOT NULL DEFAULT 0,
  due_date       DATE           NOT NULL,
  notes          TEXT,
  metadata       JSONB          NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT pk_invoices                   PRIMARY KEY (id),
  CONSTRAINT fk_inv_community              FOREIGN KEY (community_id) REFERENCES communities (id)    ON DELETE RESTRICT,
  CONSTRAINT fk_inv_cycle                  FOREIGN KEY (cycle_id)     REFERENCES invoice_cycles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_inv_unit                   FOREIGN KEY (unit_id)      REFERENCES units (id)          ON DELETE RESTRICT,
  CONSTRAINT uq_inv_community_number       UNIQUE (community_id, invoice_number),
  CONSTRAINT uq_inv_cycle_unit             UNIQUE (cycle_id, unit_id),
  CONSTRAINT chk_inv_amounts               CHECK (
    subtotal >= 0 AND tax_amount >= 0 AND discount_amount >= 0 AND
    late_fee >= 0 AND total_amount >= 0 AND paid_amount >= 0
  ),
  CONSTRAINT chk_inv_paid_not_exceed_total CHECK (paid_amount <= total_amount)
);

CREATE INDEX idx_inv_community_id       ON invoices (community_id);
CREATE INDEX idx_inv_community_status   ON invoices (community_id, status);
CREATE INDEX idx_inv_community_unit_id  ON invoices (community_id, unit_id);
CREATE INDEX idx_inv_community_due_date ON invoices (community_id, due_date);
CREATE INDEX idx_inv_community_deleted  ON invoices (community_id, deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: invoice_line_items
-- =============================================================================
-- Itemised breakdown of each invoice (maintenance, water, gym, etc.)
-- No soft delete: line items are deleted when their invoice is cancelled.
-- =============================================================================

CREATE TABLE invoice_line_items (
  id          UUID          NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID         NOT NULL,
  invoice_id  UUID          NOT NULL,
  description VARCHAR(500)  NOT NULL,
  quantity    DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(12,2) NOT NULL,
  tax_rate    DECIMAL(5,2)  NOT NULL DEFAULT 0,
  tax_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
  total       DECIMAL(12,2) NOT NULL,
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  metadata    JSONB         NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_invoice_line_items    PRIMARY KEY (id),
  CONSTRAINT fk_ili_invoice           FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
  CONSTRAINT chk_ili_quantity         CHECK (quantity > 0),
  CONSTRAINT chk_ili_unit_price       CHECK (unit_price >= 0),
  CONSTRAINT chk_ili_tax_rate         CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT chk_ili_total            CHECK (total >= 0)
);

CREATE INDEX idx_ili_community_id ON invoice_line_items (community_id);
CREATE INDEX idx_ili_invoice_id   ON invoice_line_items (invoice_id);

-- =============================================================================
-- TABLE: payments
-- =============================================================================
-- Payment transactions against invoices.
-- Supports partial payments (paidAmount accumulates per invoice).
-- Records are IMMUTABLE: no soft delete. Refunds are separate rows.
-- =============================================================================

CREATE TABLE payments (
  id               UUID           NOT NULL DEFAULT gen_random_uuid(),
  community_id     UUID           NOT NULL,
  invoice_id       UUID           NOT NULL,
  amount           DECIMAL(12,2)  NOT NULL,
  mode             payment_mode   NOT NULL,
  status           payment_status NOT NULL DEFAULT 'PENDING',
  gateway_txn_id   VARCHAR(200),
  gateway_provider VARCHAR(100),
  gateway_response JSONB,
  paid_at          TIMESTAMPTZ,
  receipt_number   VARCHAR(100),
  notes            VARCHAR(500),
  metadata         JSONB          NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_payments          PRIMARY KEY (id),
  CONSTRAINT fk_pay_invoice       FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE RESTRICT,
  CONSTRAINT chk_pay_amount       CHECK (amount > 0),
  CONSTRAINT chk_pay_paid_at      CHECK (
    status NOT IN ('SUCCESS', 'REFUNDED') OR paid_at IS NOT NULL
  )
);

CREATE INDEX idx_pay_community_id  ON payments (community_id);
CREATE INDEX idx_pay_invoice_id    ON payments (invoice_id);
CREATE INDEX idx_pay_status        ON payments (community_id, status);
CREATE INDEX idx_pay_gateway_txn   ON payments (gateway_txn_id) WHERE gateway_txn_id IS NOT NULL;

-- =============================================================================
-- TABLE: announcements
-- =============================================================================
-- Notices, circulars and alerts published to residents.
-- Scope can target all residents, a specific tower, or a specific unit.
-- =============================================================================

CREATE TABLE announcements (
  id              UUID                  NOT NULL DEFAULT gen_random_uuid(),
  community_id    UUID                  NOT NULL,
  author_id       UUID                  NOT NULL,
  title           VARCHAR(500)          NOT NULL,
  body            TEXT                  NOT NULL,
  category        announcement_category NOT NULL,
  scope           announcement_scope    NOT NULL DEFAULT 'ALL_RESIDENTS',
  scope_target_id UUID,
  is_pinned       BOOLEAN               NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  attachments     JSONB                 NOT NULL DEFAULT '[]',
  metadata        JSONB                 NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT pk_announcements       PRIMARY KEY (id),
  CONSTRAINT fk_ann_community       FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ann_author          FOREIGN KEY (author_id)    REFERENCES users (id)       ON DELETE RESTRICT,
  CONSTRAINT chk_ann_expiry         CHECK (expires_at IS NULL OR published_at IS NULL OR expires_at > published_at),
  CONSTRAINT chk_ann_scope_target   CHECK (
    scope IN ('ALL_RESIDENTS', 'ADMINS_ONLY', 'GUARDS_ONLY', 'STAFF_ONLY') OR scope_target_id IS NOT NULL
  )
);

CREATE INDEX idx_ann_community_id       ON announcements (community_id);
CREATE INDEX idx_ann_community_category ON announcements (community_id, category);
CREATE INDEX idx_ann_community_pub      ON announcements (community_id, published_at);
CREATE INDEX idx_ann_community_pinned   ON announcements (community_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_ann_community_deleted  ON announcements (community_id, deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- TABLE: announcement_reads
-- =============================================================================
-- Read receipt per user per announcement. Enables "seen by N" counts.
-- No soft delete: read records are immutable.
-- =============================================================================

CREATE TABLE announcement_reads (
  id              UUID        NOT NULL DEFAULT gen_random_uuid(),
  community_id    UUID        NOT NULL,
  announcement_id UUID        NOT NULL,
  user_id         UUID        NOT NULL,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_announcement_reads     PRIMARY KEY (id),
  CONSTRAINT fk_ar_announcement        FOREIGN KEY (announcement_id) REFERENCES announcements (id) ON DELETE CASCADE,
  CONSTRAINT fk_ar_user                FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE CASCADE,
  CONSTRAINT uq_ar_announcement_user   UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_ar_community_id    ON announcement_reads (community_id);
CREATE INDEX idx_ar_announcement_id ON announcement_reads (announcement_id);
CREATE INDEX idx_ar_user_id         ON announcement_reads (user_id);

-- =============================================================================
-- TABLE: notification_logs
-- =============================================================================
-- Persistent log of all outbound notifications (push, SMS, email, WhatsApp).
-- Used for delivery tracking, retry queues, and unread badge counts.
-- No soft delete: notification logs are immutable.
-- =============================================================================

CREATE TABLE notification_logs (
  id              UUID                 NOT NULL DEFAULT gen_random_uuid(),
  community_id    UUID                 NOT NULL,
  user_id         UUID                 NOT NULL,
  channel         notification_channel NOT NULL,
  title           VARCHAR(500)         NOT NULL,
  body            TEXT                 NOT NULL,
  reference_id    UUID,
  reference_type  VARCHAR(100),
  is_read         BOOLEAN              NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  failure_reason  VARCHAR(500),
  metadata        JSONB                NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_notification_logs  PRIMARY KEY (id),
  CONSTRAINT fk_nl_user            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_nl_read_at        CHECK (is_read = FALSE OR read_at IS NOT NULL)
);

CREATE INDEX idx_nl_community_id  ON notification_logs (community_id);
CREATE INDEX idx_nl_user_unread   ON notification_logs (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_nl_created_at    ON notification_logs (community_id, created_at);
CREATE INDEX idx_nl_reference_id  ON notification_logs (reference_id) WHERE reference_id IS NOT NULL;

-- =============================================================================
-- TABLE: consent_logs
-- =============================================================================
-- Immutable record of consent given by users for legal/compliance purposes.
-- PDPB (India) and GDPR require auditable consent records.
-- =============================================================================

CREATE TABLE consent_logs (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID         NOT NULL,
  user_id      UUID         NOT NULL,
  consent_type VARCHAR(100) NOT NULL,
  version      VARCHAR(50)  NOT NULL,
  accepted     BOOLEAN      NOT NULL,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_consent_logs  PRIMARY KEY (id),
  CONSTRAINT fk_cl_user       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_cl_type      CHECK (consent_type <> '')
);

CREATE INDEX idx_cl_community_id ON consent_logs (community_id);
CREATE INDEX idx_cl_user_id      ON consent_logs (user_id);
CREATE INDEX idx_cl_user_type    ON consent_logs (user_id, consent_type);

-- =============================================================================
-- TABLE: audit_logs
-- =============================================================================
-- Immutable platform-wide audit trail. Records WHO did WHAT to WHICH record.
-- Written by the application layer. Never mutated or deleted.
-- community_id is nullable to support SUPER_ADMIN platform-level actions.
-- =============================================================================

CREATE TABLE audit_logs (
  id           UUID         NOT NULL DEFAULT gen_random_uuid(),
  community_id UUID,
  actor_id     UUID,
  action       audit_action NOT NULL,
  table_name   VARCHAR(100) NOT NULL,
  record_id    VARCHAR(100) NOT NULL,
  old_values   JSONB,
  new_values   JSONB,
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_audit_logs  PRIMARY KEY (id),
  CONSTRAINT fk_al_actor    FOREIGN KEY (actor_id)     REFERENCES users (id)       ON DELETE SET NULL,
  CONSTRAINT fk_al_community FOREIGN KEY (community_id) REFERENCES communities (id) ON DELETE SET NULL
);

CREATE INDEX idx_al_community_id    ON audit_logs (community_id);
CREATE INDEX idx_al_actor_id        ON audit_logs (actor_id);
CREATE INDEX idx_al_table_record    ON audit_logs (table_name, record_id);
CREATE INDEX idx_al_community_action ON audit_logs (community_id, action);
CREATE INDEX idx_al_created_at      ON audit_logs (community_id, created_at);

-- =============================================================================
-- TRIGGERS: updated_at auto-update
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'communities', 'towers', 'units', 'users',
    'resident_profiles', 'admin_profiles', 'staff_profiles',
    'resident_unit_assignments', 'vehicles',
    'visitor_requests', 'gate_passes', 'gate_entries',
    'maintenance_categories', 'maintenance_tickets', 'maintenance_comments',
    'invoice_cycles', 'invoices', 'payments',
    'announcements'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      t
    );
  END LOOP;
END;
$$;
