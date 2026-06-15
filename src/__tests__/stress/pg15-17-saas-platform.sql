-- ============================================================================
-- PG15-17 SaaS Multi-Tenant Platform Database Schema
-- Purpose: STRESS TEST for SQL parser — exercises maximum DDL feature coverage
-- Compatible with: PostgreSQL 15, 16, 17
-- ============================================================================
-- Features exercised:
--   PG15: NULLS NOT DISTINCT, SET ACCESS METHOD, parameterized opclasses,
--         SECURITY INVOKER, CREATE PUBLICATION FOR ALL TABLES, MERGE
--   PG14: DETACH PARTITION CONCURRENTLY/FINALIZE, multirange types
--   PG17: SET/DROP EXPRESSION, MERGE/SPLIT PARTITION, SET STATISTICS DEFAULT,
--         partitioned identity columns, exclusion on partitioned, ALTER OPERATOR SET,
--         login event triggers, logical replication failover control
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS btree_gin WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS isn WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS intarray WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;

-- ============================================================================
-- TABLESPACES
-- ============================================================================

CREATE TABLESPACE IF NOT EXISTS ts_hot
  OWNER postgres
  LOCATION '/data/pg_hot';
CREATE TABLESPACE IF NOT EXISTS ts_warm
  OWNER postgres
  LOCATION '/data/pg_warm';
CREATE TABLESPACE IF NOT EXISTS ts_cold
  OWNER postgres
  LOCATION '/data/pg_cold';
CREATE TABLESPACE IF NOT EXISTS ts_indexes
  OWNER postgres
  LOCATION '/data/pg_indexes';

-- ============================================================================
-- SCHEMAS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS integrations;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS notifications;
CREATE SCHEMA IF NOT EXISTS search;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE core.tenant_status AS ENUM (
  'provisioning', 'active', 'suspended', 'deprovisioning', 'archived'
);

CREATE TYPE core.user_status AS ENUM (
  'pending_verification', 'active', 'suspended', 'deactivated', 'deleted'
);

CREATE TYPE core.subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'expired', 'paused'
);

CREATE TYPE core.billing_cycle AS ENUM (
  'monthly', 'quarterly', 'semi_annual', 'annual', 'biennial'
);

CREATE TYPE core.payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed'
);

CREATE TYPE core.invite_status AS ENUM (
  'pending', 'accepted', 'declined', 'expired', 'revoked'
);

CREATE TYPE core.webhook_status AS ENUM (
  'pending', 'delivered', 'failed', 'retrying', 'abandoned'
);

CREATE TYPE core.integration_type AS ENUM (
  'slack', 'github', 'gitlab', 'jira', 'figma', 'notion', 'zapier', 'custom'
);

CREATE TYPE core.sso_provider AS ENUM (
  'saml', 'oidc', 'ldap', 'cas'
);

CREATE TYPE core.job_status AS ENUM (
  'scheduled', 'running', 'completed', 'failed', 'cancelled', 'retrying'
);

CREATE TYPE core.feature_flag_type AS ENUM (
  'boolean', 'percentage', 'variant', 'segment'
);

CREATE TYPE core.share_permission AS ENUM (
  'view', 'comment', 'edit', 'admin'
);

CREATE TYPE core.resource_type AS ENUM (
  'project', 'workspace', 'document', 'dashboard', 'report', 'file'
);

CREATE TYPE core.event_action AS ENUM (
  'create', 'read', 'update', 'delete', 'share', 'export', 'import', 'login', 'logout'
);

CREATE TYPE core.notification_channel AS ENUM (
  'in_app', 'email', 'sms', 'push', 'webhook'
);

CREATE TYPE core.custom_field_type AS ENUM (
  'text', 'number', 'date', 'select', 'multi_select', 'checkbox', 'url', 'user'
);

CREATE TYPE core.data_export_format AS ENUM (
  'csv', 'json', 'xlsx', 'parquet'
);

CREATE TYPE core.comment_visibility AS ENUM (
  'internal', 'public', 'private'
);

CREATE TYPE core.attachment_type AS ENUM (
  'image', 'document', 'video', 'audio', 'archive', 'other'
);

CREATE TYPE core.pricing_model AS ENUM (
  'flat', 'per_seat', 'per_unit', 'tiered', 'volume', 'stairstep'
);

CREATE TYPE auth.mfa_method AS ENUM (
  'totp', 'sms', 'email', 'webauthn', 'backup_codes'
);

-- ============================================================================
-- COMPOSITE TYPES
-- ============================================================================

CREATE TYPE core.address AS (
  line1    TEXT,
  line2    TEXT,
  city     TEXT,
  state    TEXT,
  postal   TEXT,
  country  CHAR(2)
);

CREATE TYPE core.money AS (
  amount   NUMERIC(19, 4),
  currency CHAR(3)
);

CREATE TYPE core.geo_point AS (
  latitude  DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

CREATE TYPE core.api_rate_limit AS (
  requests_per_minute  INTEGER,
  requests_per_hour    INTEGER,
  requests_per_day     INTEGER,
  burst_allowance      INTEGER
);

CREATE TYPE core.webhook_config AS (
  url         TEXT,
  secret      TEXT,
  retry_count INTEGER DEFAULT 3,
  timeout_ms  INTEGER DEFAULT 5000
);

CREATE TYPE integrations.oauth_config AS (
  client_id     TEXT,
  client_secret TEXT,
  authorize_url TEXT,
  token_url     TEXT,
  scope         TEXT[]
);

-- ============================================================================
-- RANGE TYPES
-- ============================================================================

CREATE TYPE core.tstzrange_with_exclusions AS RANGE (
  SUBTYPE = timestamptz,
  SUBTYPE_DIFF = tstzrange_subdiff
);

-- ============================================================================
-- DOMAIN TYPES
-- ============================================================================

CREATE DOMAIN core.email AS citext
  CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN core.positive_int AS INTEGER
  NOT NULL
  CHECK (VALUE > 0);

CREATE DOMAIN core.non_negative_int AS INTEGER
  NOT NULL
  CHECK (VALUE >= 0);

CREATE DOMAIN core.percentage AS NUMERIC(5, 2)
  NOT NULL
  CHECK (VALUE >= 0 AND VALUE <= 100);

CREATE DOMAIN core.currency_code AS CHAR(3)
  NOT NULL
  CHECK (VALUE IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW'));

CREATE DOMAIN core.hostname AS TEXT
  NOT NULL
  CHECK (VALUE ~ '^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$');

CREATE DOMAIN core.slug AS TEXT
  NOT NULL
  CHECK (VALUE ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

CREATE DOMAIN core.semver AS TEXT
  CHECK (VALUE ~ '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$');

CREATE DOMAIN core.hex_color AS TEXT
  CHECK (VALUE ~ '^#[0-9a-fA-F]{6}$');

CREATE DOMAIN billing.iban AS TEXT
  CHECK (VALUE ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$');

-- ============================================================================
-- SEQUENCES
-- ============================================================================

CREATE SEQUENCE core.tenant_id_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 20
  CYCLE
  OWNED BY NONE;

CREATE SEQUENCE core.audit_log_id_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 50
  NO CYCLE;

CREATE SEQUENCE billing.invoice_number_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1000000
  MAXVALUE 9999999
  START WITH 1000000
  CACHE 10
  NO CYCLE;

CREATE SEQUENCE billing.payment_number_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 100000000
  MAXVALUE 999999999
  START WITH 100000000
  CACHE 1
  NO CYCLE;

CREATE SEQUENCE analytics.job_run_id_seq
  AS BIGINT
  INCREMENT BY 50
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 1;

CREATE SEQUENCE core.comment_id_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 20;

-- ============================================================================
-- COLLATIONS
-- ============================================================================

CREATE COLLATION IF NOT EXISTS core.case_insensitive (
  PROVIDER = icu,
  DETERMINISTIC = FALSE,
  LOCALE = 'en-US-x-icu'
);

CREATE COLLATION IF NOT EXISTS core.numeric_sort (
  PROVIDER = icu,
  DETERMINISTIC = FALSE,
  LOCALE = 'en-US-x-icu',
  COLLATION = 'colNumeric=1'
);

CREATE COLLATION IF NOT EXISTS core.accent_insensitive (
  PROVIDER = icu,
  DETERMINISTIC = FALSE,
  LOCALE = 'en-US-x-icu-u-ks-level1'
);

-- ============================================================================
-- CONVERSIONS
-- ============================================================================

CREATE CONVERSION core.latin1_to_utf8
  FOR 'LATIN1' TO 'UTF8' FROM iso8859_1_to_utf8;

-- ============================================================================
-- CASTS
-- ============================================================================

CREATE CAST (core.money AS TEXT)
  WITH FUNCTION core.money_to_text(core.money)
  AS ASSIGNMENT;

CREATE CAST (TEXT AS core.slug)
  WITH FUNCTION core.text_to_slug(TEXT)
  AS IMPLICIT;

-- ============================================================================
-- TABLES — CORE SCHEMA
-- ============================================================================

-- Tenants (root entity)
CREATE TABLE core.tenants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              core.slug NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  display_name      TEXT,
  description       TEXT,
  logo_url          TEXT,
  domain            core.hostname,
  status            core.tenant_status NOT NULL DEFAULT 'provisioning',
  plan_tier         TEXT NOT NULL DEFAULT 'free',
  max_users         core.positive_int DEFAULT 10,
  max_projects      core.positive_int DEFAULT 5,
  max_storage_mb    core.positive_int DEFAULT 1024,
  settings          JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata          HSTORE,
  address           core.address,
  primary_color     core.hex_color DEFAULT '#4F46E5',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT tenants_valid_settings
    CHECK (settings IS NOT NULL AND jsonb_typeof(settings) = 'object'),
  CONSTRAINT tenants_valid_domain_if_set
    CHECK (domain IS NOT NULL OR status = 'provisioning'),
  CONSTRAINT tenants_name_length
    CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
  CONSTRAINT tenants_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT tenants_max_users_positive
    CHECK (max_users > 0),
  CONSTRAINT tenants_display_name_different
    CHECK (display_name IS NULL OR display_name <> name)
) USING heap
  TABLESPACE ts_hot;

-- PG15: NULLS NOT DISTINCT on unique index
CREATE UNIQUE INDEX tenants_slug_nulls_not_distinct
  ON core.tenants (slug) NULLS NOT DISTINCT;

CREATE INDEX tenants_status_idx
  ON core.tenants (status)
  WHERE deleted_at IS NULL;

CREATE INDEX tenants_domain_idx
  ON core.tenants (domain)
  WHERE domain IS NOT NULL AND deleted_at IS NULL;

-- Users (partitioned by HASH on id for PG17 partitioned identity)
CREATE TABLE core.users (
  id                UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  email             core.email NOT NULL,
  username          core.slug,
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  status            core.user_status NOT NULL DEFAULT 'pending_verification',
  locale            TEXT DEFAULT 'en-US',
  timezone          TEXT DEFAULT 'UTC',
  last_login_at     TIMESTAMPTZ,
  last_login_ip     INET,
  login_count       core.non_negative_int DEFAULT 0,
  password_hash     TEXT,
  password_changed_at TIMESTAMPTZ,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_secret TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  preferences       HSTORE,
  search_vector     TSVECTOR,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT users_pk PRIMARY KEY (id, tenant_id),
  CONSTRAINT users_email_unique UNIQUE (email, tenant_id),
  CONSTRAINT users_username_unique UNIQUE (username, tenant_id),
  CONSTRAINT users_valid_timezone
    CHECK (timezone ~ '^[A-Za-z]+(?:/[A-Za-z_]+){0,2}$'),
  CONSTRAINT users_valid_locale
    CHECK (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  CONSTRAINT users_login_count_non_negative
    CHECK (login_count >= 0),
  CONSTRAINT users_password_hash_if_active
    CHECK (status <> 'active' OR password_hash IS NOT NULL OR two_factor_enabled = TRUE),
  CONSTRAINT users_display_name_not_blank
    CHECK (trim(display_name) <> ''),
  CONSTRAINT users_valid_last_login_ip
    CHECK (last_login_ip IS NULL OR family(last_login_ip) IN (4, 6))
) PARTITION BY HASH (id);

-- PG17: Partitioned tables with identity columns
CREATE TABLE core.users_part_identity (
  id                UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL,
  email             core.email NOT NULL,
  username          core.slug,
  display_name      TEXT NOT NULL,
  status            core.user_status NOT NULL DEFAULT 'pending_verification',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  seq_id            BIGINT GENERATED ALWAYS AS IDENTITY (MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 20),
  CONSTRAINT users_part_identity_pk PRIMARY KEY (id, tenant_id)
) PARTITION BY HASH (id);

-- Create hash partitions for users
CREATE TABLE core.users_p0 PARTITION OF core.users
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE core.users_p1 PARTITION OF core.users
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE core.users_p2 PARTITION OF core.users
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE core.users_p3 PARTITION OF core.users
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- PG17: Identity column partitions
CREATE TABLE core.users_part_identity_p0 PARTITION OF core.users_part_identity
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE core.users_part_identity_p1 PARTITION OF core.users_part_identity
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE core.users_part_identity_p2 PARTITION OF core.users_part_identity
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE core.users_part_identity_p3 PARTITION OF core.users_part_identity
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Teams
CREATE TABLE core.teams (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  slug              core.slug NOT NULL,
  description       TEXT,
  icon              TEXT,
  color             core.hex_color,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  settings          JSONB DEFAULT '{}'::jsonb,
  metadata          HSTORE,
  parent_team_id    UUID REFERENCES core.teams(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT teams_unique_slug UNIQUE (tenant_id, slug),
  CONSTRAINT teams_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT teams_no_self_reference CHECK (parent_team_id IS NULL OR parent_team_id <> id)
) TABLESPACE ts_hot;

CREATE INDEX teams_tenant_idx ON core.teams (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX teams_parent_idx ON core.teams (parent_team_id) WHERE parent_team_id IS NOT NULL;

-- Team Members
CREATE TABLE core.team_members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id           UUID NOT NULL REFERENCES core.teams(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role              TEXT NOT NULL DEFAULT 'member',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by        UUID,
  status            core.invite_status NOT NULL DEFAULT 'accepted',

  CONSTRAINT team_members_unique_membership UNIQUE (team_id, user_id),
  CONSTRAINT team_members_valid_role
    CHECK (role IN ('owner', 'admin', 'member', 'guest')),
  CONSTRAINT team_members_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT team_members_invited_by_fkey
    FOREIGN KEY (invited_by, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE SET NULL
) TABLESPACE ts_hot;

-- Projects (RANGE partitioned by created_at)
CREATE TABLE core.projects (
  id                UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  team_id           UUID REFERENCES core.teams(id) ON DELETE SET NULL ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  slug              core.slug NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  visibility        TEXT NOT NULL DEFAULT 'private',
  icon              TEXT,
  color             core.hex_color,
  settings          JSONB DEFAULT '{}'::jsonb,
  metadata          HSTORE,
  deadline_at       TIMESTAMPTZ,
  budget_hours      NUMERIC(10, 2),
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at       TIMESTAMPTZ,
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT projects_pk PRIMARY KEY (id, tenant_id, created_at),
  CONSTRAINT projects_unique_slug UNIQUE (tenant_id, slug),
  CONSTRAINT projects_valid_status
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'archived', 'cancelled')),
  CONSTRAINT projects_valid_visibility
    CHECK (visibility IN ('private', 'team', 'organization', 'public')),
  CONSTRAINT projects_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT projects_budget_positive CHECK (budget_hours IS NULL OR budget_hours > 0),
  CONSTRAINT projects_deadline_future
    CHECK (deadline_at IS NULL OR deadline_at > created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE core.projects_2024_q1 PARTITION OF core.projects
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE core.projects_2024_q2 PARTITION OF core.projects
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE core.projects_2024_q3 PARTITION OF core.projects
  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE core.projects_2024_q4 PARTITION OF core.projects
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE core.projects_2025_q1 PARTITION OF core.projects
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE core.projects_default PARTITION OF core.projects
  DEFAULT;

-- Project Settings
CREATE TABLE core.project_settings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id        UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  setting_key       TEXT NOT NULL,
  setting_value     JSONB NOT NULL,
  value_type        TEXT NOT NULL DEFAULT 'json',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT project_settings_unique_key UNIQUE (project_id, tenant_id, setting_key),
  CONSTRAINT project_settings_fkey
    FOREIGN KEY (project_id, tenant_id)
    REFERENCES core.projects(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT project_settings_value_type
    CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'array'))
);

-- Workspaces (LIST partitioned by tenant_id)
CREATE TABLE core.workspaces (
  id                UUID NOT NULL,
  tenant_id         UUID NOT NULL,
  name              TEXT NOT NULL,
  slug              core.slug NOT NULL,
  description       TEXT,
  type              TEXT NOT NULL DEFAULT 'standard',
  settings          JSONB DEFAULT '{}'::jsonb,
  metadata          HSTORE,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT workspaces_pk PRIMARY KEY (id, tenant_id),
  CONSTRAINT workspaces_unique_slug UNIQUE (tenant_id, slug),
  CONSTRAINT workspaces_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT workspaces_valid_type
    CHECK (type IN ('standard', 'personal', 'shared', 'template')),
  CONSTRAINT workspaces_tenant_fkey
    FOREIGN KEY (tenant_id) REFERENCES core.tenants(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) PARTITION BY LIST (tenant_id);

-- PG17: MERGE PARTITIONS and SPLIT PARTITION example placeholders
-- (actual merge/split would be done on existing partitions at runtime)
-- We create initial partitions; ALTER TABLE ... MERGE/SPLIT shown later

CREATE TABLE core.workspaces_tenant_default PARTITION OF core.workspaces
  DEFAULT;

-- Workspace Members
CREATE TABLE core.workspace_members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id      UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  role              TEXT NOT NULL DEFAULT 'member',
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by        UUID,
  status            core.invite_status NOT NULL DEFAULT 'pending',

  CONSTRAINT workspace_members_unique UNIQUE (workspace_id, tenant_id, user_id),
  CONSTRAINT workspace_members_workspace_fkey
    FOREIGN KEY (workspace_id, tenant_id)
    REFERENCES core.workspaces(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT workspace_members_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT workspace_members_valid_role
    CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'guest'))
);

-- API Keys
CREATE TABLE core.api_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  name              TEXT NOT NULL,
  key_hash          TEXT NOT NULL,
  key_prefix        CHAR(8) NOT NULL,
  permissions       TEXT[] NOT NULL DEFAULT ARRAY['read']::text[],
  rate_limit        core.api_rate_limit,
  allowed_ips       INET[],
  allowed_origins   TEXT[],
  last_used_at      TIMESTAMPTZ,
  last_used_ip      INET,
  use_count         BIGINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ,

  CONSTRAINT api_keys_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT api_keys_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT api_keys_valid_permissions
    CHECK (array_length(permissions, 1) > 0),
  CONSTRAINT api_keys_prefix_format CHECK (key_prefix ~ '^[a-zA-Z0-9]{8}$')
);

CREATE INDEX api_keys_key_prefix_idx ON core.api_keys (key_prefix)
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now());

CREATE INDEX api_keys_tenant_user_idx ON core.api_keys (tenant_id, user_id);

-- ============================================================================
-- TABLES — AUTH SCHEMA
-- ============================================================================

CREATE TABLE auth.roles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  is_system         BOOLEAN NOT NULL DEFAULT FALSE,
  priority          INTEGER NOT NULL DEFAULT 0,
  settings          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT roles_unique_name UNIQUE (tenant_id, name),
  CONSTRAINT roles_name_format CHECK (name ~ '^[a-z][a-z0-9_]{1,63}$')
);

CREATE TABLE auth.permissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     TEXT NOT NULL,
  action            TEXT NOT NULL,
  description       TEXT,
  is_dangerous      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT permissions_unique UNIQUE (tenant_id, resource_type, action),
  CONSTRAINT permissions_valid_action
    CHECK (action IN ('create', 'read', 'update', 'delete', 'manage', 'share', 'export', 'admin'))
);

CREATE TABLE auth.role_permissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id           UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  permission_id     UUID NOT NULL REFERENCES auth.permissions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  granted_by        UUID,
  condition         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE TABLE auth.user_roles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  role_id           UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     TEXT,
  resource_id       UUID,
  granted_by        UUID,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_roles_unique UNIQUE (user_id, tenant_id, role_id, resource_type, resource_id),
  CONSTRAINT user_roles_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- SSO Connections
CREATE TABLE auth.sso_connections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  provider          core.sso_provider NOT NULL,
  name              TEXT NOT NULL,
  config            JSONB NOT NULL,
  metadata_url      TEXT,
  certificate       TEXT,
  domains           TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at    TIMESTAMPTZ,
  settings          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sso_connections_unique_name UNIQUE (tenant_id, name),
  CONSTRAINT sso_connections_config_not_empty
    CHECK (jsonb_typeof(config) = 'object' AND config <> '{}'::jsonb)
);

-- SSO Mappings
CREATE TABLE auth.sso_mappings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sso_connection_id UUID NOT NULL REFERENCES auth.sso_connections(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  assertion_attribute TEXT NOT NULL,
  local_attribute   TEXT NOT NULL,
  transform_rule    TEXT,
  is_required       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sso_mappings_unique UNIQUE (sso_connection_id, assertion_attribute)
);

-- MFA Configuration
CREATE TABLE auth.mfa_config (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  method            auth.mfa_method NOT NULL,
  secret            TEXT,
  backup_codes      TEXT[],
  verified         BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT mfa_config_unique UNIQUE (user_id, tenant_id, method),
  CONSTRAINT mfa_config_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT mfa_config_secret_if_needed
    CHECK (method IN ('sms', 'email') OR secret IS NOT NULL)
);

-- ============================================================================
-- TABLES — BILLING SCHEMA
-- ============================================================================

-- Billing Accounts
CREATE TABLE billing.accounts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  company_name      TEXT,
  billing_email     core.email NOT NULL,
  billing_address   core.address,
  tax_id            TEXT,
  payment_method_id TEXT,
  payment_provider  TEXT DEFAULT 'stripe',
  balance           NUMERIC(19, 4) NOT NULL DEFAULT 0,
  currency          core.currency_code NOT NULL DEFAULT 'USD',
  credit_limit      NUMERIC(19, 4),
  settings          JSONB DEFAULT '{}'::jsonb,
  metadata          HSTORE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT accounts_unique_tenant UNIQUE (tenant_id),
  CONSTRAINT accounts_balance_check CHECK (balance >= -(credit_limit ?? 0)),
  CONSTRAINT accounts_valid_payment_provider
    CHECK (payment_provider IN ('stripe', 'paypal', 'paddle', 'lemon_squeezy', 'wire', 'manual'))
);

-- Subscription Plans
CREATE TABLE billing.subscription_plans (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  slug              core.slug NOT NULL,
  description       TEXT,
  pricing_model     core.pricing_model NOT NULL DEFAULT 'flat',
  base_price        NUMERIC(19, 4) NOT NULL DEFAULT 0,
  currency          core.currency_code NOT NULL DEFAULT 'USD',
  billing_cycle     core.billing_cycle NOT NULL DEFAULT 'monthly',
  trial_period_days INTEGER DEFAULT 0,
  features          JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits            JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public         BOOLEAN NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT plans_unique_slug UNIQUE (tenant_id, slug),
  CONSTRAINT plans_base_price_non_negative CHECK (base_price >= 0),
  CONSTRAINT plans_trial_non_negative CHECK (trial_period_days >= 0)
);

-- Subscriptions
CREATE TABLE billing.subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  account_id        UUID NOT NULL REFERENCES billing.accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  plan_id           UUID NOT NULL REFERENCES billing.subscription_plans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status            core.subscription_status NOT NULL DEFAULT 'trialing',
  quantity          core.positive_int NOT NULL DEFAULT 1,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end   TIMESTAMPTZ NOT NULL,
  trial_start       TIMESTAMPTZ,
  trial_end         TIMESTAMPTZ,
  canceled_at       TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  ended_at          TIMESTAMPTZ,
  metadata          HSTORE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_period_valid
    CHECK (current_period_end > current_period_start),
  CONSTRAINT subscriptions_trial_valid
    CHECK (trial_end IS NULL OR trial_start IS NOT NULL),
  CONSTRAINT subscriptions_quantity_positive CHECK (quantity > 0)
);

-- PG17: Exclusion constraint on partitioned tables
-- We'll apply this after creating the partitioned version
CREATE TABLE billing.subscriptions_partitioned (
  id                UUID NOT NULL,
  tenant_id         UUID NOT NULL,
  account_id        UUID NOT NULL,
  plan_id           UUID NOT NULL,
  status            core.subscription_status NOT NULL DEFAULT 'trialing',
  quantity          core.positive_int NOT NULL DEFAULT 1,
  current_period    TSTZRANGE NOT NULL,
  trial_period      TSTZRANGE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subscriptions_part_pk PRIMARY KEY (id, tenant_id),
  CONSTRAINT subscriptions_part_account_fkey
    FOREIGN KEY (account_id) REFERENCES billing.accounts(id) ON DELETE RESTRICT,
  CONSTRAINT subscriptions_part_plan_fkey
    FOREIGN KEY (plan_id) REFERENCES billing.subscription_plans(id) ON DELETE RESTRICT,
  -- PG17: Exclusion constraints on partitioned tables
  CONSTRAINT subscriptions_no_overlap
    EXCLUDE USING gist (
      account_id WITH =,
      current_period WITH &&
    )
) PARTITION BY LIST (tenant_id);

CREATE TABLE billing.subscriptions_part_default PARTITION OF billing.subscriptions_partitioned
  DEFAULT;

-- Invoices (RANGE partitioned by created_at with BRIN indexes)
CREATE TABLE billing.invoices (
  id                UUID NOT NULL DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  account_id        UUID NOT NULL REFERENCES billing.accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subscription_id   UUID REFERENCES billing.subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  invoice_number    BIGINT NOT NULL DEFAULT nextval('billing.invoice_number_seq'),
  status            TEXT NOT NULL DEFAULT 'draft',
  currency          core.currency_code NOT NULL DEFAULT 'USD',
  subtotal          NUMERIC(19, 4) NOT NULL DEFAULT 0,
  tax_amount        NUMERIC(19, 4) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(19, 4) NOT NULL DEFAULT 0,
  total             NUMERIC(19, 4) NOT NULL DEFAULT 0,
  due_date          DATE NOT NULL,
  paid_at           TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,
  notes             TEXT,
  metadata          HSTORE,
  billing_address   core.address,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoices_pk PRIMARY KEY (id, tenant_id, created_at),
  CONSTRAINT invoices_unique_number UNIQUE (tenant_id, invoice_number),
  CONSTRAINT invoices_valid_status
    CHECK (status IN ('draft', 'sent', 'paid', 'void', 'uncollectible')),
  CONSTRAINT invoices_total_consistent
    CHECK (total = subtotal + tax_amount - discount_amount),
  CONSTRAINT invoices_total_non_negative CHECK (total >= 0),
  CONSTRAINT invoices_due_date_not_past_on_create
    CHECK (due_date >= created_at::date)
) PARTITION BY RANGE (created_at);

CREATE TABLE billing.invoices_2024 PARTITION OF billing.invoices
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE billing.invoices_2025 PARTITION OF billing.invoices
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE billing.invoices_default PARTITION OF billing.invoices
  DEFAULT;

-- BRIN index for time-series partitioned invoice table
CREATE INDEX invoices_created_at_brin_idx
  ON billing.invoices USING brin (created_at)
  WITH (pages_per_range = 32);

CREATE INDEX invoices_tenant_status_idx
  ON billing.invoices (tenant_id, status)
  WHERE paid_at IS NULL;

-- Invoice Items
CREATE TABLE billing.invoice_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id        UUID NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  description       TEXT NOT NULL,
  quantity          NUMERIC(19, 4) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(19, 4) NOT NULL,
  amount            NUMERIC(19, 4) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  tax_rate          core.percentage DEFAULT 0,
  tax_amount        NUMERIC(19, 4) GENERATED ALWAYS AS (
    ROUND(quantity * unit_price * tax_rate / 100, 4)
  ) STORED,
  discount_amount   NUMERIC(19, 4) NOT NULL DEFAULT 0,
  metadata          JSONB DEFAULT '{}'::jsonb,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoice_items_invoice_fkey
    FOREIGN KEY (invoice_id, tenant_id)
    REFERENCES billing.invoices(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT invoice_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT invoice_items_unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT invoice_items_discount_non_negative CHECK (discount_amount >= 0)
);

-- Payments
CREATE TABLE billing.payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  account_id        UUID NOT NULL REFERENCES billing.accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  invoice_id        UUID,
  payment_number    BIGINT NOT NULL DEFAULT nextval('billing.payment_number_seq'),
  amount            NUMERIC(19, 4) NOT NULL,
  currency          core.currency_code NOT NULL DEFAULT 'USD',
  status            core.payment_status NOT NULL DEFAULT 'pending',
  provider          TEXT NOT NULL DEFAULT 'stripe',
  provider_id       TEXT,
  provider_metadata JSONB DEFAULT '{}'::jsonb,
  refund_amount     NUMERIC(19, 4) NOT NULL DEFAULT 0,
  failure_reason    TEXT,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT payments_unique_number UNIQUE (tenant_id, payment_number),
  CONSTRAINT payments_amount_positive CHECK (amount > 0),
  CONSTRAINT payments_refund_not_exceed CHECK (refund_amount <= amount),
  CONSTRAINT payments_valid_provider
    CHECK (provider IN ('stripe', 'paypal', 'paddle', 'lemon_squeezy', 'wire', 'manual', 'credit')),
  CONSTRAINT payments_invoice_fkey
    FOREIGN KEY (invoice_id, tenant_id)
    REFERENCES billing.invoices(id, tenant_id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Usage Records (for metered billing, RANGE partitioned)
CREATE TABLE billing.usage_records (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  account_id        UUID NOT NULL REFERENCES billing.accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  subscription_id   UUID REFERENCES billing.subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE,
  resource_type     TEXT NOT NULL,
  resource_id       UUID,
  quantity          NUMERIC(19, 4) NOT NULL DEFAULT 1,
  unit              TEXT NOT NULL DEFAULT 'unit',
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata          JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT usage_records_quantity_positive CHECK (quantity > 0),
  CONSTRAINT usage_records_valid_resource_type
    CHECK (resource_type IN ('api_call', 'storage_mb', 'user_seat', 'compute_hour', 'bandwidth_gb', 'custom'))
) PARTITION BY RANGE (recorded_at);

CREATE TABLE billing.usage_records_2024_q1 PARTITION OF billing.usage_records
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE billing.usage_records_2024_q2 PARTITION OF billing.usage_records
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE billing.usage_records_2024_q3 PARTITION OF billing.usage_records
  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE billing.usage_records_2024_q4 PARTITION OF billing.usage_records
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE billing.usage_records_default PARTITION OF billing.usage_records
  DEFAULT;

-- BRIN index for usage records time-series
CREATE INDEX usage_records_recorded_at_brin
  ON billing.usage_records USING brin (recorded_at)
  WITH (pages_per_range = 64);

CREATE INDEX usage_records_tenant_resource_idx
  ON billing.usage_records (tenant_id, resource_type, recorded_at);

-- ============================================================================
-- TABLES — CORE: Feature Flags, Webhooks, Notifications, etc.
-- ============================================================================

-- Feature Flags
CREATE TABLE core.feature_flags (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  key               TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  flag_type         core.feature_flag_type NOT NULL DEFAULT 'boolean',
  is_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  default_value     JSONB,
  rules             JSONB NOT NULL DEFAULT '[]'::jsonb,
  variation_values  JSONB DEFAULT '{}'::jsonb,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT feature_flags_unique_key UNIQUE (tenant_id, key),
  CONSTRAINT feature_flags_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT feature_flags_key_format CHECK (key ~ '^[a-z][a-z0-9_.-]{0,127}$')
);

-- Feature Flag Rollouts
CREATE TABLE core.feature_flag_rollouts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_id           UUID NOT NULL REFERENCES core.feature_flags(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  percentage        core.percentage DEFAULT 0,
  segment_rules     JSONB DEFAULT '[]'::jsonb,
  target_user_ids   UUID[],
  target_team_ids   UUID[],
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT flag_rollouts_unique_name UNIQUE (flag_id, name),
  CONSTRAINT flag_rollouts_percentage_range CHECK (percentage >= 0 AND percentage <= 100)
);

-- Webhooks
CREATE TABLE core.webhooks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  url               TEXT NOT NULL,
  events            TEXT[] NOT NULL,
  config            core.webhook_config,
  secret            TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  description       TEXT,
  last_triggered_at TIMESTAMPTZ,
  failure_count     core.non_negative_int DEFAULT 0,
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT webhooks_url_format CHECK (url ~ '^https://'),
  CONSTRAINT webhooks_events_not_empty CHECK (array_length(events, 1) > 0)
);

-- Webhook Deliveries
CREATE TABLE core.webhook_deliveries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id        UUID NOT NULL REFERENCES core.webhooks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  event_type        TEXT NOT NULL,
  event_id          UUID NOT NULL,
  payload           JSONB NOT NULL,
  request_headers   JSONB,
  response_status   INTEGER,
  response_body     TEXT,
  response_headers  JSONB,
  error_message     TEXT,
  attempt_number    core.positive_int NOT NULL DEFAULT 1,
  status            core.webhook_status NOT NULL DEFAULT 'pending',
  duration_ms       INTEGER,
  next_retry_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT webhook_deliveries_valid_status
    CHECK (status IN ('pending', 'delivered', 'failed', 'retrying', 'abandoned')),
  CONSTRAINT webhook_deliveries_response_status
    CHECK (response_status IS NULL OR (response_status >= 100 AND response_status < 600))
) TABLESPACE ts_warm;

CREATE INDEX webhook_deliveries_webhook_created_idx
  ON core.webhook_deliveries (webhook_id, created_at DESC);

CREATE INDEX webhook_deliveries_tenant_event_idx
  ON core.webhook_deliveries (tenant_id, event_type, created_at DESC);

-- ============================================================================
-- TABLES — NOTIFICATIONS SCHEMA
-- ============================================================================

CREATE TABLE notifications.notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  data              JSONB DEFAULT '{}'::jsonb,
  link              TEXT,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  channel           core.notification_channel NOT NULL DEFAULT 'in_app',
  sent_at           TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notifications_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT notifications_type_format CHECK (type ~ '^[a-z][a-z0-9_.]{1,127}$'),
  CONSTRAINT notifications_title_not_empty CHECK (trim(title) <> '')
) PARTITION BY HASH (user_id);

CREATE TABLE notifications.notifications_p0 PARTITION OF notifications.notifications
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE notifications.notifications_p1 PARTITION OF notifications.notifications
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE notifications.notifications_p2 PARTITION OF notifications.notifications
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE notifications.notifications_p3 PARTITION OF notifications.notifications
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Notification Preferences
CREATE TABLE notifications.notification_preferences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  notification_type TEXT NOT NULL,
  channels          core.notification_channel[] NOT NULL DEFAULT ARRAY['in_app']::core.notification_channel[],
  is_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end   TIME,
  frequency         TEXT DEFAULT 'immediate',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notif_prefs_unique UNIQUE (user_id, tenant_id, notification_type),
  CONSTRAINT notif_prefs_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT notif_prefs_valid_frequency
    CHECK (frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'off')),
  CONSTRAINT notif_prefs_quiet_hours_both_or_neither
    CHECK ((quiet_hours_start IS NULL) = (quiet_hours_end IS NULL))
);

-- ============================================================================
-- TABLES — INTEGRATIONS SCHEMA
-- ============================================================================

CREATE TABLE integrations.integrations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type              core.integration_type NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  config            JSONB NOT NULL DEFAULT '{}'::jsonb,
  oauth_config      integrations.oauth_config,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at    TIMESTAMPTZ,
  sync_error        TEXT,
  installed_by      UUID NOT NULL,
  installed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  settings          JSONB DEFAULT '{}'::jsonb,

  CONSTRAINT integrations_unique_type UNIQUE (tenant_id, type)
);

CREATE TABLE integrations.integration_configs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id    UUID NOT NULL REFERENCES integrations.integrations(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  config_key        TEXT NOT NULL,
  config_value      JSONB NOT NULL,
  is_secret         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT integration_configs_unique_key UNIQUE (integration_id, config_key)
);

-- ============================================================================
-- TABLES — ANALYTICS SCHEMA
-- ============================================================================

-- Audit Logs (RANGE partitioned, RLS enabled)
CREATE TABLE audit.audit_logs (
  id                BIGINT NOT NULL DEFAULT nextval('core.audit_log_id_seq'),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID,
  actor_type        TEXT NOT NULL DEFAULT 'user',
  actor_id          TEXT NOT NULL,
  action            core.event_action NOT NULL,
  resource_type     core.resource_type,
  resource_id       UUID,
  resource_name     TEXT,
  description       TEXT,
  old_values        JSONB,
  new_values        JSONB,
  metadata          JSONB DEFAULT '{}'::jsonb,
  ip_address        INET,
  user_agent        TEXT,
  request_id        UUID,
  session_id        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT audit_logs_pk PRIMARY KEY (id, tenant_id, created_at),
  CONSTRAINT audit_logs_valid_actor_type
    CHECK (actor_type IN ('user', 'system', 'api_key', 'service', 'cron'))
) PARTITION BY RANGE (created_at);

CREATE TABLE audit.audit_logs_2024_q1 PARTITION OF audit.audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE audit.audit_logs_2024_q2 PARTITION OF audit.audit_logs
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE audit.audit_logs_2024_q3 PARTITION OF audit.audit_logs
  FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE audit.audit_logs_2024_q4 PARTITION OF audit.audit_logs
  FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');
CREATE TABLE audit.audit_logs_2025_q1 PARTITION OF audit.audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE audit.audit_logs_default PARTITION OF audit.audit_logs
  DEFAULT;

ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;

-- Data Exports
CREATE TABLE analytics.data_exports (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  format            core.data_export_format NOT NULL DEFAULT 'csv',
  resource_type     TEXT NOT NULL,
  filters           JSONB DEFAULT '{}'::jsonb,
  status            TEXT NOT NULL DEFAULT 'pending',
  file_url          TEXT,
  file_size_bytes   BIGINT,
  row_count         BIGINT,
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT data_exports_valid_status
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  CONSTRAINT data_exports_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Scheduled Jobs
CREATE TABLE analytics.scheduled_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  job_type          TEXT NOT NULL,
  schedule_cron     TEXT,
  schedule_interval INTERVAL,
  handler           TEXT NOT NULL,
  parameters        JSONB DEFAULT '{}'::jsonb,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at       TIMESTAMPTZ,
  next_run_at       TIMESTAMPTZ,
  timeout_seconds   INTEGER DEFAULT 300,
  max_retries       INTEGER DEFAULT 3,
  retry_delay       INTERVAL DEFAULT INTERVAL '5 minutes',
  created_by        UUID NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT scheduled_jobs_valid_cron CHECK (schedule_cron IS NOT NULL OR schedule_interval IS NOT NULL),
  CONSTRAINT scheduled_jobs_name_not_empty CHECK (trim(name) <> '')
);

-- Job Runs
CREATE TABLE analytics.job_runs (
  id                BIGINT NOT NULL DEFAULT nextval('analytics.job_run_id_seq'),
  job_id            UUID NOT NULL REFERENCES analytics.scheduled_jobs(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  status            core.job_status NOT NULL DEFAULT 'scheduled',
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  duration_ms       INTEGER,
  error_message     TEXT,
  result            JSONB,
  retry_count       core.non_negative_int DEFAULT 0,
  triggered_by      TEXT DEFAULT 'schedule',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT job_runs_pk PRIMARY KEY (id, tenant_id),
  CONSTRAINT job_runs_valid_triggered_by
    CHECK (triggered_by IN ('schedule', 'manual', 'api', 'event')),
  CONSTRAINT job_runs_duration_positive
    CHECK (duration_ms IS NULL OR duration_ms >= 0)
) PARTITION BY RANGE (created_at);

CREATE TABLE analytics.job_runs_2024 PARTITION OF analytics.job_runs
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE analytics.job_runs_2025 PARTITION OF analytics.job_runs
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE analytics.job_runs_default PARTITION OF analytics.job_runs
  DEFAULT;

-- ============================================================================
-- TABLES — CORE: Content and Collaboration
-- ============================================================================

-- Comments
CREATE TABLE core.comments (
  id                BIGINT NOT NULL DEFAULT nextval('core.comment_id_seq'),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id         UUID NOT NULL,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  parent_id         BIGINT,
  body              TEXT NOT NULL,
  body_format       TEXT NOT NULL DEFAULT 'markdown',
  visibility        core.comment_visibility NOT NULL DEFAULT 'internal',
  is_pinned         BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved       BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by       UUID,
  resolved_at       TIMESTAMPTZ,
  reactions         JSONB DEFAULT '{}'::jsonb,
  mentions          UUID[],
  metadata          HSTORE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT comments_pk PRIMARY KEY (id, tenant_id),
  CONSTRAINT comments_author_fkey
    FOREIGN KEY (author_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT comments_parent_fkey
    FOREIGN KEY (parent_id, tenant_id)
    REFERENCES core.comments(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT comments_body_not_empty CHECK (trim(body) <> ''),
  CONSTRAINT comments_valid_format CHECK (body_format IN ('plain', 'markdown', 'html', 'richtext')),
  CONSTRAINT comments_resolved_consistency
    CHECK ((is_resolved AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
           OR (NOT is_resolved AND resolved_by IS NULL AND resolved_at IS NULL))
) PARTITION BY HASH (tenant_id);

CREATE TABLE core.comments_p0 PARTITION OF core.comments
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE core.comments_p1 PARTITION OF core.comments
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE core.comments_p2 PARTITION OF core.comments
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE core.comments_p3 PARTITION OF core.comments
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Attachments
CREATE TABLE storage.attachments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  uploaded_by       UUID NOT NULL,
  filename          TEXT NOT NULL,
  content_type      TEXT NOT NULL,
  file_size         BIGINT NOT NULL,
  attachment_type   core.attachment_type NOT NULL DEFAULT 'other',
  storage_path      TEXT NOT NULL,
  storage_provider  TEXT NOT NULL DEFAULT 'local',
  checksum          TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  thumbnail_path    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT attachments_file_size_positive CHECK (file_size > 0),
  CONSTRAINT attachments_filename_not_empty CHECK (trim(filename) <> ''),
  CONSTRAINT attachments_uploader_fkey
    FOREIGN KEY (uploaded_by, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tags
CREATE TABLE core.tags (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  color             core.hex_color DEFAULT '#6B7280',
  description       TEXT,
  usage_count       core.non_negative_int DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT tags_unique_name UNIQUE (tenant_id, name),
  CONSTRAINT tags_name_format CHECK (name ~ '^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,98}[a-zA-Z0-9]$')
);

-- Taggings (polymorphic association)
CREATE TABLE core.taggings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tag_id            UUID NOT NULL REFERENCES core.tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT taggings_unique UNIQUE (tag_id, resource_type, resource_id),
  CONSTRAINT taggings_no_duplicate
    EXCLUDE USING btree (
      tenant_id WITH =,
      tag_id WITH =,
      resource_type WITH =,
      resource_id WITH =
    ) WHERE (tag_id IS NOT NULL)
);

-- Shares
CREATE TABLE core.shares (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  shared_by         UUID NOT NULL,
  shared_with_user  UUID,
  shared_with_team  UUID,
  shared_with_link  TEXT,
  permission        core.share_permission NOT NULL DEFAULT 'view',
  password_hash     TEXT,
  max_uses          INTEGER,
  use_count         core.non_negative_int DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  is_revoked        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT shares_shared_with CHECK (
    shared_with_user IS NOT NULL
    OR shared_with_team IS NOT NULL
    OR shared_with_link IS NOT NULL
  ),
  CONSTRAINT shares_shared_by_fkey
    FOREIGN KEY (shared_by, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT shares_max_uses_positive CHECK (max_uses IS NULL OR max_uses > 0)
);

-- Custom Fields
CREATE TABLE core.custom_fields (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  name              TEXT NOT NULL,
  field_type        core.custom_field_type NOT NULL,
  description       TEXT,
  is_required       BOOLEAN NOT NULL DEFAULT FALSE,
  is_unique         BOOLEAN NOT NULL DEFAULT FALSE,
  default_value     JSONB,
  validation_rules  JSONB,
  options           JSONB,
  applies_to        core.resource_type[] NOT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT custom_fields_unique_name UNIQUE (tenant_id, name),
  CONSTRAINT custom_fields_name_format CHECK (name ~ '^[a-zA-Z][a-zA-Z0-9_ ]{0,98}$')
);

-- Custom Field Values
CREATE TABLE core.custom_field_values (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  custom_field_id   UUID NOT NULL REFERENCES core.custom_fields(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  value             JSONB NOT NULL,
  number_value      NUMERIC,
  text_value        TEXT,
  date_value        DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT custom_field_values_unique UNIQUE (custom_field_id, resource_type, resource_id)
);

-- Activity Feeds
CREATE TABLE core.activity_feeds (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  action            core.event_action NOT NULL,
  description       TEXT NOT NULL,
  metadata          JSONB DEFAULT '{}'::jsonb,
  is_public         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT activity_feeds_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================================================
-- TABLES — SEARCH SCHEMA
-- ============================================================================

CREATE TABLE search.search_indexes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  resource_type     core.resource_type NOT NULL,
  resource_id       UUID NOT NULL,
  content           TEXT NOT NULL,
  search_vector     TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(content, '')), 'A')
  ) STORED,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT search_indexes_unique_resource UNIQUE (tenant_id, resource_type, resource_id),
  CONSTRAINT search_indexes_content_not_empty CHECK (trim(content) <> '')
);

-- ============================================================================
-- ADDITIONAL TABLES
-- ============================================================================

-- Tenant Invitations
CREATE TABLE core.invitations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  email             core.email NOT NULL,
  role              TEXT NOT NULL DEFAULT 'member',
  team_id           UUID REFERENCES core.teams(id) ON DELETE SET NULL ON UPDATE CASCADE,
  invited_by        UUID NOT NULL,
  token             TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status            core.invite_status NOT NULL DEFAULT 'pending',
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invitations_unique_token UNIQUE (token),
  CONSTRAINT invitations_unique_pending UNIQUE (tenant_id, email)
    DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT invitations_invited_by_fkey
    FOREIGN KEY (invited_by, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT invitations_valid_role
    CHECK (role IN ('owner', 'admin', 'member', 'guest'))
);

-- Scheduling with range/multirange types
CREATE TABLE core.schedules (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES core.tenants(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id           UUID NOT NULL,
  resource_type     core.resource_type,
  resource_id       UUID,
  schedule_type     TEXT NOT NULL DEFAULT 'availability',
  active_period     TSTZRANGE NOT NULL,
  -- PG14+ multirange type for availability windows
  availability      TSTZMULTIRANGE,
  recurrence_rule   TEXT,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT schedules_user_fkey
    FOREIGN KEY (user_id, tenant_id)
    REFERENCES core.users(id, tenant_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT schedules_valid_type
    CHECK (schedule_type IN ('availability', 'booking', 'block', 'reminder', 'deadline')),
  CONSTRAINT schedules_no_overlap
    EXCLUDE USING gist (
      user_id WITH =,
      active_period WITH &&
    )
);

-- ============================================================================
-- RLS POLICIES — enable RLS on all tenant-scoped tables
-- ============================================================================

ALTER TABLE core.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.feature_flag_rollouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.taggings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.activity_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sso_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.mfa_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.job_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search.search_indexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.attachments ENABLE ROW LEVEL SECURITY;

-- Permissive policies: tenant isolation
CREATE POLICY tenants_isolation ON core.tenants
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (id = current_setting('app.tenant_id')::UUID);

CREATE POLICY users_tenant_isolation ON core.users
  AS PERMISSIVE FOR SELECT
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY users_insert_own_tenant ON core.users
  AS PERMISSIVE FOR INSERT
  TO authenticated_role
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY users_update_own_tenant ON core.users
  AS PERMISSIVE FOR UPDATE
  TO authenticated_role
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY users_delete_own_tenant ON core.users
  AS PERMISSIVE FOR DELETE
  TO authenticated_role
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Restrictive policy: soft-deleted rows should not be visible
CREATE POLICY users_hide_deleted ON core.users
  AS RESTRICTIVE FOR SELECT
  TO PUBLIC
  USING (deleted_at IS NULL);

-- Teams policies
CREATE POLICY teams_tenant_isolation ON core.teams
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY teams_member_only ON core.teams
  AS RESTRICTIVE FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM core.team_members tm
      WHERE tm.team_id = core.teams.id
        AND tm.user_id = current_setting('app.user_id')::UUID
        AND tm.status = 'accepted'
    )
  );

-- Team members policies
CREATE POLICY team_members_tenant ON core.team_members
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Projects policies
CREATE POLICY projects_tenant ON core.projects
  AS PERMISSIVE FOR SELECT
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY projects_insert ON core.projects
  AS PERMISSIVE FOR INSERT
  TO authenticated_role
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY projects_update ON core.projects
  AS PERMISSIVE FOR UPDATE
  TO authenticated_role
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY projects_delete ON core.projects
  AS PERMISSIVE FOR DELETE
  TO authenticated_role
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Billing policies
CREATE POLICY accounts_tenant ON billing.accounts
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY subscriptions_tenant ON billing.subscriptions
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY invoices_tenant ON billing.invoices
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY payments_tenant ON billing.payments
  AS PERMISSIVE FOR ALL
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Audit log: read-only for tenant
CREATE POLICY audit_logs_tenant_read ON audit.audit_logs
  AS PERMISSIVE FOR SELECT
  TO PUBLIC
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

CREATE POLICY audit_logs_tenant_insert ON audit.audit_logs
  AS PERMISSIVE FOR INSERT
  TO PUBLIC
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Restrictive: hide audit logs for sensitive actions unless admin
CREATE POLICY audit_logs_sensitive_restriction ON audit.audit_logs
  AS RESTRICTIVE FOR SELECT
  TO PUBLIC
  USING (
    action NOT IN ('delete', 'export')
    OR EXISTS (
      SELECT 1 FROM auth.user_roles ur
      JOIN auth.roles r ON r.id = ur.role_id
      WHERE ur.user_id = current_setting('app.user_id')::UUID
        AND ur.tenant_id = audit.audit_logs.tenant_id
        AND r.name = 'admin'
    )
  );

-- ============================================================================
-- INDEXES — comprehensive coverage of all index types
-- ============================================================================

-- GIN indexes for JSONB
CREATE INDEX projects_settings_gin ON core.projects USING gin (settings);
CREATE INDEX tenants_settings_gin ON core.tenants USING gin (settings jsonb_path_ops);
CREATE INDEX feature_flags_rules_gin ON core.feature_flags USING gin (rules);
CREATE INDEX webhook_deliveries_payload_gin ON core.webhook_deliveries USING gin (payload);

-- GIN for full-text search
CREATE INDEX search_indexes_fts_idx ON search.search_indexes USING gin (search_vector);

CREATE INDEX users_search_idx ON core.users USING gin (search_vector);

-- GiST indexes for range types
CREATE INDEX schedules_active_period_gist ON core.schedules USING gist (active_period);
CREATE INDEX schedules_availability_gist ON core.schedules USING gist (availability);
CREATE INDEX subscriptions_part_period_gist ON billing.subscriptions_partitioned USING gist (current_period);

-- PG15: Parameterized operator class in CREATE INDEX
CREATE INDEX schedules_active_period_gist_float8
  ON core.schedules USING gist (active_period gist_tstzrange_ops(float8));

-- BRIN indexes for time-series
CREATE INDEX audit_logs_created_at_brin ON audit.audit_logs USING brin (created_at)
  WITH (pages_per_range = 128);
CREATE INDEX usage_records_tenant_brin ON billing.usage_records USING brin (tenant_id, recorded_at)
  WITH (pages_per_range = 32);

-- Expression indexes
CREATE INDEX users_email_lower_idx ON core.users (lower(email::text));
CREATE INDEX projects_name_lower_idx ON core.projects (lower(name));
CREATE INDEX tenants_display_name_idx ON core.tenants (lower(display_name))
  WHERE display_name IS NOT NULL;

-- Partial indexes with complex WHERE clauses
CREATE INDEX active_subscriptions_idx
  ON billing.subscriptions (tenant_id, status, current_period_end)
  WHERE status IN ('active', 'trialing') AND canceled_at IS NULL;

CREATE INDEX pending_invitations_idx
  ON core.invitations (tenant_id, email)
  WHERE status = 'pending' AND expires_at > now();

CREATE INDEX unpaid_invoices_idx
  ON billing.invoices (tenant_id, due_date)
  WHERE status = 'sent' AND paid_at IS NULL AND voided_at IS NULL;

CREATE INDEX active_api_keys_idx
  ON core.api_keys (tenant_id, key_prefix)
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now());

CREATE INDEX unresolved_comments_idx
  ON core.comments (resource_type, resource_id, created_at)
  WHERE is_resolved = FALSE AND deleted_at IS NULL;

-- Covering indexes (INCLUDE)
CREATE INDEX users_tenant_email_covering
  ON core.users (tenant_id, email) INCLUDE (display_name, status);

CREATE INDEX invoices_tenant_status_covering
  ON billing.invoices (tenant_id, status) INCLUDE (invoice_number, total, due_date, created_at);

CREATE INDEX projects_tenant_created_covering
  ON core.projects (tenant_id, created_at) INCLUDE (name, status, visibility)
  WHERE deleted_at IS NULL;

-- PG15: NULLS NOT DISTINCT indexes
CREATE UNIQUE INDEX feature_flags_key_nulls_not_distinct
  ON core.feature_flags (tenant_id, key) NULLS NOT DISTINCT
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX custom_field_values_unique_nulls
  ON core.custom_field_values (custom_field_id, resource_type, resource_id) NULLS NOT DISTINCT;

-- Multi-column indexes
CREATE INDEX team_members_user_role_idx ON core.team_members (user_id, role);
CREATE INDEX workspace_members_workspace_role ON core.workspace_members (workspace_id, role);

-- Trigram indexes for fuzzy search
CREATE INDEX tenants_name_trgm ON core.tenants USING gin (name gin_trgm_ops);
CREATE INDEX users_display_name_trgm ON core.users USING gin (display_name gin_trgm_ops);
CREATE INDEX projects_name_trgm ON core.projects USING gin (name gin_trgm_ops);

-- ============================================================================
-- PG15: SET ACCESS METHOD on tables
-- ============================================================================

ALTER TABLE core.activity_feeds SET ACCESS METHOD heap;

-- ============================================================================
-- FUNCTIONS — comprehensive coverage of all function attributes
-- ============================================================================

-- Helper: generate tenant-aware UUID
CREATE OR REPLACE FUNCTION core.generate_tenant_uuid(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
STRICT
PARALLEL SAFE
LEAKPROOF
SECURITY INVOKER
COST 1
AS $$
BEGIN
  RETURN uuid_generate_v5(p_tenant_id::uuid, gen_random_uuid()::text::bytea);
END;
$$;

-- Helper: set tenant context
CREATE OR REPLACE FUNCTION core.set_tenant_context(p_tenant_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
STRICT
PARALLEL UNSAFE
SECURITY DEFINER
SET search_path = core, public
AS $$
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id::text, FALSE);
  IF p_user_id IS NOT NULL THEN
    PERFORM set_config('app.user_id', p_user_id::text, FALSE);
  END IF;
END;
$$;

-- Helper: check tenant membership
CREATE OR REPLACE FUNCTION core.is_tenant_member(p_tenant_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
STRICT
PARALLEL SAFE
LEAKPROOF
SECURITY INVOKER
COST 10
AS $$
  SELECT EXISTS (
    SELECT 1 FROM core.users
    WHERE id = p_user_id
      AND tenant_id = p_tenant_id
      AND status = 'active'
      AND deleted_at IS NULL
  );
$$;

-- Calculate subscription cost
CREATE OR REPLACE FUNCTION billing.calculate_subscription_cost(
  p_plan_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_coupon_code TEXT DEFAULT NULL
)
RETURNS NUMERIC(19, 4)
LANGUAGE plpgsql
STABLE
STRICT
PARALLEL SAFE
SECURITY INVOKER
COST 50
AS $$
DECLARE
  v_base_price NUMERIC(19, 4);
  v_pricing_model core.pricing_model;
  v_total NUMERIC(19, 4);
  v_discount_pct NUMERIC(5, 2) DEFAULT 0;
BEGIN
  SELECT base_price, pricing_model
  INTO v_base_price, v_pricing_model
  FROM billing.subscription_plans
  WHERE id = p_plan_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive: %', p_plan_id;
  END IF;

  CASE v_pricing_model
    WHEN 'flat' THEN
      v_total := v_base_price;
    WHEN 'per_seat' THEN
      v_total := v_base_price * p_quantity;
    WHEN 'per_unit' THEN
      v_total := v_base_price * p_quantity;
    WHEN 'tiered' THEN
      v_total := v_base_price * GREATEST(p_quantity, 1);
    ELSE
      v_total := v_base_price;
  END CASE;

  IF p_coupon_code IS NOT NULL THEN
    -- Placeholder for coupon logic
    v_discount_pct := 0;
  END IF;

  RETURN ROUND(v_total * (1 - v_discount_pct / 100), 4);
END;
$$;

-- Audit log trigger function (uses transition tables)
CREATE OR REPLACE FUNCTION audit.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
STRICT
PARALLEL UNSAFE
SECURITY DEFINER
SET search_path = audit, core, public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_action core.event_action;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  v_user_id := current_setting('app.user_id', TRUE)::UUID;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new_data := to_jsonb(NEW);
    v_tenant_id := NEW.tenant_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_tenant_id := NEW.tenant_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old_data := to_jsonb(OLD);
    v_tenant_id := OLD.tenant_id;
  END IF;

  INSERT INTO audit.audit_logs (
    tenant_id, user_id, actor_type, actor_id, action,
    resource_type, resource_id, description,
    old_values, new_values, ip_address, request_id
  ) VALUES (
    v_tenant_id, v_user_id, 'user', COALESCE(v_user_id::text, 'system'), v_action,
    TG_TABLE_NAME::core.resource_type, COALESCE(NEW.id, OLD.id),
    format('%s %s', TG_OP, TG_TABLE_NAME),
    v_old_data, v_new_data,
    inet_client_addr(),
    current_setting('app.request_id', TRUE)::UUID
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function using transition tables for batch audit
CREATE OR REPLACE FUNCTION audit.audit_trigger_bulk_func()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY DEFINER
SET search_path = audit, core, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit.audit_logs (tenant_id, user_id, actor_type, actor_id, action, resource_type, resource_id, description, new_values)
    SELECT
      n.tenant_id,
      current_setting('app.user_id', TRUE)::UUID,
      'user',
      COALESCE(current_setting('app.user_id', TRUE), 'system'),
      'create',
      TG_TABLE_NAME::core.resource_type,
      n.id,
      format('INSERT %s', TG_TABLE_NAME),
      to_jsonb(n)
    FROM new_table n;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit.audit_logs (tenant_id, user_id, actor_type, actor_id, action, resource_type, resource_id, description, old_values)
    SELECT
      o.tenant_id,
      current_setting('app.user_id', TRUE)::UUID,
      'user',
      COALESCE(current_setting('app.user_id', TRUE), 'system'),
      'delete',
      TG_TABLE_NAME::core.resource_type,
      o.id,
      format('DELETE %s', TG_TABLE_NAME),
      to_jsonb(o)
    FROM old_table o;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit.audit_logs (tenant_id, user_id, actor_type, actor_id, action, resource_type, resource_id, description, old_values, new_values)
    SELECT
      n.tenant_id,
      current_setting('app.user_id', TRUE)::UUID,
      'user',
      COALESCE(current_setting('app.user_id', TRUE), 'system'),
      'update',
      TG_TABLE_NAME::core.resource_type,
      n.id,
      format('UPDATE %s', TG_TABLE_NAME),
      to_jsonb(o),
      to_jsonb(n)
    FROM new_table n
    JOIN old_table o ON n.id = o.id;
  END IF;

  RETURN NULL;
END;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION core.update_updated_at_func()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
PARALLEL SAFE
LEAKPROOF
COST 1
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Search vector update function
CREATE OR REPLACE FUNCTION search.search_vector_update_func()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email::text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.username::text, '')), 'C');
  RETURN NEW;
END;
$$;

-- Money to text conversion
CREATE OR REPLACE FUNCTION core.money_to_text(p_money core.money)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
LEAKPROOF
COST 1
AS $$
  SELECT format('%s %s', p_money.currency, p_money.amount);
$$;

-- Text to slug conversion
CREATE OR REPLACE FUNCTION core.text_to_slug(p_text TEXT)
RETURNS core.slug
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
LEAKPROOF
COST 5
AS $$
  SELECT lower(regexp_replace(regexp_replace(p_text, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))::core.slug;
$$;

-- Compute usage for a tenant
CREATE OR REPLACE FUNCTION billing.compute_tenant_usage(
  p_tenant_id UUID,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  resource_type TEXT,
  total_quantity NUMERIC,
  unit TEXT
)
LANGUAGE sql
STABLE
STRICT
PARALLEL SAFE
SECURITY INVOKER
COST 100
AS $$
  SELECT
    ur.resource_type,
    SUM(ur.quantity) AS total_quantity,
    ur.unit
  FROM billing.usage_records ur
  WHERE ur.tenant_id = p_tenant_id
    AND (p_from IS NULL OR ur.recorded_at >= p_from)
    AND (p_to IS NULL OR ur.recorded_at < p_to)
  GROUP BY ur.resource_type, ur.unit
  ORDER BY ur.resource_type;
$$;

-- ============================================================================
-- PROCEDURES — with INOUT, VARIADIC
-- ============================================================================

CREATE OR REPLACE PROCEDURE core.create_tenant(
  IN p_name TEXT,
  IN p_slug TEXT,
  IN p_plan_tier TEXT DEFAULT 'free',
  IN p_owner_email core.email,
  INOUT p_tenant_id UUID DEFAULT NULL,
  INOUT p_owner_id UUID DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = core, auth, billing, public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
BEGIN
  INSERT INTO core.tenants (id, slug, name, status, plan_tier)
  VALUES (uuid_generate_v4(), p_slug, p_name, 'provisioning', p_plan_tier)
  RETURNING id INTO v_tenant_id;

  INSERT INTO core.users (id, tenant_id, email, display_name, status)
  VALUES (uuid_generate_v4(), v_tenant_id, p_owner_email, split_part(p_owner_email::text, '@', 1), 'active')
  RETURNING id INTO v_user_id;

  -- Create default team
  INSERT INTO core.teams (id, tenant_id, name, slug, is_default)
  VALUES (uuid_generate_v4(), v_tenant_id, 'Everyone', 'everyone', TRUE);

  -- Create billing account
  INSERT INTO billing.accounts (id, tenant_id, billing_email)
  VALUES (uuid_generate_v4(), v_tenant_id, p_owner_email);

  -- Create default roles
  INSERT INTO auth.roles (id, tenant_id, name, description, is_system) VALUES
    (uuid_generate_v4(), v_tenant_id, 'admin', 'Administrator with full access', TRUE),
    (uuid_generate_v4(), v_tenant_id, 'member', 'Standard member', TRUE),
    (uuid_generate_v4(), v_tenant_id, 'viewer', 'Read-only access', TRUE);

  UPDATE core.tenants SET status = 'active' WHERE id = v_tenant_id;

  p_tenant_id := v_tenant_id;
  p_owner_id := v_user_id;

  COMMIT;
END;
$$;

-- Procedure with VARIADIC parameter
CREATE OR REPLACE PROCEDURE core.add_tags_to_resource(
  p_tenant_id UUID,
  p_resource_type core.resource_type,
  p_resource_id UUID,
  VARIADIC p_tag_names TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_tag_name TEXT;
  v_tag_id UUID;
BEGIN
  FOREACH v_tag_name IN ARRAY p_tag_names LOOP
    INSERT INTO core.tags (id, tenant_id, name)
    VALUES (uuid_generate_v4(), p_tenant_id, v_tag_name)
    ON CONFLICT (tenant_id, name) DO UPDATE SET usage_count = core.tags.usage_count + 1
    RETURNING id INTO v_tag_id;

    INSERT INTO core.taggings (id, tenant_id, tag_id, resource_type, resource_id)
    VALUES (uuid_generate_v4(), p_tenant_id, v_tag_id, p_resource_type, p_resource_id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON core.tenants
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_func();

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON core.teams
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_func();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON core.projects
  FOR EACH ROW
  WHEN (OLD.updated_at IS DISTINCT FROM NEW.updated_at OR OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION core.update_updated_at_func();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON billing.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_func();

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON billing.invoices
  FOR EACH ROW
  EXECUTE FUNCTION core.update_updated_at_func();

-- Search vector triggers
CREATE TRIGGER users_search_vector_update
  BEFORE INSERT OR UPDATE OF display_name, email, username ON core.users
  FOR EACH ROW
  WHEN (NEW.display_name IS DISTINCT FROM OLD.display_name
        OR NEW.email IS DISTINCT FROM OLD.email
        OR NEW.username IS DISTINCT FROM OLD.username)
  EXECUTE FUNCTION search.search_vector_update_func();

-- Audit log triggers
CREATE TRIGGER projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON core.projects
  FOR EACH ROW
  EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER teams_audit
  AFTER INSERT OR UPDATE OR DELETE ON core.teams
  FOR EACH ROW
  EXECUTE FUNCTION audit.audit_trigger_func();

-- Bulk audit trigger using transition tables
CREATE TRIGGER invoices_audit_bulk
  AFTER INSERT OR UPDATE OR DELETE ON billing.invoices
  REFERENCING NEW TABLE AS new_table OLD TABLE AS old_table
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit.audit_trigger_bulk_func();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Regular view with CHECK OPTION
CREATE VIEW core.active_users AS
  SELECT
    u.id,
    u.tenant_id,
    u.email,
    u.display_name,
    u.username,
    u.status,
    u.last_login_at,
    u.created_at
  FROM core.users u
  WHERE u.status = 'active'
    AND u.deleted_at IS NULL
WITH CHECK OPTION;

-- Recursive view for team hierarchy
CREATE RECURSIVE VIEW core.team_hierarchy (
  team_id,
  tenant_id,
  team_name,
  parent_team_id,
  depth_level,
  path
) AS
  SELECT
    t.id,
    t.tenant_id,
    t.name,
    t.parent_team_id,
    0,
    ARRAY[t.id]
  FROM core.teams t
  WHERE t.parent_team_id IS NULL AND t.deleted_at IS NULL

  UNION ALL

  SELECT
    t.id,
    t.tenant_id,
    t.name,
    t.parent_team_id,
    th.depth_level + 1,
    th.path || t.id
  FROM core.teams t
  JOIN core.team_hierarchy th ON t.parent_team_id = th.team_id
  WHERE t.deleted_at IS NULL
        AND th.depth_level < 10;

-- View with joins and aggregation
CREATE VIEW billing.subscription_summary AS
  SELECT
    s.tenant_id,
    s.id AS subscription_id,
    sp.name AS plan_name,
    sp.pricing_model,
    s.status,
    s.quantity,
    s.current_period_start,
    s.current_period_end,
    COALESCE(SUM(ur.quantity), 0) AS total_usage,
    sp.base_price * s.quantity AS estimated_cost
  FROM billing.subscriptions s
  JOIN billing.subscription_plans sp ON s.plan_id = sp.id
  LEFT JOIN billing.usage_records ur ON ur.subscription_id = s.id
    AND ur.recorded_at >= s.current_period_start
    AND ur.recorded_at < s.current_period_end
  WHERE s.ended_at IS NULL
  GROUP BY s.tenant_id, s.id, sp.name, sp.pricing_model, s.status,
           s.quantity, s.current_period_start, s.current_period_end, sp.base_price;

-- View for user permissions
CREATE VIEW auth.user_effective_permissions AS
  SELECT
    ur.user_id,
    ur.tenant_id,
    r.name AS role_name,
    p.resource_type,
    p.action,
    rp.condition,
    ur.resource_type AS scoped_resource_type,
    ur.resource_id AS scoped_resource_id,
    ur.expires_at AS role_expires_at
  FROM auth.user_roles ur
  JOIN auth.roles r ON ur.role_id = r.id
  JOIN auth.role_permissions rp ON r.id = rp.role_id
  JOIN auth.permissions p ON rp.permission_id = p.id
  WHERE ur.expires_at IS NULL OR ur.expires_at > now();

-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.tenant_usage_summary AS
  SELECT
    ur.tenant_id,
    ur.resource_type,
    date_trunc('day', ur.recorded_at) AS usage_date,
    SUM(ur.quantity) AS total_quantity,
    COUNT(DISTINCT ur.resource_id) AS unique_resources,
    COUNT(*) AS record_count,
    AVG(ur.quantity) AS avg_quantity
  FROM billing.usage_records ur
  GROUP BY ur.tenant_id, ur.resource_type, date_trunc('day', ur.recorded_at)
WITH DATA;

CREATE UNIQUE INDEX tenant_usage_summary_unique_idx
  ON analytics.tenant_usage_summary (tenant_id, resource_type, usage_date);

CREATE MATERIALIZED VIEW analytics.daily_active_users AS
  SELECT
    al.tenant_id,
    date_trunc('day', al.created_at) AS activity_date,
    COUNT(DISTINCT al.user_id) AS active_user_count,
    COUNT(DISTINCT CASE WHEN al.action = 'login' THEN al.user_id END) AS login_count
  FROM audit.audit_logs al
  WHERE al.action IN ('create', 'update', 'delete', 'login')
  GROUP BY al.tenant_id, date_trunc('day', al.created_at)
WITH DATA;

CREATE UNIQUE INDEX daily_active_users_unique_idx
  ON analytics.daily_active_users (tenant_id, activity_date);

-- ============================================================================
-- RULES
-- ============================================================================

-- Rule to prevent direct deletion of users (soft delete instead)
CREATE RULE protect_user_deletion AS
  ON DELETE TO core.users
  DO INSTEAD
    UPDATE core.users SET
      deleted_at = now(),
      status = 'deleted',
      email = email || '.deleted.' || extract(epoch from now())::text
    WHERE id = OLD.id AND tenant_id = OLD.tenant_id AND deleted_at IS NULL;

-- Rule to log updates to sensitive billing data
CREATE RULE log_billing_account_update AS
  ON UPDATE TO billing.accounts
  DO ALSO
    INSERT INTO audit.audit_logs (tenant_id, actor_type, actor_id, action, resource_type, resource_id, old_values, new_values)
    VALUES (
      NEW.tenant_id,
      'user',
      COALESCE(current_setting('app.user_id', TRUE), 'system'),
      'update',
      'billing_account',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );

-- ============================================================================
-- OPERATORS
-- ============================================================================

-- Custom operator: JSONB contains key (simplified)
CREATE OPERATOR core.?-> (
  LEFTARG = JSONB,
  RIGHTARG = TEXT,
  FUNCTION = jsonb_exists,
  COMMUTATOR = core.<-?,
  RESTRICT = contsel,
  JOIN = contjoinsel
);

CREATE OPERATOR core.<-? (
  LEFTARG = TEXT,
  RIGHTARG = JSONB,
  FUNCTION = jsonb_exists_right,
  COMMUTATOR = core.?->,
  RESTRICT = contsel,
  JOIN = contjoinsel
);

-- Helper function for the commutator
CREATE OR REPLACE FUNCTION core.jsonb_exists_right(p_text TEXT, p_jsonb JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
LEAKPROOF
AS $$
  SELECT p_jsonb ? p_text;
$$;

-- Money comparison operator
CREATE OPERATOR core.<=> (
  LEFTARG = core.money,
  RIGHTARG = core.money,
  FUNCTION = core.money_compare,
  COMMUTATOR = OPERATOR(core.<=>),
  NEGATOR = OPERATOR(core.>=<),
  RESTRICT = scalarltsel,
  JOIN = scalarltjoinsel
);

CREATE OR REPLACE FUNCTION core.money_compare(a core.money, b core.money)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
LEAKPROOF
AS $$
  SELECT CASE
    WHEN a.currency <> b.currency THEN NULL
    WHEN a.amount < b.amount THEN -1
    WHEN a.amount > b.amount THEN 1
    ELSE 0
  END;
$$;

-- PG17: ALTER OPERATOR ... SET (optimization attributes)
ALTER OPERATOR core.<=> (core.money, core.money)
  SET (RESTRICT = scalarltsel, JOIN = scalarltjoinsel);

-- ============================================================================
-- OPERATOR CLASSES AND FAMILIES
-- ============================================================================

CREATE OPERATOR FAMILY core.money_ops USING btree;

CREATE OPERATOR CLASS core.money_ops
  DEFAULT FOR TYPE core.money USING btree
  FAMILY core.money_ops AS
    OPERATOR 1 <,
    OPERATOR 2 <=,
    OPERATOR 3 =,
    OPERATOR 4 >=,
    OPERATOR 5 >,
    FUNCTION 1 core.money_compare(core.money, core.money);

-- ============================================================================
-- AGGREGATES
-- ============================================================================

-- Custom aggregate: JSONB merge
CREATE OR REPLACE FUNCTION core.jsonb_merge_state(state JSONB, value JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT state || value;
$$;

CREATE OR REPLACE FUNCTION core.jsonb_merge_final(state JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(state, '{}'::jsonb);
$$;

CREATE AGGREGATE core.jsonb_merge(JSONB) (
  SFUNC = core.jsonb_merge_state,
  STYPE = JSONB,
  FINALFUNC = core.jsonb_merge_final,
  INITCOND = '{}',
  COMBINEFUNC = core.jsonb_merge_state,
  PARALLEL = SAFE
);

-- Custom aggregate: array concatenation
CREATE OR REPLACE FUNCTION core.array_cat_state(state TEXT[], value TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT state || value;
$$;

CREATE AGGREGATE core.array_cat_agg(TEXT[]) (
  SFUNC = core.array_cat_state,
  STYPE = TEXT[],
  INITCOND = '{}',
  COMBINEFUNC = core.array_cat_state,
  PARALLEL = SAFE
);

-- ============================================================================
-- TEXT SEARCH OBJECTS
-- ============================================================================

CREATE TEXT SEARCH CONFIGURATION core.saas_english (
  COPY = pg_catalog.english
);

ALTER TEXT SEARCH CONFIGURATION core.saas_english
  ALTER MAPPING FOR hword, hword_part, word
  WITH english_stem, simple;

CREATE TEXT SEARCH DICTIONARY core.saas_synonym (
  TEMPLATE = synonym,
  SYNONYMS = 'saas_synonyms'
);

CREATE TEXT SEARCH PARSER core.saas_parser (
  START = prsd_start,
  GETTOKEN = prsd_nexttoken,
  END = prsd_end,
  HEADLINE = prsd_headline,
  LEXTYPES = prsd_lextype
);

CREATE TEXT SEARCH TEMPLATE core.saas_stem (
  INIT = dsnowball_init,
  LEXIZE = dsnowball_lexize
);

-- ============================================================================
-- STATISTICS OBJECTS
-- ============================================================================

CREATE STATISTICS core.users_email_status_stats
  ON email, status
  FROM core.users;

CREATE STATISTICS core.projects_tenant_status_ndistinct
  (ndistinct) ON tenant_id, status
  FROM core.projects;

CREATE STATISTICS core.invoices_tenant_amount_stats
  (ndistinct, dependencies, mcvmost_common_vals)
  ON tenant_id, status, total
  FROM billing.invoices;

-- PG17: ALTER TABLE ... SET STATISTICS DEFAULT
ALTER TABLE core.users SET STATISTICS DEFAULT 500;
ALTER TABLE billing.invoices SET STATISTICS DEFAULT 300;
ALTER TABLE audit.audit_logs SET STATISTICS DEFAULT 200;

-- ============================================================================
-- TRANSFORMS
-- ============================================================================

CREATE TRANSFORM FOR core.money LANGUAGE plpython3u (
  FROM SQL WITH FUNCTION core.money_to_text(core.money),
  TO SQL WITH FUNCTION core.text_to_money(TEXT)
);

-- Placeholder for the transform function
CREATE OR REPLACE FUNCTION core.text_to_money(p_text TEXT)
RETURNS core.money
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT ROW(
    (regexp_match(p_text, '[\d.]+'))[1]::NUMERIC(19,4),
    COALESCE((regexp_match(p_text, '[A-Z]{3}'))[1], 'USD')
  )::core.money;
$$;

-- ============================================================================
-- FOREIGN DATA WRAPPERS AND FOREIGN TABLES
-- ============================================================================

CREATE SERVER IF NOT EXISTS analytics_db
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'analytics.internal', port '5432', dbname 'analytics');

CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER analytics_db
  OPTIONS (user 'fdw_user', password 'fdw_password');

CREATE FOREIGN TABLE analytics.external_metrics (
  id UUID,
  metric_name TEXT,
  metric_value DOUBLE PRECISION,
  dimensions JSONB,
  recorded_at TIMESTAMPTZ
)
  SERVER analytics_db
  OPTIONS (schema_name 'public', table_name 'metrics');

CREATE FOREIGN TABLE analytics.external_events (
  id UUID,
  event_type TEXT,
  event_data JSONB,
  user_id UUID,
  tenant_id UUID,
  created_at TIMESTAMPTZ
)
  SERVER analytics_db
  OPTIONS (schema_name 'public', table_name 'events');

-- ============================================================================
-- PUBLICATIONS AND SUBSCRIPTIONS
-- ============================================================================

-- PG15: CREATE PUBLICATION ... FOR ALL TABLES (improved)
CREATE PUBLICATION saas_tenant_all_tables
  FOR ALL TABLES
  WITH (publish = 'insert, update, delete', publish_via_partition_root = TRUE);

-- Publication for specific tables
CREATE PUBLICATION saas_billing_changes
  FOR TABLE billing.accounts, billing.subscriptions, billing.invoices, billing.payments
  WITH (publish = 'insert, update, delete, truncate');

-- Publication for specific schemas (PG15+)
CREATE PUBLICATION saas_core_schema
  FOR TABLES IN SCHEMA core, auth
  WITH (publish_via_partition_root = TRUE);

-- PG17: CREATE SUBSCRIPTION with failover control
CREATE SUBSCRIPTION saas_replica
  CONNECTION 'host=replica.internal port=5432 dbname=saas_replica user=replicator password=secret'
  PUBLICATION saas_tenant_all_tables
  WITH (
    connect = TRUE,
    copy_data = TRUE,
    create_slot = TRUE,
    streaming = 'parallel',
    synchronous_commit = 'off',
    -- PG17: failover control for logical replication
    failover = TRUE
  );

-- ============================================================================
-- EVENT TRIGGERS
-- ============================================================================

-- Event trigger for DDL auditing
CREATE OR REPLACE FUNCTION audit.ddl_event_trigger_func()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  INSERT INTO audit.audit_logs (tenant_id, actor_type, actor_id, action, resource_type, description, metadata)
  VALUES (
    COALESCE(current_setting('app.tenant_id', TRUE)::UUID, '00000000-0000-0000-0000-000000000000'::UUID),
    'system',
    current_user,
    'create',
    'ddl_event',
    format('DDL event: %s %s', tg_event, tg_tag),
    jsonb_build_object(
      'event', tg_event,
      'tag', tg_tag,
      'user', current_user,
      'database', current_database(),
      'timestamp', now()
    )
  );
END;
$$;

CREATE EVENT TRIGGER audit_ddl_start
  ON ddl_command_start
  WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'DROP INDEX')
  EXECUTE FUNCTION audit.ddl_event_trigger_func();

CREATE EVENT TRIGGER audit_ddl_end
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE INDEX', 'ALTER TABLE')
  EXECUTE FUNCTION audit.ddl_event_trigger_func();

CREATE EVENT TRIGGER audit_sql_drop
  ON sql_drop
  EXECUTE FUNCTION audit.ddl_event_trigger_func();

-- PG17: Event trigger for login events
CREATE OR REPLACE FUNCTION audit.login_event_trigger_func()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, public
AS $$
BEGIN
  INSERT INTO audit.audit_logs (tenant_id, actor_type, actor_id, action, resource_type, description, metadata)
  VALUES (
    COALESCE(current_setting('app.tenant_id', TRUE)::UUID, '00000000-0000-0000-0000-000000000000'::UUID),
    'system',
    current_user,
    'login',
    'session',
    format('User login: %s', current_user),
    jsonb_build_object(
      'event', 'login',
      'user', current_user,
      'database', current_database(),
      'pid', pg_backend_pid(),
      'timestamp', now()
    )
  );
END;
$$;

-- PG17: Login event trigger
CREATE EVENT TRIGGER audit_login
  ON login
  EXECUTE FUNCTION audit.login_event_trigger_func();

-- ============================================================================
-- PG17: ALTER TABLE ... SET EXPRESSION / DROP EXPRESSION
-- ============================================================================

-- Add a generated column, then change its expression (PG17)
ALTER TABLE billing.invoice_items ADD COLUMN total_with_tax NUMERIC(19, 4)
  GENERATED ALWAYS AS (ROUND(quantity * unit_price * (1 + tax_rate / 100), 4)) STORED;

-- PG17: Change the generated column expression
ALTER TABLE billing.invoice_items
  ALTER COLUMN total_with_tax SET EXPRESSION (
    ROUND(quantity * unit_price * (1 + tax_rate / 100) - discount_amount, 4)
  );

-- PG17: Drop the generated expression, turning it into a regular column
ALTER TABLE billing.invoice_items
  ALTER COLUMN total_with_tax DROP EXPRESSION;

-- ============================================================================
-- PG17: ALTER TABLE ... MERGE PARTITIONS and SPLIT PARTITION
-- ============================================================================

-- Create a temporary partitioned table to demonstrate MERGE/SPLIT
CREATE TABLE core.temp_events (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT temp_events_pk PRIMARY KEY (id, tenant_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE core.temp_events_2024_jan PARTITION OF core.temp_events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE core.temp_events_2024_feb PARTITION OF core.temp_events
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- PG17: Merge two adjacent partitions into one
ALTER TABLE core.temp_events
  MERGE PARTITIONS core.temp_events_2024_jan, core.temp_events_2024_feb
  INTO core.temp_events_2024_q1;

-- PG17: Split a partition into two
ALTER TABLE core.temp_events
  SPLIT PARTITION core.temp_events_2024_q1
  INTO (
    core.temp_events_2024_jan_new FOR VALUES FROM ('2024-01-01') TO ('2024-02-01'),
    core.temp_events_2024_feb_new FOR VALUES FROM ('2024-02-01') TO ('2024-03-01')
  );

-- ============================================================================
-- PG14/15: DETACH PARTITION CONCURRENTLY and FINALIZE
-- ============================================================================

-- Detach a partition concurrently (non-blocking)
ALTER TABLE core.projects
  DETACH PARTITION core.projects_2024_q1 CONCURRENTLY;

-- If the concurrent detach didn't complete, finalize it
ALTER TABLE core.projects
  DETACH PARTITION core.projects_2024_q1 FINALIZE;

-- Re-attach it
ALTER TABLE core.projects
  ATTACH PARTITION core.projects_2024_q1
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

-- ============================================================================
-- PG15: MERGE statement (DML, included for completeness)
-- ============================================================================

-- Example MERGE for upserting usage records
-- MERGE INTO billing.usage_records target
-- USING (SELECT * FROM staging.usage_staging) source
-- ON target.tenant_id = source.tenant_id
--    AND target.resource_type = source.resource_type
--    AND target.recorded_at = source.recorded_at
-- WHEN MATCHED THEN
--   UPDATE SET quantity = target.quantity + source.quantity
-- WHEN NOT MATCHED THEN
--   INSERT (tenant_id, account_id, resource_type, quantity, unit, recorded_at)
--   VALUES (source.tenant_id, source.account_id, source.resource_type, source.quantity, source.unit, source.recorded_at);

-- ============================================================================
-- EXTENSIVE ALTER STATEMENTS
-- ============================================================================

-- ALTER TABLE with many sub-commands
ALTER TABLE core.tenants
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN settings SET DEFAULT '{}'::jsonb,
  ALTER COLUMN logo_url TYPE TEXT,
  ALTER COLUMN max_users SET DEFAULT 10,
  ALTER COLUMN created_at SET DEFAULT now(),
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'us-east-1',
  ADD COLUMN IF NOT EXISTS compliance_tags TEXT[] DEFAULT ARRAY[]::text[];

-- ALTER TABLE SET storage parameters
ALTER TABLE core.users
  SET (fillfactor = 80, autovacuum_analyze_threshold = 50, autovacuum_analyze_scale_factor = 0.02);

ALTER TABLE audit.audit_logs
  SET (fillfactor = 100, autovacuum_vacuum_threshold = 1000, autovacuum_vacuum_scale_factor = 0.05);

-- ALTER TABLE set tablespace
ALTER TABLE billing.invoices SET TABLESPACE ts_warm;
ALTER TABLE audit.audit_logs SET TABLESPACE ts_cold;

-- ALTER SEQUENCE
ALTER SEQUENCE billing.invoice_number_seq RESTART WITH 1000100;
ALTER SEQUENCE core.audit_log_id_seq CACHE 100;

-- ALTER INDEX
ALTER INDEX tenants_slug_nulls_not_distinct SET (fillfactor = 90);
ALTER INDEX invoices_tenant_status_covering SET (deduplicate_items = ON);

-- ALTER VIEW
ALTER VIEW core.active_users SET (check_option = local);

-- ALTER MATERIALIZED VIEW
ALTER MATERIALIZED VIEW analytics.tenant_usage_summary SET (autovacuum_enabled = TRUE);

-- ALTER SCHEMA
ALTER SCHEMA core OWNER TO postgres;
ALTER SCHEMA billing OWNER TO postgres;

-- ALTER TYPE
ALTER TYPE core.tenant_status ADD VALUE IF NOT EXISTS 'migrating' BEFORE 'archived';
ALTER TYPE core.user_status ADD VALUE IF NOT EXISTS 'impersonated' AFTER 'active';

-- ALTER DOMAIN
ALTER DOMAIN core.email ADD CONSTRAINT email_max_length CHECK (length(VALUE) <= 254);
ALTER DOMAIN core.slug VALIDATE CONSTRAINT slug_format;

-- ALTER PUBLICATION
ALTER PUBLICATION saas_billing_changes ADD TABLE billing.usage_records;
ALTER PUBLICATION saas_billing_changes SET (publish = 'insert, update, delete, truncate');

-- ALTER SUBSCRIPTION
ALTER SUBSCRIPTION saas_replica REFRESH PUBLICATION;
ALTER SUBSCRIPTION saas_replica SET (synchronous_commit = 'remote_apply');

-- ALTER FUNCTION
ALTER FUNCTION core.generate_tenant_uuid(UUID) COST 5;
ALTER FUNCTION billing.calculate_subscription_cost(UUID, INTEGER, TEXT) SET search_path = billing, core, public;

-- ALTER TRIGGER
ALTER TRIGGER projects_audit ON core.projects ENABLE;
ALTER TRIGGER teams_audit ON core.teams DISABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA core IS 'Core SaaS platform schema with tenant-scoped entities';
COMMENT ON SCHEMA billing IS 'Billing and subscription management schema';
COMMENT ON SCHEMA auth IS 'Authentication and authorization schema';
COMMENT ON SCHEMA integrations IS 'Third-party integration schema';
COMMENT ON SCHEMA analytics IS 'Analytics and reporting schema';
COMMENT ON SCHEMA notifications IS 'Notification management schema';
COMMENT ON SCHEMA search IS 'Full-text search schema';
COMMENT ON SCHEMA storage IS 'File storage schema';
COMMENT ON SCHEMA audit IS 'Audit logging schema';

COMMENT ON TABLE core.tenants IS 'Root multi-tenant entity representing a customer organization';
COMMENT ON TABLE core.users IS 'Platform users, partitioned by hash for scalability';
COMMENT ON TABLE core.teams IS 'Organizational teams within a tenant';
COMMENT ON TABLE core.team_members IS 'User-team membership with role-based access';
COMMENT ON TABLE core.projects IS 'Tenant projects, range-partitioned by creation date';
COMMENT ON TABLE core.project_settings IS 'Project-level configuration key-value store';
COMMENT ON TABLE core.workspaces IS 'Collaborative workspaces, list-partitioned by tenant';
COMMENT ON TABLE core.workspace_members IS 'Workspace membership with granular permissions';
COMMENT ON TABLE core.api_keys IS 'API authentication keys with rate limiting';
COMMENT ON TABLE core.feature_flags IS 'Feature flag definitions with rollout support';
COMMENT ON TABLE core.feature_flag_rollouts IS 'Gradual feature rollout configurations';
COMMENT ON TABLE core.webhooks IS 'Outbound webhook endpoint configurations';
COMMENT ON TABLE core.webhook_deliveries IS 'Individual webhook delivery attempts';
COMMENT ON TABLE core.tags IS 'Taxonomy tags for categorization';
COMMENT ON TABLE core.taggings IS 'Polymorphic tag-resource associations';
COMMENT ON TABLE core.shares IS 'Resource sharing with permission levels';
COMMENT ON TABLE core.custom_fields IS 'User-defined custom field definitions';
COMMENT ON TABLE core.custom_field_values IS 'Custom field values per resource';
COMMENT ON TABLE core.activity_feeds IS 'Activity feed entries for timeline views';
COMMENT ON TABLE core.comments IS 'Threaded comments on resources, hash-partitioned';
COMMENT ON TABLE core.invitations IS 'Tenant invitation management';
COMMENT ON TABLE core.schedules IS 'Scheduling with range and multirange types';

COMMENT ON TABLE billing.accounts IS 'Billing accounts linked to tenants';
COMMENT ON TABLE billing.subscription_plans IS 'Available subscription plan definitions';
COMMENT ON TABLE billing.subscriptions IS 'Active subscriptions per billing account';
COMMENT ON TABLE billing.subscriptions_partitioned IS 'Partitioned subscriptions with exclusion constraints (PG17)';
COMMENT ON TABLE billing.invoices IS 'Billing invoices, range-partitioned by creation date';
COMMENT ON TABLE billing.invoice_items IS 'Line items within invoices with generated totals';
COMMENT ON TABLE billing.payments IS 'Payment transactions against invoices';
COMMENT ON TABLE billing.usage_records IS 'Metered usage records for consumption billing';

COMMENT ON TABLE auth.roles IS 'RBAC role definitions per tenant';
COMMENT ON TABLE auth.permissions IS 'Granular permission definitions';
COMMENT ON TABLE auth.role_permissions IS 'Role-permission mapping with conditions';
COMMENT ON TABLE auth.user_roles IS 'User-role assignments with optional resource scoping';
COMMENT ON TABLE auth.sso_connections IS 'SSO provider configurations';
COMMENT ON TABLE auth.sso_mappings IS 'SSO attribute mapping rules';
COMMENT ON TABLE auth.mfa_config IS 'Multi-factor authentication configuration';

COMMENT ON TABLE audit.audit_logs IS 'Immutable audit log, range-partitioned by creation date';

COMMENT ON COLUMN core.tenants.settings IS 'Flexible JSONB settings: theme, features, limits';
COMMENT ON COLUMN core.tenants.metadata IS 'Hstore key-value metadata for extensibility';
COMMENT ON COLUMN core.users.search_vector IS 'Full-text search vector for user search';
COMMENT ON COLUMN billing.invoice_items.amount IS 'GENERATED ALWAYS AS (quantity * unit_price) STORED';
COMMENT ON COLUMN billing.invoice_items.tax_amount IS 'GENERATED ALWAYS AS (ROUND(quantity * unit_price * tax_rate / 100, 4)) STORED';
COMMENT ON COLUMN search.search_indexes.search_vector IS 'GENERATED ALWAYS AS tsvector from content column';

COMMENT ON INDEX tenants_slug_nulls_not_distinct IS 'PG15: Unique index with NULLS NOT DISTINCT';
COMMENT ON INDEX invoices_created_at_brin_idx IS 'BRIN index for time-series invoice data';
COMMENT ON INDEX schedules_active_period_gist_float8 IS 'PG15: Parameterized GiST opclass for tstzrange';

-- ============================================================================
-- DROP STATEMENTS (for completeness / testing parser)
-- ============================================================================

-- Drop the temporary demonstration table
DROP TABLE IF EXISTS core.temp_events CASCADE;

-- Drop example statistics
DROP STATISTICS IF EXISTS core.users_email_status_stats;

-- Drop example transform
DROP TRANSFORM IF EXISTS FOR core.money LANGUAGE plpython3u;

-- Drop example foreign server (if needed)
-- DROP SERVER IF EXISTS analytics_db CASCADE;

-- ============================================================================
-- GRANT STATEMENTS
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA core TO saas_app, saas_readonly;
GRANT USAGE ON SCHEMA billing TO saas_app, saas_billing;
GRANT USAGE ON SCHEMA auth TO saas_app;
GRANT USAGE ON SCHEMA integrations TO saas_app;
GRANT USAGE ON SCHEMA analytics TO saas_app, saas_analytics;
GRANT USAGE ON SCHEMA audit TO saas_app, saas_audit;
GRANT USAGE ON SCHEMA notifications TO saas_app;
GRANT USAGE ON SCHEMA search TO saas_app;
GRANT USAGE ON SCHEMA storage TO saas_app;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO saas_app;
GRANT SELECT ON ALL TABLES IN SCHEMA core TO saas_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA billing TO saas_billing;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO saas_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA audit TO saas_audit;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO saas_analytics;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core TO saas_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA billing TO saas_billing;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA analytics TO saas_app;

-- Grant function execution
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA core TO saas_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA billing TO saas_billing;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO saas_app;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA core
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO saas_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA billing
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO saas_billing;

ALTER DEFAULT PRIVILEGES IN SCHEMA audit
  GRANT SELECT, INSERT ON TABLES TO saas_audit;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
