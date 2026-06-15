-- ============================================================================
-- PG12-14 E-COMMERCE DATABASE SCHEMA — STRESS TEST FOR SQL PARSER
-- ============================================================================
-- Compatible with: PostgreSQL 12, 13, 14
-- Purpose: Exercise maximum DDL surface area for parser stress testing
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS btree_gist SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;
CREATE EXTENSION IF NOT EXISTS intarray SCHEMA public;
CREATE EXTENSION IF NOT EXISTS hstore SCHEMA public;
CREATE EXTENSION IF NOT EXISTS citext SCHEMA public;

-- ============================================================================
-- SECTION 2: DATABASE AND TABLESPACE
-- ============================================================================
-- Note: These may fail if not superuser; included for parser coverage

CREATE TABLESPACE ecommerce_data
  OWNER postgres
  LOCATION '/var/lib/postgresql/ecommerce_data'
  WITH (random_page_cost = 1.1, seq_page_cost = 1.0);

CREATE TABLESPACE ecommerce_index
  OWNER postgres
  LOCATION '/var/lib/postgresql/ecommerce_idx'
  WITH (random_page_cost = 1.5);

-- ============================================================================
-- SECTION 3: ROLES, USERS, GROUPS
-- ============================================================================
CREATE ROLE ecommerce_admin
  WITH
    LOGIN
    PASSWORD 'admin_secret_2024'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    CONNECTION LIMIT 50
    VALID UNTIL '2025-12-31 23:59:59';

CREATE ROLE ecommerce_readonly
  WITH
    NOLOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    INHERIT
    CONNECTION LIMIT 100;

CREATE ROLE ecommerce_appuser
  WITH
    LOGIN
    PASSWORD 'app_pass_2024'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    INHERIT
    CONNECTION LIMIT 200;

CREATE ROLE ecommerce_analyst
  WITH
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    INHERIT
    CONNECTION LIMIT 20;

CREATE USER ecommerce_migration
  WITH
    LOGIN
    SUPERUSER
    PASSWORD 'migration_pass'
    VALID UNTIL '2024-06-30';

CREATE GROUP ecommerce_devs
  WITH USER ecommerce_admin, ecommerce_appuser;

-- ============================================================================
-- SECTION 4: SCHEMAS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS inventory AUTHORIZATION ecommerce_admin;
CREATE SCHEMA IF NOT EXISTS orders AUTHORIZATION ecommerce_admin;
CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION ecommerce_admin;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION ecommerce_admin;
CREATE SCHEMA IF NOT EXISTS content AUTHORIZATION ecommerce_admin;
CREATE SCHEMA IF NOT EXISTS reporting AUTHORIZATION ecommerce_admin;
CREATE SCHEMA IF NOT EXISTS staging AUTHORIZATION ecommerce_admin;

-- ============================================================================
-- SECTION 5: CUSTOM TYPES — ENUMS
-- ============================================================================
CREATE TYPE public.order_status AS ENUM (
  'pending', 'confirmed', 'processing', 'shipped',
  'delivered', 'cancelled', 'refunded', 'on_hold',
  'awaiting_payment', 'awaiting_fulfillment', 'partially_shipped',
  'partially_refunded', 'returned'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending', 'authorized', 'captured', 'failed',
  'refunded', 'partially_refunded', 'voided', 'expired',
  'disputed', 'chargeback'
);

CREATE TYPE public.payment_method AS ENUM (
  'credit_card', 'debit_card', 'paypal', 'apple_pay',
  'google_pay', 'bank_transfer', 'crypto', 'gift_card',
  'store_credit', 'cash_on_delivery', 'installment'
);

CREATE TYPE public.shipment_status AS ENUM (
  'label_created', 'picked_up', 'in_transit',
  'out_for_delivery', 'delivered', 'failed_delivery',
  'returned_to_sender', 'customs_hold', 'lost', 'damaged'
);

CREATE TYPE public.inventory_status AS ENUM (
  'in_stock', 'low_stock', 'out_of_stock', 'discontinued',
  'pre_order', 'back_order', 'reserved'
);

CREATE TYPE public.coupon_type AS ENUM (
  'percentage', 'fixed_amount', 'free_shipping',
  'buy_x_get_y', 'bundle_discount'
);

CREATE TYPE public.promotion_type AS ENUM (
  'flash_sale', 'seasonal', 'clearance', 'loyalty',
  'new_customer', 'abandoned_cart', 'bogo', 'tiered'
);

CREATE TYPE public.notification_type AS ENUM (
  'order_confirmation', 'shipping_update', 'delivery_confirmation',
  'price_drop', 'back_in_stock', 'review_request',
  'promotional', 'account_alert', 'password_reset',
  'abandoned_cart', 'loyalty_milestone'
);

CREATE TYPE public.review_status AS ENUM (
  'pending', 'approved', 'rejected', 'flagged', 'hidden'
);

CREATE TYPE public.audit_action AS ENUM (
  'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE',
  'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE'
);

CREATE TYPE public.address_type AS ENUM (
  'shipping', 'billing', 'both', 'warehouse', 'returns'
);

CREATE TYPE public.attribute_data_type AS ENUM (
  'string', 'integer', 'decimal', 'boolean', 'date', 'json', 'enum'
);

CREATE TYPE public.variant_type AS ENUM (
  'size', 'color', 'material', 'style', 'weight', 'flavor', 'custom'
);

CREATE TYPE public.content_status AS ENUM (
  'draft', 'published', 'archived', 'scheduled', 'review'
);

-- ============================================================================
-- SECTION 6: CUSTOM TYPES — COMPOSITE TYPES
-- ============================================================================
CREATE TYPE public.money_amount AS (
  amount   NUMERIC(19, 4),
  currency CHAR(3)
);

CREATE TYPE public.geo_coordinates AS (
  latitude  DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

CREATE TYPE public.address_components AS (
  street_line1  VARCHAR(255),
  street_line2  VARCHAR(255),
  city          VARCHAR(100),
  state_province VARCHAR(100),
  postal_code   VARCHAR(20),
  country_code  CHAR(2)
);

CREATE TYPE public.dimension AS (
  length NUMERIC(10, 2),
  width  NUMERIC(10, 2),
  height NUMERIC(10, 2),
  unit   VARCHAR(10)
);

CREATE TYPE inventory.stock_quantity AS (
  available  INTEGER,
  reserved   INTEGER,
  damaged    INTEGER,
  incoming   INTEGER
);

CREATE TYPE auth.oauth_profile AS (
  provider    VARCHAR(50),
  provider_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires TIMESTAMPTZ
);

-- ============================================================================
-- SECTION 7: CUSTOM TYPES — RANGE TYPES
-- ============================================================================
CREATE TYPE public.tstzrange_range AS RANGE (
  SUBTYPE = TIMESTAMPTZ,
  SUBTYPE_OPCLASS = gist_timestamptz_ops
);

CREATE TYPE public.int4range_price AS RANGE (
  SUBTYPE = INTEGER,
  SUBTYPE_OPCLASS = int4_ops
);

CREATE TYPE public.daterange_promo AS RANGE (
  SUBTYPE = DATE,
  SUBTYPE_OPCLASS = gist_date_ops
);

-- ============================================================================
-- SECTION 8: DOMAINS
-- ============================================================================
CREATE DOMAIN public.email_address AS VARCHAR(320)
  NOT NULL
  DEFAULT 'unknown@example.com'
  CONSTRAINT email_format_check
    CHECK (VALUE ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

CREATE DOMAIN public.phone_number AS VARCHAR(30)
  CONSTRAINT phone_format_check
    CHECK (VALUE ~ '^\+?[0-9]{7,15}$' OR VALUE IS NULL);

CREATE DOMAIN public.positive_integer AS INTEGER
  NOT NULL
  CONSTRAINT positive_int_check
    CHECK (VALUE > 0);

CREATE DOMAIN public.non_negative_integer AS INTEGER
  NOT NULL
  DEFAULT 0
  CONSTRAINT non_negative_int_check
    CHECK (VALUE >= 0);

CREATE DOMAIN public.currency_code AS CHAR(3)
  NOT NULL
  DEFAULT 'USD'
  CONSTRAINT currency_code_check
    CHECK (VALUE IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'MXN', 'KRW'));

CREATE DOMAIN public.sku_code AS VARCHAR(50)
  NOT NULL
  CONSTRAINT sku_format_check
    CHECK (VALUE ~ '^[A-Z0-9]{3,10}-[A-Z0-9]{3,10}-[A-Z0-9]{2,8}$');

CREATE DOMAIN public.ip_address AS INET
  CONSTRAINT ip_not_multicast
    CHECK (NOT (VALUE <<= '224.0.0.0/4') OR VALUE IS NULL);

CREATE DOMAIN public.url_string AS VARCHAR(2048)
  CONSTRAINT url_format_check
    CHECK (VALUE ~ '^https?://' OR VALUE IS NULL);

CREATE DOMAIN public.percent_value AS NUMERIC(5, 2)
  NOT NULL
  CONSTRAINT percent_range_check
    CHECK (VALUE >= 0.00 AND VALUE <= 100.00);

CREATE DOMAIN public.hex_color AS CHAR(7)
  CONSTRAINT hex_color_check
    CHECK (VALUE ~ '^#[0-9a-fA-F]{6}$' OR VALUE IS NULL);

-- ============================================================================
-- SECTION 9: SEQUENCES
-- ============================================================================
CREATE SEQUENCE public.global_id_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 20
  CYCLE
  OWNED BY NONE;

CREATE SEQUENCE public.order_number_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 100000
  MAXVALUE 999999999
  START WITH 100000
  CACHE 50
  NO CYCLE;

CREATE SEQUENCE public.invoice_number_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 10000
  MAXVALUE 999999999
  START WITH 10000
  CACHE 10
  NO CYCLE;

CREATE SEQUENCE inventory.stock_movement_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 100
  NO CYCLE;

CREATE SEQUENCE analytics.event_id_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 500
  NO CYCLE;

CREATE SEQUENCE auth.session_id_seq
  AS BIGINT
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  START WITH 1
  CACHE 50
  NO CYCLE;

-- ============================================================================
-- SECTION 10: CORE TABLES — AUTH SCHEMA
-- ============================================================================
CREATE TABLE auth.roles (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,
  max_sessions  INTEGER DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_roles_name_length CHECK (LENGTH(name) >= 2 AND LENGTH(name) <= 100),
  CONSTRAINT chk_roles_max_sessions CHECK (max_sessions > 0)
) TABLESPACE ecommerce_data;

CREATE TABLE auth.permissions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  resource    VARCHAR(100) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_permissions_code_format CHECK (code ~ '^[a-z_]+:[a-z_]+$'),
  CONSTRAINT chk_permissions_action CHECK (action IN ('create', 'read', 'update', 'delete', 'manage', 'export', 'import'))
) TABLESPACE ecommerce_data;

CREATE TABLE auth.role_permissions (
  role_id       BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  granted_by    BIGINT,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_role_permissions PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id)
    REFERENCES auth.roles (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id)
    REFERENCES auth.permissions (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_rp_granted_by FOREIGN KEY (granted_by)
    REFERENCES auth.users (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) TABLESPACE ecommerce_data;

CREATE TABLE auth.users (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email             public.email_address UNIQUE,
  username          VARCHAR(50) NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  password_salt     TEXT,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  display_name      VARCHAR(200),
  avatar_url        public.url_string,
  phone             public.phone_number,
  date_of_birth     DATE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_staff          BOOLEAN NOT NULL DEFAULT FALSE,
  is_superuser      BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at     TIMESTAMPTZ,
  login_count       INTEGER NOT NULL DEFAULT 0,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  timezone          VARCHAR(50) NOT NULL DEFAULT 'UTC',
  locale            VARCHAR(10) NOT NULL DEFAULT 'en-US',
  currency_preference public.currency_code DEFAULT 'USD',
  metadata          JSONB DEFAULT '{}',
  oauth             auth.oauth_profile,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_users_username_format
    CHECK (username ~ '^[a-zA-Z][a-zA-Z0-9_.-]{1,49}$'),
  CONSTRAINT chk_users_password_hash_not_empty
    CHECK (LENGTH(password_hash) > 0),
  CONSTRAINT chk_users_name_length
    CHECK (LENGTH(first_name) >= 1 AND LENGTH(last_name) >= 1),
  CONSTRAINT chk_users_failed_login
    CHECK (failed_login_attempts >= 0),
  CONSTRAINT chk_users_dob_reasonable
    CHECK (date_of_birth IS NULL OR
           (date_of_birth > '1900-01-01' AND date_of_birth < CURRENT_DATE - INTERVAL '13 years'))
) TABLESPACE ecommerce_data;

CREATE TABLE auth.user_roles (
  user_id    BIGINT NOT NULL,
  role_id    BIGINT NOT NULL,
  assigned_by BIGINT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id)
    REFERENCES auth.roles (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_ur_assigned_by FOREIGN KEY (assigned_by)
    REFERENCES auth.users (id)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT chk_ur_expires CHECK (expires_at IS NULL OR expires_at > assigned_at)
) TABLESPACE ecommerce_data;

CREATE TABLE auth.sessions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      BIGINT NOT NULL,
  token_hash   VARCHAR(128) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(128),
  ip_address   public.ip_address,
  user_agent   TEXT,
  device_fingerprint VARCHAR(255),
  is_revoked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,

  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_sessions_expiry CHECK (expires_at > created_at),
  CONSTRAINT chk_sessions_not_empty_token CHECK (LENGTH(token_hash) > 0)
) TABLESPACE ecommerce_data;

CREATE TABLE auth.api_keys (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  key_prefix    CHAR(8) NOT NULL,
  key_hash      VARCHAR(128) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  scopes        TEXT[] NOT NULL DEFAULT ARRAY['read'],
  rate_limit    INTEGER NOT NULL DEFAULT 1000,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_api_keys_rate_limit CHECK (rate_limit > 0),
  CONSTRAINT chk_api_key_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 11: CORE TABLES — PUBLIC SCHEMA (USERS, ADDRESSES)
-- ============================================================================
CREATE TABLE public.addresses (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id        BIGINT NOT NULL,
  address_type   public.address_type NOT NULL DEFAULT 'both',
  label          VARCHAR(100),
  street_line1   VARCHAR(255) NOT NULL,
  street_line2   VARCHAR(255),
  city           VARCHAR(100) NOT NULL,
  state_province VARCHAR(100) NOT NULL,
  postal_code    VARCHAR(20) NOT NULL,
  country_code   CHAR(2) NOT NULL COLLATE "C",
  coordinates    public.geo_coordinates,
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  is_default     BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_addresses_country_code
    CHECK (LENGTH(country_code) = 2 AND country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT chk_addresses_postal_not_empty
    CHECK (LENGTH(postal_code) > 0),
  CONSTRAINT chk_addresses_coords
    CHECK (
      (coordinates IS NULL) OR
      ((coordinates).latitude BETWEEN -90.0 AND 90.0 AND
       (coordinates).longitude BETWEEN -180.0 AND 180.0)
    )
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 12: CORE TABLES — INVENTORY SCHEMA
-- ============================================================================
CREATE TABLE inventory.brands (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(200) NOT NULL UNIQUE,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  logo_url    public.url_string,
  description TEXT,
  website_url public.url_string,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_brands_name CHECK (LENGTH(name) >= 1),
  CONSTRAINT chk_brands_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.categories (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id       BIGINT,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL UNIQUE,
  description     TEXT,
  image_url       public.url_string,
  icon_class      VARCHAR(100),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title       VARCHAR(255),
  seo_description TEXT,
  seo_keywords    VARCHAR(500),
  breadcrumbs     LTREE,
  level           INTEGER NOT NULL DEFAULT 0,
  path            TEXT GENERATED ALWAYS AS (text(breadcrumbs)) STORED,
  product_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id)
    REFERENCES inventory.categories (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT chk_categories_name CHECK (LENGTH(name) >= 1),
  CONSTRAINT chk_categories_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT chk_categories_level CHECK (level >= 0 AND level <= 5),
  CONSTRAINT chk_categories_not_self_parent CHECK (parent_id IS NULL OR parent_id != id)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.suppliers (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  code            VARCHAR(20) NOT NULL UNIQUE,
  contact_name    VARCHAR(200),
  contact_email   public.email_address,
  contact_phone   public.phone_number,
  address         public.address_components,
  lead_time_days  INTEGER NOT NULL DEFAULT 7,
  minimum_order   NUMERIC(19, 4) NOT NULL DEFAULT 0,
  payment_terms   VARCHAR(100),
  rating          NUMERIC(3, 2) DEFAULT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_suppliers_lead_time CHECK (lead_time_days >= 0),
  CONSTRAINT chk_suppliers_rating CHECK (rating IS NULL OR (rating >= 0.00 AND rating <= 5.00)),
  CONSTRAINT chk_suppliers_min_order CHECK (minimum_order >= 0)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.warehouses (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  code            VARCHAR(20) NOT NULL UNIQUE,
  address         public.address_components NOT NULL,
  coordinates     public.geo_coordinates,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  capacity        INTEGER NOT NULL DEFAULT 10000,
  current_utilization INTEGER NOT NULL DEFAULT 0,
  operating_hours JSONB DEFAULT '{"timezone": "UTC", "hours": {"mon-fri": "09:00-18:00"}}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_warehouses_capacity CHECK (capacity > 0),
  CONSTRAINT chk_warehouses_utilization CHECK (current_utilization >= 0 AND current_utilization <= capacity),
  CONSTRAINT chk_warehouses_coords
    CHECK (
      coordinates IS NULL OR
      ((coordinates).latitude BETWEEN -90.0 AND 90.0 AND
       (coordinates).longitude BETWEEN -180.0 AND 180.0)
    )
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.attributes (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  data_type    public.attribute_data_type NOT NULL DEFAULT 'string',
  unit         VARCHAR(50),
  is_required  BOOLEAN NOT NULL DEFAULT FALSE,
  is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
  is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  validation_rules JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_attributes_name CHECK (LENGTH(name) >= 1),
  CONSTRAINT uq_attributes_name UNIQUE (name)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.attribute_values (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attribute_id  BIGINT NOT NULL,
  value         VARCHAR(500) NOT NULL,
  display_value VARCHAR(500),
  swatch_color  public.hex_color,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_attr_values_attribute FOREIGN KEY (attribute_id)
    REFERENCES inventory.attributes (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT uq_attr_values_per_attribute UNIQUE (attribute_id, value)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.products (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brand_id          BIGINT,
  category_id       BIGINT NOT NULL,
  supplier_id       BIGINT,
  sku               public.sku_code NOT NULL,
  name              VARCHAR(500) NOT NULL,
  slug              VARCHAR(540) NOT NULL,
  description       TEXT,
  short_description VARCHAR(500),
  base_price        NUMERIC(19, 4) NOT NULL,
  sale_price        NUMERIC(19, 4),
  cost_price        NUMERIC(19, 4),
  currency          public.currency_code NOT NULL DEFAULT 'USD',
  tax_rate          public.percent_value DEFAULT 0.00,
  weight            NUMERIC(10, 3),
  dimensions        public.dimension,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  is_digital        BOOLEAN NOT NULL DEFAULT FALSE,
  is_downloadable   BOOLEAN NOT NULL DEFAULT FALSE,
  requires_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  min_purchase_qty  INTEGER NOT NULL DEFAULT 1,
  max_purchase_qty  INTEGER DEFAULT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  meta_title        VARCHAR(255),
  meta_description  TEXT,
  meta_keywords     VARCHAR(500),
  search_vector     TSVECTOR,
  status            public.inventory_status NOT NULL DEFAULT 'in_stock',
  published_at      TIMESTAMPTZ,
  discontinued_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  price_range       NUMERIC(19, 4) GENERATED ALWAYS AS (
    COALESCE(sale_price, base_price)
  ) STORED,

  effective_price   NUMERIC(19, 4) GENERATED ALWAYS AS (
    CASE
      WHEN sale_price IS NOT NULL AND sale_price < base_price THEN sale_price
      ELSE base_price
    END
  ) STORED,

  has_discount      BOOLEAN GENERATED ALWAYS AS (
    sale_price IS NOT NULL AND sale_price < base_price
  ) STORED,

  discount_pct      NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE
      WHEN sale_price IS NOT NULL AND sale_price < base_price AND base_price > 0
      THEN ROUND(((base_price - sale_price) / base_price) * 100, 2)
      ELSE 0.00
    END
  ) STORED,

  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id)
    REFERENCES inventory.brands (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES inventory.categories (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id)
    REFERENCES inventory.suppliers (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT chk_products_base_price CHECK (base_price >= 0),
  CONSTRAINT chk_products_sale_price CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT chk_products_cost_price CHECK (cost_price IS NULL OR cost_price >= 0),
  CONSTRAINT chk_products_weight CHECK (weight IS NULL OR weight > 0),
  CONSTRAINT chk_products_purchase_qty CHECK (min_purchase_qty >= 1),
  CONSTRAINT chk_products_max_qty CHECK (max_purchase_qty IS NULL OR max_purchase_qty >= min_purchase_qty),
  CONSTRAINT chk_products_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT uq_products_sku UNIQUE (sku),
  CONSTRAINT uq_products_slug UNIQUE (slug)
) TABLESPACE ecommerce_data;

-- Column storage specifications
ALTER TABLE inventory.products ALTER COLUMN description SET STORAGE EXTENDED;
ALTER TABLE inventory.products ALTER COLUMN short_description SET STORAGE EXTENDED;
ALTER TABLE inventory.products ALTER COLUMN search_vector SET STORAGE PLAIN;
ALTER TABLE inventory.products ALTER COLUMN weight SET STORAGE MAIN;
ALTER TABLE inventory.products ALTER COLUMN is_active SET STORAGE PLAIN;

-- Storage parameters
ALTER TABLE inventory.products SET (
  fillfactor = 85,
  autovacuum_enabled = TRUE,
  autovacuum_vacuum_threshold = 500,
  autovacuum_analyze_threshold = 250,
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05,
  toast_tuple_target = 4096
);

CREATE TABLE inventory.product_attributes (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id       BIGINT NOT NULL,
  attribute_id     BIGINT NOT NULL,
  attribute_value_id BIGINT,
  custom_value     TEXT,
  is_highlighted   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT fk_pa_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_pa_attribute FOREIGN KEY (attribute_id)
    REFERENCES inventory.attributes (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_pa_attribute_value FOREIGN KEY (attribute_value_id)
    REFERENCES inventory.attribute_values (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT chk_pa_value_source CHECK (
    (attribute_value_id IS NOT NULL AND custom_value IS NULL) OR
    (attribute_value_id IS NULL AND custom_value IS NOT NULL) OR
    (attribute_value_id IS NOT NULL AND custom_value IS NOT NULL)
  ),
  CONSTRAINT uq_pa_product_attribute UNIQUE (product_id, attribute_id, attribute_value_id)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.tags (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  slug      VARCHAR(120) NOT NULL UNIQUE,
  type      VARCHAR(50) DEFAULT 'generic',
  color     public.hex_color,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_tags_name CHECK (LENGTH(name) >= 1),
  CONSTRAINT chk_tags_slug CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.product_tags (
  product_id BIGINT NOT NULL,
  tag_id     BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_product_tags PRIMARY KEY (product_id, tag_id),
  CONSTRAINT fk_pt_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_pt_tag FOREIGN KEY (tag_id)
    REFERENCES inventory.tags (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.variants (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id    BIGINT NOT NULL,
  sku           public.sku_code NOT NULL UNIQUE,
  name          VARCHAR(500) NOT NULL,
  base_price    NUMERIC(19, 4),
  sale_price    NUMERIC(19, 4),
  cost_price    NUMERIC(19, 4),
  weight        NUMERIC(10, 3),
  dimensions    public.dimension,
  barcode       VARCHAR(50),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  image_url     public.url_string,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_variants_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_variants_base_price CHECK (base_price IS NULL OR base_price >= 0),
  CONSTRAINT chk_variants_sale_price CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT chk_variants_weight CHECK (weight IS NULL OR weight > 0)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.variant_values (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  variant_id        BIGINT NOT NULL,
  attribute_id      BIGINT NOT NULL,
  attribute_value_id BIGINT,
  custom_value      TEXT,

  CONSTRAINT fk_vv_variant FOREIGN KEY (variant_id)
    REFERENCES inventory.variants (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_vv_attribute FOREIGN KEY (attribute_id)
    REFERENCES inventory.attributes (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_vv_attr_value FOREIGN KEY (attribute_value_id)
    REFERENCES inventory.attribute_values (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT uq_vv_variant_attribute UNIQUE (variant_id, attribute_id)
) TABLESPACE ecommerce_data;

CREATE TABLE inventory.stock (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id       BIGINT NOT NULL,
  variant_id       BIGINT,
  warehouse_id     BIGINT NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 0,
  reserved         INTEGER NOT NULL DEFAULT 0,
  damaged          INTEGER NOT NULL DEFAULT 0,
  incoming         INTEGER NOT NULL DEFAULT 0,
  reorder_point    INTEGER NOT NULL DEFAULT 10,
  reorder_quantity INTEGER NOT NULL DEFAULT 100,
  batch_number     VARCHAR(100),
  expiration_date  DATE,
  last_counted_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  available_qty    INTEGER GENERATED ALWAYS AS (quantity - reserved - damaged) STORED,

  CONSTRAINT fk_stock_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_stock_variant FOREIGN KEY (variant_id)
    REFERENCES inventory.variants (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id)
    REFERENCES inventory.warehouses (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_stock_quantity CHECK (quantity >= 0),
  CONSTRAINT chk_stock_reserved CHECK (reserved >= 0),
  CONSTRAINT chk_stock_damaged CHECK (damaged >= 0),
  CONSTRAINT chk_stock_incoming CHECK (incoming >= 0),
  CONSTRAINT chk_stock_reserved_le_qty CHECK (reserved <= quantity),
  CONSTRAINT chk_stock_damaged_le_qty CHECK (damaged <= quantity),
  CONSTRAINT uq_stock_product_variant_warehouse UNIQUE (product_id, variant_id, warehouse_id)
) TABLESPACE ecommerce_data;

ALTER TABLE inventory.stock ALTER COLUMN batch_number SET STORAGE PLAIN;
ALTER TABLE inventory.stock SET (fillfactor = 90, autovacuum_vacuum_scale_factor = 0.05);

CREATE TABLE inventory.stock_movements (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id     BIGINT NOT NULL,
  variant_id     BIGINT,
  warehouse_id   BIGINT NOT NULL,
  movement_type  VARCHAR(30) NOT NULL,
  quantity        INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id   BIGINT,
  notes          TEXT,
  performed_by   BIGINT,
  performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_sm_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_sm_variant FOREIGN KEY (variant_id)
    REFERENCES inventory.variants (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_sm_warehouse FOREIGN KEY (warehouse_id)
    REFERENCES inventory.warehouses (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_sm_movement_type CHECK (movement_type IN (
    'inbound', 'outbound', 'adjustment', 'transfer', 'return', 'damaged', 'reserved', 'unreserved'
  )),
  CONSTRAINT chk_sm_quantity_not_zero CHECK (quantity != 0)
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 13: CORE TABLES — ORDERS SCHEMA
-- ============================================================================
CREATE TABLE orders.shipping_methods (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name              VARCHAR(200) NOT NULL,
  code              VARCHAR(50) NOT NULL UNIQUE,
  description       TEXT,
  carrier           VARCHAR(100) NOT NULL,
  base_price        NUMERIC(19, 4) NOT NULL,
  free_threshold    NUMERIC(19, 4),
  estimated_days_min INTEGER NOT NULL DEFAULT 1,
  estimated_days_max INTEGER NOT NULL DEFAULT 7,
  weight_limit      NUMERIC(10, 3),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  regions           TEXT[] DEFAULT ARRAY['*'],
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_shipping_base_price CHECK (base_price >= 0),
  CONSTRAINT chk_shipping_free_threshold CHECK (free_threshold IS NULL OR free_threshold > 0),
  CONSTRAINT chk_shipping_est_days CHECK (estimated_days_min >= 1 AND estimated_days_max >= estimated_days_min),
  CONSTRAINT chk_shipping_weight_limit CHECK (weight_limit IS NULL OR weight_limit > 0)
) TABLESPACE ecommerce_data;

CREATE TABLE orders.coupons (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code            VARCHAR(50) NOT NULL UNIQUE COLLATE "C",
  description     TEXT,
  coupon_type     public.coupon_type NOT NULL DEFAULT 'percentage',
  value           NUMERIC(19, 4) NOT NULL,
  min_order_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
  max_discount    NUMERIC(19, 4),
  usage_limit     INTEGER,
  usage_limit_per_user INTEGER DEFAULT 1,
  times_used      INTEGER NOT NULL DEFAULT 0,
  applies_to_category_ids BIGINT[] DEFAULT '{}',
  applies_to_product_ids BIGINT[] DEFAULT '{}',
  excludes_sale_items BOOLEAN NOT NULL DEFAULT FALSE,
  is_stackable    BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at         TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_coupons_value CHECK (value > 0),
  CONSTRAINT chk_coupons_min_order CHECK (min_order_amount >= 0),
  CONSTRAINT chk_coupons_max_discount CHECK (max_discount IS NULL OR max_discount > 0),
  CONSTRAINT chk_coupons_usage_limit CHECK (usage_limit IS NULL OR usage_limit > 0),
  CONSTRAINT chk_coupons_per_user CHECK (usage_limit_per_user >= 1),
  CONSTRAINT chk_coupons_ends_at CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT chk_coupons_pct_value CHECK (
    coupon_type != 'percentage' OR (value >= 0 AND value <= 100)
  )
) TABLESPACE ecommerce_data;

CREATE TABLE orders.orders (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number        BIGINT NOT NULL DEFAULT nextval('public.order_number_seq') UNIQUE,
  user_id             BIGINT NOT NULL,
  status              public.order_status NOT NULL DEFAULT 'pending',
  subtotal            NUMERIC(19, 4) NOT NULL,
  discount_amount     NUMERIC(19, 4) NOT NULL DEFAULT 0,
  tax_amount          NUMERIC(19, 4) NOT NULL DEFAULT 0,
  shipping_amount     NUMERIC(19, 4) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(19, 4) NOT NULL,
  currency            public.currency_code NOT NULL DEFAULT 'USD',
  coupon_id           BIGINT,
  shipping_method_id  BIGINT,
  shipping_address_id BIGINT NOT NULL,
  billing_address_id  BIGINT NOT NULL,
  customer_note       TEXT,
  internal_notes      TEXT,
  ip_address          public.ip_address,
  user_agent          TEXT,
  source              VARCHAR(50) NOT NULL DEFAULT 'web',
  referral_code       VARCHAR(50),
  is_gift             BOOLEAN NOT NULL DEFAULT FALSE,
  gift_message        TEXT,
  gift_wrap_requested BOOLEAN NOT NULL DEFAULT FALSE,
  metadata            JSONB DEFAULT '{}',
  placed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  total_items         INTEGER GENERATED ALWAYS AS (
    (metadata->>'item_count')::INTEGER
  ) STORED,

  CONSTRAINT fk_orders_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id)
    REFERENCES orders.coupons (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_orders_shipping_method FOREIGN KEY (shipping_method_id)
    REFERENCES orders.shipping_methods (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_orders_shipping_addr FOREIGN KEY (shipping_address_id)
    REFERENCES public.addresses (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_orders_billing_addr FOREIGN KEY (billing_address_id)
    REFERENCES public.addresses (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_orders_subtotal CHECK (subtotal >= 0),
  CONSTRAINT chk_orders_discount CHECK (discount_amount >= 0),
  CONSTRAINT chk_orders_tax CHECK (tax_amount >= 0),
  CONSTRAINT chk_orders_shipping CHECK (shipping_amount >= 0),
  CONSTRAINT chk_orders_total CHECK (total_amount >= 0),
  CONSTRAINT chk_orders_total_math
    CHECK (ABS(total_amount - (subtotal - discount_amount + tax_amount + shipping_amount)) < 0.01),
  CONSTRAINT chk_orders_cancel_info
    CHECK (cancelled_at IS NULL OR status IN ('cancelled', 'refunded')),
  CONSTRAINT chk_orders_source
    CHECK (source IN ('web', 'mobile_ios', 'mobile_android', 'api', 'admin', 'marketplace', 'pos'))
) TABLESPACE ecommerce_data;

-- Deferrable constraint example
ALTER TABLE orders.orders
  ADD CONSTRAINT fk_orders_deferred_coupon
  FOREIGN KEY (coupon_id)
  REFERENCES orders.coupons (id)
  ON DELETE SET NULL
  ON UPDATE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE orders.order_items (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id        BIGINT NOT NULL,
  product_id      BIGINT NOT NULL,
  variant_id      BIGINT,
  sku             VARCHAR(50) NOT NULL,
  product_name    VARCHAR(500) NOT NULL,
  variant_name    VARCHAR(500),
  unit_price      NUMERIC(19, 4) NOT NULL,
  original_price  NUMERIC(19, 4),
  quantity        public.positive_integer NOT NULL,
  discount_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
  tax_amount      NUMERIC(19, 4) NOT NULL DEFAULT 0,
  total_price     NUMERIC(19, 4) NOT NULL,
  is_refunded     BOOLEAN NOT NULL DEFAULT FALSE,
  refunded_qty    INTEGER NOT NULL DEFAULT 0,
  fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'unfulfilled',
  metadata        JSONB DEFAULT '{}',

  line_total      NUMERIC(19, 4) GENERATED ALWAYS AS (
    (unit_price * quantity) - discount_amount + tax_amount
  ) STORED,

  CONSTRAINT fk_oi_order FOREIGN KEY (order_id)
    REFERENCES orders.orders (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id)
    REFERENCES inventory.variants (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT chk_oi_unit_price CHECK (unit_price >= 0),
  CONSTRAINT chk_oi_original_price CHECK (original_price IS NULL OR original_price >= 0),
  CONSTRAINT chk_oi_discount CHECK (discount_amount >= 0),
  CONSTRAINT chk_oi_tax CHECK (tax_amount >= 0),
  CONSTRAINT chk_oi_total CHECK (total_price >= 0),
  CONSTRAINT chk_oi_refunded_qty CHECK (refunded_qty >= 0 AND refunded_qty <= quantity),
  CONSTRAINT chk_oi_fulfillment CHECK (fulfillment_status IN (
    'unfulfilled', 'partial', 'fulfilled', 'returned', 'cancelled'
  ))
) TABLESPACE ecommerce_data;

-- MATCH FULL constraint example
ALTER TABLE orders.order_items
  ADD CONSTRAINT fk_oi_product_variant_match_full
  FOREIGN KEY (product_id, variant_id)
  REFERENCES inventory.variants (product_id, id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE
  MATCH FULL;

CREATE TABLE orders.payments (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id          BIGINT NOT NULL,
  payment_method    public.payment_method NOT NULL,
  status            public.payment_status NOT NULL DEFAULT 'pending',
  amount            NUMERIC(19, 4) NOT NULL,
  currency          public.currency_code NOT NULL DEFAULT 'USD',
  transaction_id    VARCHAR(255),
  gateway_response  JSONB,
  gateway_fee       NUMERIC(19, 4) DEFAULT 0,
  last4             CHAR(4),
  card_brand        VARCHAR(50),
  card_expiry_month INTEGER,
  card_expiry_year  INTEGER,
  billing_email     public.email_address,
  refund_amount     NUMERIC(19, 4) NOT NULL DEFAULT 0,
  attempted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
    REFERENCES orders.orders (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_payments_amount CHECK (amount > 0),
  CONSTRAINT chk_payments_gateway_fee CHECK (gateway_fee >= 0),
  CONSTRAINT chk_payments_refund CHECK (refund_amount >= 0 AND refund_amount <= amount),
  CONSTRAINT chk_payments_card_expiry CHECK (
    (card_expiry_month IS NULL AND card_expiry_year IS NULL) OR
    (card_expiry_month IS NOT NULL AND card_expiry_year IS NOT NULL AND
     card_expiry_month BETWEEN 1 AND 12 AND card_expiry_year >= 2020)
  )
) TABLESPACE ecommerce_data;

-- MATCH SIMPLE constraint
ALTER TABLE orders.payments
  ADD CONSTRAINT fk_payments_refund_ref
  FOREIGN KEY (order_id, refund_amount)
  REFERENCES orders.orders (id, total_amount)
  ON DELETE NO ACTION
  ON UPDATE NO ACTION
  MATCH SIMPLE;

CREATE TABLE orders.refunds (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id        BIGINT NOT NULL,
  payment_id      BIGINT,
  amount          NUMERIC(19, 4) NOT NULL,
  reason          TEXT NOT NULL,
  reason_code     VARCHAR(50),
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  items_json      JSONB,
  processed_by    BIGINT,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_refunds_order FOREIGN KEY (order_id)
    REFERENCES orders.orders (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id)
    REFERENCES orders.payments (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_refunds_processed_by FOREIGN KEY (processed_by)
    REFERENCES auth.users (id)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT chk_refunds_amount CHECK (amount > 0),
  CONSTRAINT chk_refunds_status CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected'))
) TABLESPACE ecommerce_data;

CREATE TABLE orders.shipments (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id           BIGINT NOT NULL,
  order_item_ids     BIGINT[] NOT NULL,
  shipping_method_id BIGINT NOT NULL,
  carrier            VARCHAR(100) NOT NULL,
  tracking_number    VARCHAR(100),
  tracking_url       public.url_string,
  status             public.shipment_status NOT NULL DEFAULT 'label_created',
  shipped_at         TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  weight             NUMERIC(10, 3),
  dimensions         public.dimension,
  shipping_cost      NUMERIC(19, 4) NOT NULL DEFAULT 0,
  insurance_amount   NUMERIC(19, 4) DEFAULT 0,
  signature_required BOOLEAN NOT NULL DEFAULT FALSE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id)
    REFERENCES orders.orders (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_shipments_shipping_method FOREIGN KEY (shipping_method_id)
    REFERENCES orders.shipping_methods (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT chk_shipments_shipping_cost CHECK (shipping_cost >= 0),
  CONSTRAINT chk_shipments_insurance CHECK (insurance_amount >= 0),
  CONSTRAINT chk_shipments_weight CHECK (weight IS NULL OR weight > 0)
) TABLESPACE ecommerce_data;

CREATE TABLE orders.tracking_events (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id   BIGINT NOT NULL,
  status        public.shipment_status NOT NULL,
  location      VARCHAR(255),
  description   TEXT,
  event_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_tracking_shipment FOREIGN KEY (shipment_id)
    REFERENCES orders.shipments (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) TABLESPACE ecommerce_data;

-- EXCLUSION constraint example
ALTER TABLE orders.tracking_events
  ADD CONSTRAINT excl_tracking_no_duplicate_events
  EXCLUDE USING gist (
    shipment_id WITH =,
    daterange(event_time::date, (event_time + INTERVAL '1 second')::date) WITH &&
  );

-- ============================================================================
-- SECTION 14: CART AND WISHLIST
-- ============================================================================
CREATE TABLE orders.carts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT UNIQUE,
  session_id  VARCHAR(128),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  CONSTRAINT fk_carts_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_carts_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL),
  CONSTRAINT chk_carts_expires CHECK (expires_at > created_at)
) TABLESPACE ecommerce_data;

CREATE TABLE orders.cart_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cart_id     BIGINT NOT NULL,
  product_id  BIGINT NOT NULL,
  variant_id  BIGINT,
  quantity    public.positive_integer NOT NULL DEFAULT 1,
  unit_price  NUMERIC(19, 4) NOT NULL,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_ci_cart FOREIGN KEY (cart_id)
    REFERENCES orders.carts (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ci_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_ci_variant FOREIGN KEY (variant_id)
    REFERENCES inventory.variants (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT chk_ci_quantity_max CHECK (quantity <= 999),
  CONSTRAINT chk_ci_unit_price CHECK (unit_price >= 0),
  CONSTRAINT uq_ci_cart_product_variant UNIQUE (cart_id, product_id, variant_id)
) TABLESPACE ecommerce_data;

CREATE TABLE public.wishlists (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  name        VARCHAR(100) NOT NULL DEFAULT 'Default',
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT uq_wishlists_user_name UNIQUE (user_id, name)
) TABLESPACE ecommerce_data;

CREATE TABLE public.wishlist_items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wishlist_id BIGINT NOT NULL,
  product_id  BIGINT NOT NULL,
  variant_id  BIGINT,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority    INTEGER NOT NULL DEFAULT 0,
  notes       TEXT,

  CONSTRAINT fk_wi_wishlist FOREIGN KEY (wishlist_id)
    REFERENCES public.wishlists (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_wi_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_wi_variant FOREIGN KEY (variant_id)
    REFERENCES inventory.variants (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT uq_wi_wishlist_product UNIQUE (wishlist_id, product_id, variant_id)
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 15: REVIEWS
-- ============================================================================
CREATE TABLE content.reviews (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id   BIGINT NOT NULL,
  user_id      BIGINT NOT NULL,
  order_id     BIGINT,
  rating       INTEGER NOT NULL,
  title        VARCHAR(255),
  body         TEXT,
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  status       public.review_status NOT NULL DEFAULT 'pending',
  helpful_yes  INTEGER NOT NULL DEFAULT 0,
  helpful_no   INTEGER NOT NULL DEFAULT 0,
  response     TEXT,
  responded_at TIMESTAMPTZ,
  responded_by BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  helpful_ratio NUMERIC(5, 4) GENERATED ALWAYS AS (
    CASE
      WHEN (helpful_yes + helpful_no) = 0 THEN 0.0000
      ELSE ROUND(helpful_yes::NUMERIC / (helpful_yes + helpful_no), 4)
    END
  ) STORED,

  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id)
    REFERENCES inventory.products (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_order FOREIGN KEY (order_id)
    REFERENCES orders.orders (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_reviews_responded_by FOREIGN KEY (responded_by)
    REFERENCES auth.users (id)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_helpful CHECK (helpful_yes >= 0 AND helpful_no >= 0),
  CONSTRAINT chk_reviews_body_length CHECK (body IS NULL OR LENGTH(body) >= 10),
  CONSTRAINT uq_reviews_product_user UNIQUE (product_id, user_id)
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 16: PROMOTIONS
-- ============================================================================
CREATE TABLE orders.promotions (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(280) NOT NULL UNIQUE,
  description     TEXT,
  promo_type      public.promotion_type NOT NULL DEFAULT 'seasonal',
  banner_url      public.url_string,
  is_active       BOOLEAN NOT NULL DEFAULT FALSE,
  priority        INTEGER NOT NULL DEFAULT 0,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ,
  max_applications INTEGER,
  application_count INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  active_period   public.daterange_promo GENERATED ALWAYS AS (
    daterange(starts_at::date, (COALESCE(ends_at, starts_at + INTERVAL '100 years'))::date)
  ) STORED,

  CONSTRAINT chk_promotions_dates CHECK (ends_at IS NULL OR ends_at > starts_at),
  CONSTRAINT chk_promotions_max_apps CHECK (max_applications IS NULL OR max_applications > 0),
  CONSTRAINT chk_promotions_app_count CHECK (application_count >= 0)
) TABLESPACE ecommerce_data;

CREATE TABLE orders.promotion_rules (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  promotion_id     BIGINT NOT NULL,
  rule_type        VARCHAR(50) NOT NULL,
  condition_json   JSONB NOT NULL DEFAULT '{}',
  action_type      VARCHAR(50) NOT NULL,
  action_value     NUMERIC(19, 4) NOT NULL DEFAULT 0,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_pr_promotion FOREIGN KEY (promotion_id)
    REFERENCES orders.promotions (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_pr_rule_type CHECK (rule_type IN (
    'min_purchase', 'category_match', 'product_match',
    'brand_match', 'customer_segment', 'cart_quantity',
    'first_purchase', 'loyalty_tier', 'time_of_day',
    'day_of_week', 'geo_region'
  )),
  CONSTRAINT chk_pr_action_type CHECK (action_type IN (
    'percentage_off', 'fixed_off', 'free_shipping',
    'free_gift', 'bonus_points', 'tiered_discount'
  ))
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 17: NOTIFICATIONS
-- ============================================================================
CREATE TABLE content.notifications (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  type        public.notification_type NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  link        public.url_string,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  sent_via    VARCHAR(20)[] DEFAULT ARRAY['in_app'],
  scheduled_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 18: AUDIT LOG
-- ============================================================================
CREATE TABLE analytics.audit_log (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_schema VARCHAR(100) NOT NULL,
  table_name   VARCHAR(100) NOT NULL,
  action       public.audit_action NOT NULL,
  record_id    BIGINT,
  old_data     JSONB,
  new_data     JSONB,
  changed_columns TEXT[],
  performed_by BIGINT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip    public.ip_address,
  client_info  TEXT,
  transaction_id BIGINT,

  CONSTRAINT chk_audit_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE'))
) TABLESPACE ecommerce_data;

ALTER TABLE analytics.audit_log ALTER COLUMN old_data SET STORAGE EXTERNAL;
ALTER TABLE analytics.audit_log ALTER COLUMN new_data SET STORAGE EXTERNAL;
ALTER TABLE analytics.audit_log SET (fillfactor = 95, autovacuum_vacuum_scale_factor = 0.02);

-- ============================================================================
-- SECTION 19: PARTITIONED TABLE — ORDER EVENTS (RANGE partition)
-- ============================================================================
CREATE TABLE analytics.order_events (
  id           BIGINT NOT NULL,
  order_id     BIGINT NOT NULL,
  event_type   VARCHAR(50) NOT NULL,
  event_data   JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_order_events PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at) TABLESPACE ecommerce_data;

CREATE TABLE analytics.order_events_2023_q1 PARTITION OF analytics.order_events
  FOR VALUES FROM ('2023-01-01') TO ('2023-04-01');
CREATE TABLE analytics.order_events_2023_q2 PARTITION OF analytics.order_events
  FOR VALUES FROM ('2023-04-01') TO ('2023-07-01');
CREATE TABLE analytics.order_events_2023_q3 PARTITION OF analytics.order_events
  FOR VALUES FROM ('2023-07-01') TO ('2023-10-01');
CREATE TABLE analytics.order_events_2023_q4 PARTITION OF analytics.order_events
  FOR VALUES FROM ('2023-10-01') TO ('2024-01-01');
CREATE TABLE analytics.order_events_2024_q1 PARTITION OF analytics.order_events
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE analytics.order_events_2024_q2 PARTITION OF analytics.order_events
  FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE analytics.order_events_default PARTITION OF analytics.order_events
  DEFAULT;

-- ============================================================================
-- SECTION 20: PARTITIONED TABLE — PAGE VIEWS (HASH partition, PG11+)
-- ============================================================================
CREATE TABLE analytics.page_views (
  id           BIGINT GENERATED ALWAYS AS IDENTITY,
  visitor_id   UUID NOT NULL,
  user_id      BIGINT,
  page_url     VARCHAR(2048) NOT NULL,
  referrer_url VARCHAR(2048),
  page_title   VARCHAR(500),
  session_id   UUID,
  ip_address   public.ip_address,
  user_agent   TEXT,
  country_code CHAR(2),
  device_type  VARCHAR(20),
  browser      VARCHAR(50),
  os           VARCHAR(50),
  duration_ms  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_page_views PRIMARY KEY (id, visitor_id)
) PARTITION BY HASH (visitor_id) TABLESPACE ecommerce_data;

CREATE TABLE analytics.page_views_p0 PARTITION OF analytics.page_views
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE analytics.page_views_p1 PARTITION OF analytics.page_views
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE analytics.page_views_p2 PARTITION OF analytics.page_views
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE analytics.page_views_p3 PARTITION OF analytics.page_views
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- ============================================================================
-- SECTION 21: PARTITIONED TABLE — PRODUCT SEARCHES (LIST partition)
-- ============================================================================
CREATE TABLE analytics.product_searches (
  id           BIGINT GENERATED ALWAYS AS IDENTITY,
  query        VARCHAR(500) NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  clicked_product_id BIGINT,
  user_id      BIGINT,
  session_id   UUID,
  source       VARCHAR(20) NOT NULL DEFAULT 'organic',
  filters      JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_product_searches PRIMARY KEY (id, source)
) PARTITION BY LIST (source) TABLESPACE ecommerce_data;

CREATE TABLE analytics.product_searches_organic PARTITION OF analytics.product_searches
  FOR VALUES IN ('organic');
CREATE TABLE analytics.product_searches_paid PARTITION OF analytics.product_searches
  FOR VALUES IN ('paid');
CREATE TABLE analytics.product_searches_suggested PARTITION OF analytics.product_searches
  FOR VALUES IN ('suggested');
CREATE TABLE analytics.product_searches_other PARTITION OF analytics.product_searches
  DEFAULT;

-- ============================================================================
-- SECTION 22: INHERITED TABLES
-- ============================================================================
CREATE TABLE analytics.events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_name  VARCHAR(200) NOT NULL,
  user_id     BIGINT,
  session_id  UUID,
  properties  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) TABLESPACE ecommerce_data;

CREATE TABLE analytics.product_events (
  product_id  BIGINT NOT NULL,
  variant_id  BIGINT,
  action      VARCHAR(50) NOT NULL
) INHERITS (analytics.events) TABLESPACE ecommerce_data;

ALTER TABLE analytics.product_events ADD CONSTRAINT chk_pe_action
  CHECK (action IN ('view', 'click', 'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'compare', 'share'));

CREATE TABLE analytics.user_events (
  target_user_id BIGINT,
  action         VARCHAR(50) NOT NULL
) INHERITS (analytics.events) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 23: TYPED TABLE (CREATE TABLE ... OF type)
-- ============================================================================
CREATE TABLE content.media_assets (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_type   VARCHAR(20) NOT NULL DEFAULT 'image',
  url          public.url_string NOT NULL,
  alt_text     VARCHAR(500),
  width        INTEGER,
  height       INTEGER,
  file_size    INTEGER,
  mime_type    VARCHAR(100),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
) TABLESPACE ecommerce_data;

-- Table OF type
CREATE TABLE content.publishable (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status       public.content_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  author_id    BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 24: TABLE LIKE ... INCLUDING ALL
-- ============================================================================
CREATE TABLE staging.orders_archive (
  LIKE orders.orders INCLUDING ALL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) TABLESPACE ecommerce_data;

CREATE TABLE staging.products_snapshot (
  LIKE inventory.products INCLUDING ALL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE
) TABLESPACE ecommerce_data;

-- ============================================================================
-- SECTION 25: ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content.notifications ENABLE ROW LEVEL SECURITY;

-- Permissive policies
CREATE POLICY users_can_read_own_data ON auth.users
  FOR SELECT
  TO ecommerce_appuser
  USING (id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY users_can_update_own_data ON auth.users
  FOR UPDATE
  TO ecommerce_appuser
  USING (id = current_setting('app.current_user_id')::BIGINT)
  WITH CHECK (id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY admin_all_access ON auth.users
  FOR ALL
  TO ecommerce_admin
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY sessions_own_only ON auth.sessions
  FOR SELECT
  TO ecommerce_appuser
  USING (user_id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY orders_read_own ON orders.orders
  FOR SELECT
  TO ecommerce_appuser
  USING (user_id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY orders_insert_own ON orders.orders
  FOR INSERT
  TO ecommerce_appuser
  WITH CHECK (user_id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY orders_update_own ON orders.orders
  FOR UPDATE
  TO ecommerce_appuser
  USING (user_id = current_setting('app.current_user_id')::BIGINT)
  WITH CHECK (user_id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY cart_access_own ON orders.carts
  FOR ALL
  TO ecommerce_appuser
  USING (user_id = current_setting('app.current_user_id')::BIGINT)
  WITH CHECK (user_id = current_setting('app.current_user_id')::BIGINT);

CREATE POLICY notifications_own ON content.notifications
  FOR SELECT
  TO ecommerce_appuser
  USING (user_id = current_setting('app.current_user_id')::BIGINT);

-- Restrictive policy
CREATE POLICY restrict_deleted_users ON auth.users
  AS RESTRICTIVE
  FOR SELECT
  TO ecommerce_appuser
  USING (is_active = TRUE);

CREATE POLICY restrict_locked_users ON auth.users
  AS RESTRICTIVE
  FOR ALL
  TO ecommerce_appuser
  USING (locked_until IS NULL OR locked_until < NOW());

-- ============================================================================
-- SECTION 26: INDEXES — COMPREHENSIVE COVERAGE
-- ============================================================================

-- btree indexes (default)
CREATE INDEX idx_products_name ON inventory.products (name);
CREATE INDEX idx_products_category ON inventory.products (category_id);
CREATE INDEX idx_products_brand ON inventory.products (brand_id);
CREATE INDEX idx_products_status ON inventory.products (status);
CREATE INDEX idx_products_created_at ON inventory.products (created_at DESC);
CREATE INDEX idx_products_published_at ON inventory.products (published_at)
  WHERE is_active = TRUE AND published_at IS NOT NULL;

-- Composite btree
CREATE INDEX idx_orders_user_status_date ON orders.orders (user_id, status, placed_at DESC);

-- Unique index
CREATE UNIQUE INDEX idx_products_sku_active ON inventory.products (sku)
  WHERE is_active = TRUE;

-- Partial indexes (WHERE clause)
CREATE INDEX idx_products_on_sale ON inventory.products (sale_price)
  WHERE sale_price IS NOT NULL AND sale_price < base_price AND is_active = TRUE;

CREATE INDEX idx_orders_pending ON orders.orders (placed_at)
  WHERE status IN ('pending', 'confirmed', 'processing');

CREATE INDEX idx_stock_low ON inventory.stock (product_id, warehouse_id)
  WHERE (quantity - reserved - damaged) <= reorder_point;

CREATE INDEX idx_users_active_email ON auth.users (email)
  WHERE is_active = TRUE AND is_email_verified = TRUE;

-- Expression indexes
CREATE INDEX idx_products_name_lower ON inventory.products (LOWER(name));
CREATE INDEX idx_products_name_trgm ON inventory.products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_slug_prefix ON inventory.products (LEFT(slug, 3));

-- Index with INCLUDE columns
CREATE INDEX idx_order_items_order_include ON orders.order_items (order_id)
  INCLUDE (product_id, quantity, unit_price, total_price);

CREATE INDEX idx_products_cat_include ON inventory.products (category_id)
  INCLUDE (name, effective_price, has_discount, status);

-- CONCURRENTLY index (cannot run in transaction)
-- CREATE INDEX CONCURRENTLY idx_orders_placed_concurrent ON orders.orders (placed_at DESC);

-- hash indexes
CREATE INDEX idx_sessions_token_hash ON auth.sessions USING hash (token_hash);
CREATE INDEX idx_api_keys_key_hash ON auth.api_keys USING hash (key_hash);

-- GIST indexes
CREATE INDEX idx_categories_breadcrumbs ON inventory.categories USING gist (breadcrumbs);
CREATE INDEX idx_products_search_vector ON inventory.products USING gist (search_vector);
CREATE INDEX idx_tracking_events_time_range ON orders.tracking_events USING gist (
  tsrange(event_time, event_time + INTERVAL '1 minute')
);

-- GIN indexes
CREATE INDEX idx_products_metadata ON inventory.products USING gin (metadata);
CREATE INDEX idx_orders_metadata ON orders.orders USING gin (metadata);
CREATE INDEX idx_notifications_data ON content.notifications USING gin (data);
CREATE INDEX idx_audit_log_old_data ON analytics.audit_log USING gin (old_data);
CREATE INDEX idx_audit_log_new_data ON analytics.audit_log USING gin (new_data);

-- SPGIST indexes
CREATE INDEX idx_addresses_coordinates ON public.addresses USING spgist (
  point((coordinates).longitude, (coordinates).latitude)
);

-- BRIN indexes
CREATE INDEX idx_audit_log_performed_at_brin ON analytics.audit_log USING brin (performed_at)
  WITH (pages_per_range = 32);
CREATE INDEX idx_order_events_created_brin ON analytics.order_events USING brin (created_at)
  WITH (pages_per_range = 64);
CREATE INDEX idx_stock_movements_performed_brin ON inventory.stock_movements USING brin (performed_at);

-- Composite index with multiple types
CREATE INDEX idx_stock_product_warehouse ON inventory.stock (product_id, warehouse_id);

-- Indexes on partitioned tables
CREATE INDEX idx_order_events_type ON analytics.order_events (event_type);
CREATE INDEX idx_page_views_user ON analytics.page_views (user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX idx_product_searches_query ON analytics.product_searches (query);

-- Unique partial index
CREATE UNIQUE INDEX idx_products_active_slug ON inventory.products (slug)
  WHERE is_active = TRUE;

-- Index with collation
CREATE INDEX idx_brands_name_collate ON inventory.brands (name COLLATE "en_US");

-- Index on expression with nested function calls
CREATE INDEX idx_products_effective_price_bucket ON inventory.products (
  WIDTH_BUCKET(effective_price, 0, 500, 10)
);

-- Covering index with INCLUDE
CREATE INDEX idx_order_items_product_covering ON orders.order_items (product_id)
  INCLUDE (order_id, quantity, unit_price);

-- ============================================================================
-- SECTION 27: FUNCTIONS
-- ============================================================================

-- SQL function with various attributes
CREATE FUNCTION public.calculate_order_total(
  p_subtotal      NUMERIC,
  p_discount      NUMERIC DEFAULT 0,
  p_tax_rate      NUMERIC DEFAULT 0,
  p_shipping      NUMERIC DEFAULT 0
) RETURNS NUMERIC
  LANGUAGE sql
  IMMUTABLE
  STRICT
  LEAKPROOF
  PARALLEL SAFE
  COST 5
AS $$
  SELECT GREATEST(0, p_subtotal - p_discount) * (1 + p_tax_rate / 100) + p_shipping;
$$;

-- plpgsql function with RETURNS TABLE
CREATE FUNCTION inventory.get_products_by_category(
  p_category_id BIGINT,
  p_active_only BOOLEAN DEFAULT TRUE,
  OUT product_id BIGINT,
  OUT product_name VARCHAR,
  OUT price NUMERIC,
  OUT stock_status public.inventory_status
) RETURNS SETOF record
  LANGUAGE plpgsql
  STABLE
  PARALLEL SAFE
  COST 100
  ROWS 200
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.effective_price,
    p.status
  FROM inventory.products p
  WHERE p.category_id = p_category_id
    AND (p_active_only = FALSE OR p.is_active = TRUE)
  ORDER BY p.name;
END;
$$;

-- Function with VARIADIC parameter
CREATE FUNCTION public.array_contains_any(
  base_array    TEXT[],
  VARIADIC search_terms TEXT[]
) RETURNS BOOLEAN
  LANGUAGE sql
  IMMUTABLE
  STRICT
  PARALLEL SAFE
  COST 10
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(search_terms) AS term
    WHERE term = ANY(base_array)
  );
$$;

-- Function with INOUT parameter
CREATE FUNCTION public.normalize_phone(
  INOUT p_phone TEXT
) LANGUAGE plpgsql
  IMMUTABLE
  STRICT
  PARALLEL SAFE
AS $$
BEGIN
  p_phone := REGEXP_REPLACE(p_phone, '[^0-9+]', '', 'g');
  IF p_phone NOT LIKE '+%' AND LENGTH(p_phone) = 10 THEN
    p_phone := '+1' || p_phone;
  END IF;
END;
$$;

-- Function with SECURITY DEFINER
CREATE FUNCTION auth.create_user_with_role(
  p_email      TEXT,
  p_username   TEXT,
  p_password   TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role_name  TEXT DEFAULT 'customer'
) RETURNS BIGINT
  LANGUAGE plpgsql
  VOLATILE
  SECURITY DEFINER
  COST 50
AS $$
DECLARE
  v_user_id BIGINT;
  v_role_id BIGINT;
  v_salt    TEXT;
  v_hash    TEXT;
BEGIN
  v_salt := gen_random_bytes(16)::TEXT;
  v_hash := crypt(p_password, v_salt);

  INSERT INTO auth.users (email, username, password_hash, password_salt, first_name, last_name, is_email_verified)
  VALUES (p_email, p_username, v_hash, v_salt, p_first_name, p_last_name, FALSE)
  RETURNING id INTO v_user_id;

  SELECT id INTO v_role_id FROM auth.roles WHERE name = p_role_name LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO auth.user_roles (user_id, role_id) VALUES (v_user_id, v_role_id);
  END IF;

  RETURN v_user_id;
END;
$$;

-- Function for inventory reservation
CREATE FUNCTION inventory.reserve_stock(
  p_product_id   BIGINT,
  p_variant_id   BIGINT,
  p_warehouse_id BIGINT,
  p_quantity     INTEGER,
  p_reference_type VARCHAR DEFAULT 'order',
  p_reference_id   BIGINT DEFAULT NULL
) RETURNS BOOLEAN
  LANGUAGE plpgsql
  VOLATILE
  PARALLEL UNSAFE
  COST 25
AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT (quantity - reserved - damaged) INTO v_available
  FROM inventory.stock
  WHERE product_id = p_product_id
    AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL))
    AND warehouse_id = p_warehouse_id
  FOR UPDATE;

  IF v_available IS NULL OR v_available < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE inventory.stock
  SET reserved = reserved + p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND (variant_id = p_variant_id OR (variant_id IS NULL AND p_variant_id IS NULL))
    AND warehouse_id = p_warehouse_id;

  INSERT INTO inventory.stock_movements (product_id, variant_id, warehouse_id, movement_type, quantity, reference_type, reference_id)
  VALUES (p_product_id, p_variant_id, p_warehouse_id, 'reserved', p_quantity, p_reference_type, p_reference_id);

  RETURN TRUE;
END;
$$;

-- Set-returning function
CREATE FUNCTION analytics.get_daily_sales(
  p_start_date DATE,
  p_end_date   DATE
) RETURNS TABLE (
  sale_date    DATE,
  order_count  BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  items_sold   BIGINT
) LANGUAGE sql
  STABLE
  PARALLEL RESTRICTED
  COST 500
  ROWS 365
AS $$
  SELECT
    o.placed_at::DATE AS sale_date,
    COUNT(*) AS order_count,
    SUM(o.total_amount) AS total_revenue,
    ROUND(AVG(o.total_amount), 2) AS avg_order_value,
    COALESCE(SUM(oi.qty_sum), 0) AS items_sold
  FROM orders.orders o
  LEFT JOIN LATERAL (
    SELECT SUM(oi.quantity) AS qty_sum
    FROM orders.order_items oi
    WHERE oi.order_id = o.id
  ) oi ON TRUE
  WHERE o.placed_at::DATE BETWEEN p_start_date AND p_end_date
    AND o.status NOT IN ('cancelled', 'refunded')
  GROUP BY o.placed_at::DATE
  ORDER BY sale_date;
$$;

-- ============================================================================
-- SECTION 28: PROCEDURES (PG11+)
-- ============================================================================

CREATE PROCEDURE orders.process_order(
  p_order_id BIGINT
) LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.order_status;
  v_total  NUMERIC;
BEGIN
  SELECT status, total_amount INTO v_status, v_total
  FROM orders.orders WHERE id = p_order_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Order % is not in pending status', p_order_id;
  END IF;

  -- Reserve stock for each item
  PERFORM inventory.reserve_stock(
    oi.product_id,
    oi.variant_id,
    (SELECT id FROM inventory.warehouses WHERE is_active = TRUE LIMIT 1),
    oi.quantity,
    'order',
    p_order_id
  )
  FROM orders.order_items oi
  WHERE oi.order_id = p_order_id;

  -- Update order status
  UPDATE orders.orders
  SET status = 'confirmed',
      confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Create notification
  INSERT INTO content.notifications (user_id, type, title, body, data)
  SELECT
    o.user_id,
    'order_confirmation',
    'Order Confirmed',
    'Your order #' || o.order_number || ' has been confirmed.',
    jsonb_build_object('order_id', p_order_id, 'order_number', o.order_number)
  FROM orders.orders o WHERE o.id = p_order_id;
END;
$$;

CREATE PROCEDURE inventory.recalculate_stock(
  p_product_id   BIGINT,
  p_warehouse_id BIGINT
) LANGUAGE plpgsql
AS $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT product_id, variant_id, warehouse_id,
           SUM(CASE WHEN movement_type = 'inbound' THEN quantity ELSE 0 END) AS total_inbound,
           SUM(CASE WHEN movement_type = 'outbound' THEN quantity ELSE 0 END) AS total_outbound,
           SUM(CASE WHEN movement_type = 'adjustment' THEN quantity ELSE 0 END) AS total_adjustment
    FROM inventory.stock_movements
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id
    GROUP BY product_id, variant_id, warehouse_id
  LOOP
    UPDATE inventory.stock
    SET quantity = GREATEST(0,
        COALESCE(v_record.total_inbound, 0)
        - COALESCE(v_record.total_outbound, 0)
        + COALESCE(v_record.total_adjustment, 0)
      ),
      updated_at = NOW()
    WHERE product_id = v_record.product_id
      AND (variant_id = v_record.variant_id OR (variant_id IS NULL AND v_record.variant_id IS NULL))
      AND warehouse_id = v_record.warehouse_id;
  END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 29: TRIGGERS
-- ============================================================================

-- Trigger function: update updated_at timestamp
CREATE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply the trigger to multiple tables
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON inventory.products
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trg_stock_updated_at
  BEFORE UPDATE ON inventory.stock
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON inventory.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON inventory.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trg_shipping_methods_updated_at
  BEFORE UPDATE ON orders.shipping_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Trigger function: update product search vector
CREATE FUNCTION inventory.trigger_update_product_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  NEW.search_vector :=
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.name, '')), 'A') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.short_description, '')), 'B') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(NEW.description, '')), 'C') ||
    SETWEIGHT(TO_TSVECTOR('english', COALESCE(
      (SELECT string_agg(t.name, ' ')
       FROM inventory.tags t
       JOIN inventory.product_tags pt ON pt.tag_id = t.id
       WHERE pt.product_id = NEW.id),
      ''
    )), 'D');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF name, description, short_description ON inventory.products
  FOR EACH ROW
  EXECUTE FUNCTION inventory.trigger_update_product_search_vector();

-- Trigger function: audit logging
CREATE FUNCTION analytics.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id BIGINT;
  v_action  public.audit_action;
BEGIN
  v_user_id := current_setting('app.current_user_id', TRUE)::BIGINT;

  IF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    INSERT INTO analytics.audit_log (table_schema, table_name, action, record_id, new_data, performed_by)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, v_action, NEW.id, to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    INSERT INTO analytics.audit_log (table_schema, table_name, action, record_id, old_data, new_data, changed_columns, performed_by)
    VALUES (
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_action, NEW.id,
      to_jsonb(OLD), to_jsonb(NEW),
      (SELECT array_agg(key) FROM jsonb_each(to_jsonb(NEW)) WHERE value::TEXT IS DISTINCT FROM (to_jsonb(OLD)->key)::TEXT),
      v_user_id
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    INSERT INTO analytics.audit_log (table_schema, table_name, action, record_id, old_data, performed_by)
    VALUES (TG_TABLE_SCHEMA, TG_TABLE_NAME, v_action, OLD.id, to_jsonb(OLD), v_user_id);
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_orders_audit
  AFTER INSERT OR UPDATE OR DELETE ON orders.orders
  FOR EACH ROW
  EXECUTE FUNCTION analytics.trigger_audit_log();

CREATE TRIGGER trg_products_audit
  AFTER INSERT OR UPDATE OR DELETE ON inventory.products
  FOR EACH ROW
  EXECUTE FUNCTION analytics.trigger_audit_log();

-- Trigger: update category product count
CREATE FUNCTION inventory.trigger_update_category_product_count()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE inventory.categories
    SET product_count = product_count + 1
    WHERE id = NEW.category_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE inventory.categories
    SET product_count = GREATEST(0, product_count - 1)
    WHERE id = OLD.category_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id THEN
    UPDATE inventory.categories
    SET product_count = GREATEST(0, product_count - 1)
    WHERE id = OLD.category_id;
    UPDATE inventory.categories
    SET product_count = product_count + 1
    WHERE id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_category_product_count
  AFTER INSERT OR UPDATE OF category_id OR DELETE ON inventory.products
  FOR EACH ROW
  EXECUTE FUNCTION inventory.trigger_update_category_product_count();

-- Trigger with WHEN condition
CREATE FUNCTION inventory.trigger_low_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  INSERT INTO content.notifications (user_id, type, title, body, data)
  SELECT
    u.id,
    'account_alert',
    'Low Stock Alert',
    'Product ' || NEW.product_id || ' at warehouse ' || NEW.warehouse_id || ' is below reorder point.',
    jsonb_build_object('product_id', NEW.product_id, 'warehouse_id', NEW.warehouse_id, 'available', NEW.available_qty)
  FROM auth.users u
  JOIN auth.user_roles ur ON ur.user_id = u.id
  JOIN auth.roles r ON r.id = ur.role_id
  WHERE r.name = 'inventory_manager';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_low_alert
  AFTER UPDATE ON inventory.stock
  FOR EACH ROW
  WHEN (NEW.available_qty <= NEW.reorder_point AND OLD.available_qty > OLD.reorder_point)
  EXECUTE FUNCTION inventory.trigger_low_stock_alert();

-- Statement-level trigger
CREATE FUNCTION orders.trigger_order_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  -- Refresh materialized view after batch order changes
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.daily_sales_summary;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_order_stats_refresh
  AFTER INSERT ON orders.orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION orders.trigger_order_stats();

-- ============================================================================
-- SECTION 30: VIEWS
-- ============================================================================

-- Regular view
CREATE VIEW orders.v_order_summary AS
SELECT
  o.id,
  o.order_number,
  o.user_id,
  u.username,
  u.email,
  o.status,
  o.total_amount,
  o.currency,
  o.placed_at,
  o.confirmed_at,
  o.completed_at,
  (SELECT COUNT(*) FROM orders.order_items oi WHERE oi.order_id = o.id) AS item_count,
  (SELECT SUM(oi.quantity) FROM orders.order_items oi WHERE oi.order_id = o.id) AS total_quantity,
  (SELECT string_agg(oi.product_name, ', ' ORDER BY oi.id)
   FROM orders.order_items oi WHERE oi.order_id = o.id) AS product_names
FROM orders.orders o
JOIN auth.users u ON u.id = o.user_id;

-- View with CHECK OPTION
CREATE VIEW orders.v_active_orders AS
SELECT
  id,
  order_number,
  user_id,
  status,
  total_amount,
  placed_at
FROM orders.orders
WHERE status NOT IN ('cancelled', 'refunded')
WITH CHECK OPTION;

-- Recursive view for category hierarchy
CREATE RECURSIVE VIEW inventory.v_category_tree (
  id,
  parent_id,
  name,
  slug,
  level,
  breadcrumbs,
  full_path
) AS
  SELECT
    c.id,
    c.parent_id,
    c.name,
    c.slug,
    c.level,
    c.breadcrumbs,
    c.name::TEXT AS full_path
  FROM inventory.categories c
  WHERE c.parent_id IS NULL
UNION ALL
  SELECT
    c.id,
    c.parent_id,
    c.name,
    c.slug,
    c.level,
    c.breadcrumbs,
    (ct.full_path || ' > ' || c.name)::TEXT
  FROM inventory.categories c
  JOIN inventory.v_category_tree ct ON ct.id = c.parent_id;

-- View for product catalog with computed fields
CREATE VIEW inventory.v_product_catalog AS
SELECT
  p.id,
  p.sku,
  p.name,
  p.slug,
  p.short_description,
  p.base_price,
  p.sale_price,
  p.effective_price,
  p.has_discount,
  p.discount_pct,
  p.currency,
  p.is_active,
  p.is_featured,
  p.is_digital,
  p.status AS stock_status,
  b.name AS brand_name,
  b.slug AS brand_slug,
  c.name AS category_name,
  c.slug AS category_slug,
  (c.breadcrumbs)::TEXT AS category_path,
  s.available_qty AS total_available,
  p.published_at,
  p.created_at
FROM inventory.products p
LEFT JOIN inventory.brands b ON b.id = p.brand_id
JOIN inventory.categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT SUM(available_qty) AS available_qty
  FROM inventory.stock sk
  WHERE sk.product_id = p.id
) s ON TRUE
WHERE p.is_active = TRUE;

-- View for user order history
CREATE VIEW orders.v_user_order_history AS
SELECT
  o.id,
  o.order_number,
  o.user_id,
  o.status,
  o.total_amount,
  o.currency,
  o.placed_at,
  o.completed_at,
  COALESCE(SUM(oi.quantity), 0) AS total_items,
  COALESCE(SUM(CASE WHEN oi.is_refunded THEN oi.quantity ELSE 0 END), 0) AS refunded_items
FROM orders.orders o
LEFT JOIN orders.order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.order_number, o.user_id, o.status, o.total_amount, o.currency, o.placed_at, o.completed_at;

-- ============================================================================
-- SECTION 31: MATERIALIZED VIEWS
-- ============================================================================

CREATE MATERIALIZED VIEW analytics.daily_sales_summary AS
SELECT
  o.placed_at::DATE AS sale_date,
  COUNT(*) AS order_count,
  SUM(o.total_amount) AS total_revenue,
  ROUND(AVG(o.total_amount), 2) AS avg_order_value,
  SUM(o.discount_amount) AS total_discounts,
  SUM(o.tax_amount) AS total_tax,
  SUM(o.shipping_amount) AS total_shipping,
  COUNT(DISTINCT o.user_id) AS unique_customers,
  COUNT(*) FILTER (WHERE o.coupon_id IS NOT NULL) AS coupon_orders
FROM orders.orders o
WHERE o.status NOT IN ('cancelled')
GROUP BY o.placed_at::DATE
WITH DATA;

CREATE UNIQUE INDEX idx_daily_sales_date ON analytics.daily_sales_summary (sale_date);

CREATE MATERIALIZED VIEW analytics.product_performance AS
SELECT
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  c.name AS category_name,
  b.name AS brand_name,
  COUNT(DISTINCT oi.order_id) AS times_ordered,
  SUM(oi.quantity) AS total_quantity_sold,
  SUM(oi.total_price) AS total_revenue,
  ROUND(AVG(oi.unit_price), 2) AS avg_selling_price,
  COALESCE(
    (SELECT COUNT(*) FROM content.reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
    0
  ) AS review_count,
  COALESCE(
    (SELECT ROUND(AVG(r.rating), 1) FROM content.reviews r WHERE r.product_id = p.id AND r.status = 'approved'),
    0
  ) AS avg_rating
FROM inventory.products p
LEFT JOIN orders.order_items oi ON oi.product_id = p.id
LEFT JOIN inventory.categories c ON c.id = p.category_id
LEFT JOIN inventory.brands b ON b.id = p.brand_id
GROUP BY p.id, p.sku, p.name, c.name, b.name
WITH DATA;

CREATE UNIQUE INDEX idx_product_perf_id ON analytics.product_performance (product_id);

CREATE MATERIALIZED VIEW analytics.customer_stats AS
SELECT
  u.id AS user_id,
  u.username,
  u.email,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0) AS lifetime_value,
  COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
  MIN(o.placed_at) AS first_order_at,
  MAX(o.placed_at) AS last_order_at,
  COUNT(o.id) FILTER (WHERE o.placed_at > NOW() - INTERVAL '30 days') AS orders_last_30d,
  COUNT(o.id) FILTER (WHERE o.placed_at > NOW() - INTERVAL '90 days') AS orders_last_90d
FROM auth.users u
LEFT JOIN orders.orders o ON o.user_id = u.id AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY u.id, u.username, u.email
WITH DATA;

CREATE UNIQUE INDEX idx_customer_stats_id ON analytics.customer_stats (user_id);

-- ============================================================================
-- SECTION 32: RULES
-- ============================================================================

-- Rule: ON SELECT (deprecated but valid)
CREATE RULE notify_product_view AS
  ON SELECT TO inventory.products
  DO ALSO
    INSERT INTO analytics.events (event_name, user_id, properties)
    VALUES (
      'product_viewed',
      current_setting('app.current_user_id', TRUE)::BIGINT,
      jsonb_build_object('product_id', OLD.id)
    );

-- Rule: ON INSERT with DO INSTEAD (upsert pattern)
CREATE RULE upsert_cart_item AS
  ON INSERT TO orders.cart_items
  WHERE EXISTS (
    SELECT 1 FROM orders.cart_items ci
    WHERE ci.cart_id = NEW.cart_id
      AND ci.product_id = NEW.product_id
      AND (ci.variant_id = NEW.variant_id OR (ci.variant_id IS NULL AND NEW.variant_id IS NULL))
  )
  DO INSTEAD
    UPDATE orders.cart_items
    SET quantity = quantity + NEW.quantity,
        updated_at = NOW()
    WHERE cart_id = NEW.cart_id
      AND product_id = NEW.product_id
      AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL));

-- Rule: ON UPDATE — prevent direct updates, route to audit
CREATE RULE log_order_status_change AS
  ON UPDATE TO orders.orders
  WHERE OLD.status != NEW.status
  DO ALSO
    INSERT INTO analytics.events (event_name, user_id, properties)
    VALUES (
      'order_status_changed',
      NEW.user_id,
      jsonb_build_object(
        'order_id', NEW.id,
        'old_status', OLD.status::TEXT,
        'new_status', NEW.status::TEXT
      )
    );

-- Rule: ON DELETE — soft delete instead
CREATE RULE soft_delete_product AS
  ON DELETE TO inventory.products
  DO INSTEAD
    UPDATE inventory.products
    SET is_active = FALSE,
        discontinued_at = NOW(),
        updated_at = NOW()
    WHERE id = OLD.id;

-- ============================================================================
-- SECTION 33: CREATE STATISTICS
-- ============================================================================
CREATE STATISTICS analytics.stats_product_category_brand
  ON category_id, brand_id FROM inventory.products;

CREATE STATISTICS analytics.stats_order_user_status
  ON user_id, status FROM orders.orders;

CREATE STATISTICS analytics.stats_product_attrs (ndistinct, dependencies)
  ON category_id, brand_id, status FROM inventory.products;

CREATE STATISTICS analytics.stats_order_status_totals (mcv)
  ON status, total_amount FROM orders.orders;

-- ============================================================================
-- SECTION 34: CREATE COLLATION
-- ============================================================================
CREATE COLLATION public.case_insensitive (
  PROVIDER = icu,
  LOCALE = 'en-US-u-ks-level2',
  DETERMINISTIC = FALSE
);

CREATE COLLATION public.numeric_sort (
  PROVIDER = icu,
  LOCALE = 'en-US-u-kn-true'
);

-- ============================================================================
-- SECTION 35: CREATE CAST
-- ============================================================================
CREATE CAST (public.money_amount AS NUMERIC)
  WITH FUNCTION public.calculate_order_total(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
  AS IMPLICIT;

CREATE CAST (INTEGER AS public.currency_code)
  WITHOUT FUNCTION
  AS ASSIGNMENT;

-- ============================================================================
-- SECTION 36: CREATE OPERATOR
-- ============================================================================
CREATE OPERATOR public.<=> (
  LEFTARG   = NUMERIC,
  RIGHTARG  = NUMERIC,
  FUNCTION  = int4mi,
  COMMUTATOR = <=>,
  NEGATOR   = >=>
);

CREATE OPERATOR public.~~ (
  LEFTARG   = TEXT,
  RIGHTARG  = TEXT,
  FUNCTION  = textlike,
  COMMUTATOR = ~~,
  RESTRICT  = regexeqsel,
  JOIN      = regexeqjoinsel
);

-- ============================================================================
-- SECTION 37: CREATE OPERATOR CLASS / FAMILY
-- ============================================================================
CREATE OPERATOR FAMILY public.money_ops USING btree;

CREATE OPERATOR CLASS public.money_ops_class
  DEFAULT FOR TYPE NUMERIC USING btree
  FAMILY public.money_ops AS
    OPERATOR 1 <,
    OPERATOR 2 <=,
    OPERATOR 3 =,
    OPERATOR 4 >=,
    OPERATOR 5 >,
    FUNCTION 1 NUMERIC_CMP(NUMERIC, NUMERIC);

-- ============================================================================
-- SECTION 38: CREATE AGGREGATE
-- ============================================================================
CREATE AGGREGATE public.array_concat_agg(ANYARRAY) (
  SFUNC     = array_cat,
  STYPE     = ANYARRAY,
  INITCOND  = '{}'
);

CREATE AGGREGATE public.product_mode(NUMERIC) (
  SFUNC     = public.calculate_order_total,  -- placeholder for demo
  STYPE     = NUMERIC,
  INITCOND  = '0'
);

-- ============================================================================
-- SECTION 39: CREATE CONVERSION
-- ============================================================================
CREATE CONVERSION public.latin1_to_utf8
  FOR 'LATIN1' TO 'UTF8'
  FROM iso8859_1_to_utf8;

-- ============================================================================
-- SECTION 40: CREATE LANGUAGE
-- ============================================================================
-- plpgsql is typically pre-installed; shown for parser coverage
-- CREATE TRUSTED LANGUAGE plpython3u HANDLER plpython3_call_handler;

-- ============================================================================
-- SECTION 41: TEXT SEARCH OBJECTS
-- ============================================================================
CREATE TEXT SEARCH DICTIONARY public.english_stem_custom (
  TEMPLATE = snowball,
  LANGUAGE = english,
  STOPWORDS = english
);

CREATE TEXT SEARCH CONFIGURATION public.ecommerce_english (
  COPY = english
);

ALTER TEXT SEARCH CONFIGURATION public.ecommerce_english
  ALTER MAPPING FOR word, asciiword
  WITH public.english_stem_custom;

CREATE TEXT SEARCH PARSER public.ecommerce_parser (
  START     = prsd_start,
  GETTOKEN  = prsd_nexttoken,
  END       = prsd_end,
  HEADLINE  = prsd_headline,
  LEXTYPES  = prsd_lextype
);

CREATE TEXT SEARCH TEMPLATE public.ecommerce_stem (
  INIT   = dsnowball_init,
  LEXIZE = dsnowball_lexize
);

-- ============================================================================
-- SECTION 42: CREATE TRANSFORM
-- ============================================================================
-- Transform for hstore -> jsonb
CREATE TRANSFORM FOR hstore LANGUAGE plpgsql (
  FROM SQL WITH FUNCTION hstore_to_jsonb(hstore),
  TO SQL WITH FUNCTION jsonb_to_hstore(jsonb)
);

-- ============================================================================
-- SECTION 43: CREATE ACCESS METHOD
-- ============================================================================
-- Note: This requires a custom handler function; included for parser coverage
-- CREATE ACCESS METHOD heap2 TYPE TABLE HANDLER heap_tableam_handler;

-- ============================================================================
-- SECTION 44: FOREIGN DATA WRAPPER, SERVER, USER MAPPING, FOREIGN TABLE
-- ============================================================================
CREATE FOREIGN DATA WRAPPER postgres_fdw
  HANDLER postgres_fdw_handler
  VALIDATOR postgres_fdw_validator;

CREATE SERVER analytics_remote
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'analytics-db.internal', port '5432', dbname 'analytics');

CREATE USER MAPPING FOR ecommerce_admin
  SERVER analytics_remote
  OPTIONS (user 'remote_analyst', password 'remote_pass');

CREATE FOREIGN TABLE analytics.external_metrics (
  id            BIGINT NOT NULL,
  metric_name   VARCHAR(200) NOT NULL,
  metric_value  NUMERIC NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL,
  dimensions    JSONB DEFAULT '{}'
) SERVER analytics_remote
  OPTIONS (schema_name 'public', table_name 'metrics');

-- ============================================================================
-- SECTION 45: PUBLICATION AND SUBSCRIPTION (PG10+)
-- ============================================================================
CREATE PUBLICATION ecommerce_publication
  FOR TABLE
    inventory.products,
    inventory.stock,
    orders.orders,
    orders.order_items,
    auth.users
  WITH (PUBLISH = 'insert, update, delete', PUBLISH_VIA_PARTITION_ROOT = TRUE);

CREATE SUBSCRIPTION ecommerce_subscription
  CONNECTION 'host=replica-db.internal port=5432 dbname=ecommerce_replica user=replicator password=repl_pass'
  PUBLICATION ecommerce_publication
  WITH (
    COPY_DATA = TRUE,
    CREATE_SLOT = TRUE,
    SLOT_NAME = 'ecommerce_sub_slot',
    SYNCHRONOUS_COMMIT = off
  );

-- ============================================================================
-- SECTION 46: EVENT TRIGGER (PG9.3+)
-- ============================================================================
CREATE FUNCTION public.event_trigger_log_ddl()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO analytics.audit_log (table_schema, table_name, action, new_data, performed_by)
  VALUES (
    'system',
    'ddl_event',
    'PERMISSION_CHANGE',
    jsonb_build_object(
      'event', tg_event,
      'tag', tg_tag,
      'object_type', tg_object_type
    ),
    current_setting('app.current_user_id', TRUE)::BIGINT
  );
  RAISE NOTICE 'DDL Event: % %', tg_event, tg_tag;
END;
$$;

CREATE EVENT TRIGGER trg_ddl_log
  ON DDL_COMMAND_END
  WHEN TAG IN ('CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'CREATE INDEX', 'DROP INDEX')
  EXECUTE FUNCTION public.event_trigger_log_ddl();

-- ============================================================================
-- SECTION 47: ALTER STATEMENTS
-- ============================================================================

-- ALTER TABLE examples
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

ALTER TABLE auth.users ALTER COLUMN display_name SET DEFAULT CONCAT(first_name, ' ', last_name);
ALTER TABLE auth.users ALTER COLUMN is_email_verified SET NOT NULL;
ALTER TABLE auth.users ALTER COLUMN timezone TYPE VARCHAR(50) USING timezone::VARCHAR(50);
ALTER TABLE auth.users ALTER COLUMN metadata SET DEFAULT '{}';

ALTER TABLE inventory.products ADD COLUMN IF NOT EXISTS energy_rating CHAR(1);
ALTER TABLE inventory.products ALTER COLUMN energy_rating DROP DEFAULT;
ALTER TABLE inventory.products ALTER COLUMN energy_rating DROP NOT NULL;

ALTER TABLE orders.orders ADD CONSTRAINT chk_orders_no_future_date
  CHECK (placed_at <= NOW() + INTERVAL '1 minute');

ALTER TABLE orders.order_items VALIDATE CONSTRAINT fk_oi_product;

-- Attach/Detach partition
ALTER TABLE analytics.order_events DETACH PARTITION analytics.order_events_2023_q1;
ALTER TABLE analytics.order_events ATTACH PARTITION analytics.order_events_2023_q1
  FOR VALUES FROM ('2023-01-01') TO ('2023-04-01');

-- ALTER TABLE SET TABLESPACE
ALTER TABLE analytics.audit_log SET TABLESPACE ecommerce_data;

-- ALTER TABLE SET SCHEMA
-- ALTER TABLE staging.orders_archive SET SCHEMA orders;

-- ALTER TABLE OWNER
ALTER TABLE auth.users OWNER TO ecommerce_admin;
ALTER TABLE inventory.products OWNER TO ecommerce_admin;
ALTER TABLE orders.orders OWNER TO ecommerce_admin;

-- ALTER INDEX
ALTER INDEX idx_products_name RENAME TO idx_products_name_btree;
ALTER INDEX idx_products_category SET (fillfactor = 90);
ALTER INDEX idx_order_events_type ATTACH PARTITION idx_order_events_type_2023q1;

-- ALTER SEQUENCE
ALTER SEQUENCE public.order_number_seq RESTART WITH 200000;
ALTER SEQUENCE public.order_number_seq INCREMENT BY 1;
ALTER SEQUENCE public.order_number_seq SET SCHEMA public;

-- ALTER FUNCTION
ALTER FUNCTION public.calculate_order_total(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
  COST 10;

ALTER FUNCTION inventory.get_products_by_category(BIGINT, BOOLEAN)
  SET search_path = inventory, public;

-- ALTER TYPE
ALTER TYPE public.order_status ADD VALUE 'disputed' AFTER 'chargeback';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'pending_review';

-- ALTER VIEW
ALTER VIEW orders.v_order_summary SET (security_barrier = TRUE);
ALTER VIEW orders.v_active_orders SET (security_barrier = TRUE, check_option = CASCADED);

-- ALTER MATERIALIZED VIEW
ALTER MATERIALIZED VIEW analytics.daily_sales_summary SET (fillfactor = 80);
ALTER MATERIALIZED VIEW analytics.product_performance SET SCHEMA reporting;

-- ============================================================================
-- SECTION 48: COMMENTS
-- ============================================================================
COMMENT ON TABLE auth.users IS 'Core user accounts for the e-commerce platform';
COMMENT ON TABLE auth.roles IS 'System roles for role-based access control (RBAC)';
COMMENT ON TABLE auth.permissions IS 'Granular permissions mapped to resources and actions';
COMMENT ON TABLE auth.sessions IS 'Active user sessions with token hashes and device info';
COMMENT ON TABLE auth.api_keys IS 'API keys for programmatic access to the platform';

COMMENT ON COLUMN auth.users.id IS 'Unique user identifier, auto-generated';
COMMENT ON COLUMN auth.users.email IS 'User email address, must be unique, used for login';
COMMENT ON COLUMN auth.users.password_hash IS 'bcrypt/scram hash of user password';
COMMENT ON COLUMN auth.users.is_email_verified IS 'Whether user has confirmed their email address';
COMMENT ON COLUMN auth.users.failed_login_attempts IS 'Count of consecutive failed login attempts';
COMMENT ON COLUMN auth.users.locked_until IS 'Account lock expiry timestamp (NULL = not locked)';

COMMENT ON TABLE inventory.products IS 'Product catalog with pricing, dimensions, and computed fields';
COMMENT ON COLUMN inventory.products.effective_price IS 'Lowest of base_price and sale_price, computed via GENERATED ALWAYS AS STORED';
COMMENT ON COLUMN inventory.products.discount_pct IS 'Discount percentage, 0 when no sale price or sale >= base';
COMMENT ON COLUMN inventory.products.search_vector IS 'Full-text search vector, updated by trigger';

COMMENT ON TABLE inventory.stock IS 'Per-warehouse stock levels with reserved/damaged tracking';
COMMENT ON COLUMN inventory.stock.available_qty IS 'Computed: quantity - reserved - damaged (GENERATED ALWAYS AS STORED)';

COMMENT ON TABLE orders.orders IS 'Customer orders with totals, status, and address references';
COMMENT ON TABLE orders.order_items IS 'Individual line items within an order';
COMMENT ON TABLE orders.payments IS 'Payment transactions linked to orders';
COMMENT ON TABLE orders.refunds IS 'Refund requests and processing records';

COMMENT ON TABLE analytics.audit_log IS 'Audit trail for DML changes across core tables';

COMMENT ON FUNCTION public.calculate_order_total IS 'Calculates order total from subtotal, discount, tax rate, and shipping. IMMUTABLE, LEAKPROOF, PARALLEL SAFE.';
COMMENT ON FUNCTION inventory.get_products_by_category IS 'Returns product details for a given category. STABLE, RETURNS SETOF record.';
COMMENT ON FUNCTION auth.create_user_with_role IS 'Creates a new user with password hashing and role assignment. SECURITY DEFINER.';

COMMENT ON PROCEDURE orders.process_order IS 'Processes a pending order: reserves stock, updates status, sends notification';
COMMENT ON PROCEDURE inventory.recalculate_stock IS 'Recalculates stock quantities from movement history';

COMMENT ON SEQUENCE public.order_number_seq IS 'Sequence for generating unique order numbers starting at 100000';
COMMENT ON INDEX idx_products_on_sale IS 'Partial index on sale_price for products currently on sale';
COMMENT ON INDEX idx_stock_low IS 'Partial index for low-stock detection in inventory management';

-- ============================================================================
-- SECTION 49: GRANT / REVOKE (parser coverage)
-- ============================================================================
GRANT USAGE ON SCHEMA inventory TO ecommerce_readonly, ecommerce_appuser;
GRANT USAGE ON SCHEMA orders TO ecommerce_readonly, ecommerce_appuser;
GRANT USAGE ON SCHEMA analytics TO ecommerce_readonly, ecommerce_analyst;
GRANT USAGE ON SCHEMA auth TO ecommerce_appuser;
GRANT USAGE ON SCHEMA content TO ecommerce_readonly, ecommerce_appuser;

GRANT SELECT ON ALL TABLES IN SCHEMA inventory TO ecommerce_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA orders TO ecommerce_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO ecommerce_readonly, ecommerce_analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA content TO ecommerce_readonly;

GRANT SELECT, INSERT, UPDATE ON inventory.products TO ecommerce_appuser;
GRANT SELECT, INSERT, UPDATE ON inventory.stock TO ecommerce_appuser;
GRANT SELECT, INSERT, UPDATE ON orders.orders TO ecommerce_appuser;
GRANT SELECT, INSERT, UPDATE ON orders.order_items TO ecommerce_appuser;
GRANT SELECT, INSERT, UPDATE ON orders.carts TO ecommerce_appuser;
GRANT SELECT, INSERT, UPDATE ON orders.cart_items TO ecommerce_appuser;
GRANT SELECT, INSERT, UPDATE ON content.notifications TO ecommerce_appuser;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO ecommerce_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA inventory TO ecommerce_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA orders TO ecommerce_admin;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA inventory TO ecommerce_appuser;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA orders TO ecommerce_appuser;

GRANT EXECUTE ON FUNCTION public.calculate_order_total(NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO ecommerce_appuser, ecommerce_readonly;
GRANT EXECUTE ON FUNCTION inventory.get_products_by_category(BIGINT, BOOLEAN) TO ecommerce_appuser, ecommerce_readonly;
GRANT EXECUTE ON FUNCTION inventory.reserve_stock(BIGINT, BIGINT, BIGINT, INTEGER, VARCHAR, BIGINT) TO ecommerce_appuser;
GRANT EXECUTE ON FUNCTION auth.create_user_with_role(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO ecommerce_admin;

GRANT EXECUTE ON PROCEDURE orders.process_order(BIGINT) TO ecommerce_appuser;
GRANT EXECUTE ON PROCEDURE inventory.recalculate_stock(BIGINT, BIGINT) TO ecommerce_admin;

-- ============================================================================
-- SECTION 50: DROP STATEMENTS (parser coverage — commented out to preserve schema)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_products_name_old CASCADE;
-- DROP SEQUENCE IF EXISTS public.deprecated_seq;
-- DROP FUNCTION IF EXISTS public.deprecated_function(INTEGER) CASCADE;
-- DROP PROCEDURE IF EXISTS orders.deprecated_procedure();
-- DROP TRIGGER IF EXISTS trg_deprecated ON orders.orders;
-- DROP RULE IF EXISTS deprecated_rule ON inventory.products;
-- DROP VIEW IF EXISTS orders.v_deprecated_view CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS analytics.deprecated_mv;
-- DROP TABLE IF EXISTS staging.deprecated_table CASCADE;
-- DROP TYPE IF EXISTS public.deprecated_enum CASCADE;
-- DROP DOMAIN IF EXISTS public.deprecated_domain CASCADE;
-- DROP SCHEMA IF EXISTS deprecated_schema CASCADE;
-- DROP TABLESPACE IF EXISTS deprecated_tablespace;
-- DROP PUBLICATION IF EXISTS deprecated_publication;
-- DROP SUBSCRIPTION IF EXISTS deprecated_subscription;
-- DROP SERVER IF EXISTS deprecated_server CASCADE;
-- DROP FOREIGN DATA WRAPPER IF EXISTS deprecated_fdw CASCADE;
-- DROP EVENT TRIGGER IF EXISTS deprecated_event_trigger;
-- DROP POLICY IF EXISTS deprecated_policy ON auth.users;
-- DROP CAST IF EXISTS (TEXT AS INTEGER);
-- DROP OPERATOR IF EXISTS public.<=> (NUMERIC, NUMERIC);
-- DROP AGGREGATE IF EXISTS public.deprecated_agg(NUMERIC);
-- DROP STATISTICS IF EXISTS analytics.deprecated_stats;
-- DROP COLLATION IF EXISTS public.deprecated_collation;
-- DROP CONVERSION IF EXISTS public.deprecated_conversion;
-- DROP TEXT SEARCH CONFIGURATION IF EXISTS public.deprecated_tsconfig;
-- DROP TEXT SEARCH DICTIONARY IF EXISTS public.deprecated_tsdict;
-- DROP TEXT SEARCH PARSER IF EXISTS public.deprecated_tsparser;
-- DROP TEXT SEARCH TEMPLATE IF EXISTS public.deprecated_tstemplate;
-- DROP ACCESS METHOD IF EXISTS deprecated_am;
-- DROP TRANSFORM IF EXISTS FOR hstore LANGUAGE plpgsql;
-- DROP OPERATOR CLASS IF EXISTS public.deprecated_opclass USING btree;
-- DROP OPERATOR FAMILY IF EXISTS public.deprecated_opfamily USING btree;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
