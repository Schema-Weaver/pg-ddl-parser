/**
 * Generates brutal test SQL fixtures.
 * Run: node generate-fixtures.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function pgDumpHeader(version = '15.8') {
  return `-- PostgreSQL database dump
-- Dumped from database version ${version}
-- Dumped by pg_dump version ${version}

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;
}

function write(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content, 'utf-8');
  const lines = content.split('\n').length;
  console.log(`  ${name}: ${lines} lines`);
}

console.log('Generating brutal test fixtures...\n');

// ── File 1: pg-dump-realistic.sql ──────────────────────────────────────────
{
  let sql = pgDumpHeader('15.8');
  const schemas = ['public', 'auth', 'analytics', 'audit'];
  for (const s of schemas) {
    sql += `-- Name: ${s}; Type: SCHEMA; Schema: -; Owner: postgres\nCREATE SCHEMA ${s};\n\n`;
  }

  const types = ['UUID', 'JSONB', 'TIMESTAMPTZ', 'BYTEA', 'INET', 'CIDR', 'MACADDR', 'INTERVAL', 'MONEY', 'TSVECTOR', 'XML', 'POINT', 'LINE', 'LSEG', 'BOX', 'PATH', 'POLYGON', 'CIRCLE', 'TEXT[]', 'INTEGER[]'];
  for (let i = 1; i <= 30; i++) {
    const t = types[i % types.length];
    sql += `-- Name: t_${i}; Type: TABLE; Schema: public; Owner: postgres\n`;
    sql += `CREATE TABLE public.t_${i} (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  col_${i} ${t},\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  meta JSONB DEFAULT '{}'::jsonb\n);\n\n`;
  }

  for (let i = 1; i <= 10; i++) {
    const methods = ['btree', 'gin', 'gist', 'brin', 'hash', 'spgist'];
    const m = methods[i % methods.length];
    sql += `CREATE INDEX idx_t_${i}_${m} ON public.t_${i} USING ${m} (col_${i});\n`;
  }
  sql += `CREATE INDEX idx_partial ON public.t_1 (created_at) WHERE col_1 IS NOT NULL;\n`;
  sql += `CREATE INDEX idx_expr ON public.t_2 ((meta->>'key'));\n`;
  sql += `CREATE INDEX idx_cover ON public.t_3 (id) INCLUDE (col_3, created_at);\n\n`;

  for (let i = 1; i <= 5; i++) {
    sql += `-- Name: fn_${i}; Type: FUNCTION; Schema: public; Owner: postgres\n`;
    sql += `CREATE FUNCTION public.fn_${i}(p_id UUID) RETURNS TABLE(id UUID, val TEXT)\n    LANGUAGE plpgsql SECURITY DEFINER\n    SET search_path = public\n    AS $$\nBEGIN\n  RETURN QUERY SELECT p_id, 'ok';\nEND;\n$$;\n\n`;
  }
  sql += `CREATE FUNCTION public.fn_sql() RETURNS INT LANGUAGE sql RETURN 42;\n\n`;

  for (let i = 1; i <= 3; i++) {
    sql += `CREATE TRIGGER trg_${i} AFTER INSERT OR UPDATE ON public.t_${i}\n  FOR EACH ROW WHEN (NEW.col_${i} IS NOT NULL)\n  EXECUTE FUNCTION public.fn_1(NEW.id);\n\n`;
  }

  for (let i = 1; i <= 3; i++) {
    sql += `CREATE VIEW public.v_${i} WITH (security_barrier = true) AS SELECT id, col_${i} FROM public.t_${i};\n\n`;
  }
  sql += `CREATE MATERIALIZED VIEW public.mv_1 AS SELECT id, col_1 FROM public.t_1 WITH DATA;\n`;
  sql += `CREATE MATERIALIZED VIEW public.mv_2 AS SELECT count(*) AS cnt FROM public.t_2 WITH NO DATA;\n\n`;

  for (let i = 1; i <= 5; i++) {
    sql += `CREATE TYPE public.status_${i} AS ENUM ('active', 'inactive', 'pending');\n`;
  }
  sql += `CREATE TYPE public.address AS (street TEXT, city TEXT, zip TEXT);\n`;
  sql += `CREATE TYPE public.geo_point AS (lat DOUBLE PRECISION, lng DOUBLE PRECISION);\n\n`;
  sql += `CREATE DOMAIN public.email_domain AS TEXT CHECK (VALUE ~ '^[^@]+@[^@]+$');\n`;
  sql += `CREATE DOMAIN public.positive_int AS INTEGER CHECK (VALUE > 0);\n\n`;

  sql += `CREATE TABLE public.events (\n  id BIGSERIAL,\n  event_date DATE NOT NULL,\n  region TEXT NOT NULL\n) PARTITION BY RANGE (event_date);\n`;
  sql += `CREATE TABLE public.events_2024 PARTITION OF public.events FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');\n`;
  sql += `CREATE TABLE public.events_2025 PARTITION OF public.events FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');\n`;
  sql += `CREATE TABLE public.events_default PARTITION OF public.events DEFAULT;\n\n`;

  sql += `CREATE TABLE public.regions (code TEXT, name TEXT) PARTITION BY LIST (code);\n`;
  sql += `CREATE TABLE public.regions_us PARTITION OF public.regions FOR VALUES IN ('US');\n`;
  sql += `CREATE TABLE public.regions_eu PARTITION OF public.regions FOR VALUES IN ('EU', 'UK');\n\n`;

  sql += `ALTER TABLE public.t_1 ENABLE ROW LEVEL SECURITY;\n`;
  sql += `CREATE POLICY pol_select ON public.t_1 FOR SELECT USING (true);\n`;
  sql += `CREATE POLICY pol_insert ON public.t_2 FOR INSERT WITH CHECK (col_2 IS NOT NULL);\n\n`;

  sql += `GRANT SELECT ON public.t_1 TO PUBLIC;\n`;
  sql += `GRANT ALL ON public.t_2 TO postgres;\n\n`;

  for (let i = 1; i <= 5; i++) {
    sql += `COMMENT ON TABLE public.t_${i} IS 'Table ${i} for brutal test';\n`;
  }

  sql += `CREATE SEQUENCE public.custom_seq START WITH 100 INCREMENT BY 5 MINVALUE 100 MAXVALUE 999999 CYCLE CACHE 20;\n`;
  sql += `CREATE SEQUENCE public.big_seq AS BIGINT;\n\n`;
  sql += `CREATE STATISTICS public.stats_t1 (ndistinct, dependencies) ON id, col_1 FROM public.t_1;\n\n`;
  sql += `CREATE RULE deny_del AS ON DELETE TO public.t_5 DO INSTEAD NOTHING;\n\n`;

  sql += `ALTER TABLE public.t_10 ADD COLUMN extra TEXT DEFAULT 'x';\n`;
  sql += `ALTER TABLE public.t_10 DROP COLUMN IF EXISTS extra;\n`;
  sql += `ALTER TABLE public.t_11 ALTER COLUMN col_11 TYPE TEXT USING col_11::TEXT;\n`;
  sql += `ALTER TABLE public.t_12 ADD CONSTRAINT chk_pos CHECK (id IS NOT NULL);\n`;
  sql += `ALTER TABLE public.t_13 ALTER COLUMN created_at SET DEFAULT NOW();\n`;
  sql += `ALTER TABLE public.t_14 ALTER COLUMN created_at SET NOT NULL;\n`;
  sql += `ALTER TABLE public.t_15 CLUSTER ON idx_t_15_btree;\n`;
  sql += `ALTER TABLE public.t_16 SET (fillfactor = 80, autovacuum_enabled = true);\n\n`;

  sql += `COPY public.t_1 (id, col_1) FROM stdin;\n\\.\n\n`;

  // Pad to 500+ lines
  while (sql.split('\n').length < 520) {
    const n = sql.split('\n').length;
    sql += `ALTER TABLE public.t_${(n % 30) + 1} SET SCHEMA public;\n`;
  }
  write('pg-dump-realistic.sql', sql);
}

// ── File 2: pg12-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG12-specific DDL features\n\n`;
  sql += `CREATE TABLE gen_cols (\n  id SERIAL PRIMARY KEY,\n  first_name TEXT,\n  last_name TEXT,\n  email TEXT,\n  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,\n  email_upper TEXT GENERATED ALWAYS AS (upper(email)) STORED,\n  json_data JSONB,\n  name_from_json TEXT GENERATED ALWAYS AS (COALESCE(json_data->>'name', 'unknown')) STORED,\n  year_created INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM NOW())) STORED\n);\n\n`;

  for (const opts of [
    'GENERATED ALWAYS AS IDENTITY',
    'GENERATED BY DEFAULT AS IDENTITY',
    'GENERATED ALWAYS AS IDENTITY (START WITH 100)',
    'GENERATED ALWAYS AS IDENTITY (INCREMENT BY 5)',
    'GENERATED ALWAYS AS IDENTITY (MINVALUE 1 MAXVALUE 999999)',
    'GENERATED ALWAYS AS IDENTITY (NO MINVALUE NO MAXVALUE)',
    'GENERATED ALWAYS AS IDENTITY (CYCLE)',
    'GENERATED ALWAYS AS IDENTITY (NO CYCLE)',
    'GENERATED ALWAYS AS IDENTITY (CACHE 20)',
    'GENERATED ALWAYS AS IDENTITY (START WITH 100 INCREMENT BY 5 MINVALUE 100 MAXVALUE 999999 CYCLE CACHE 20)',
  ]) {
    sql += `CREATE TABLE id_${opts.replace(/\W+/g, '_').slice(0, 30)} (id INT ${opts} PRIMARY KEY, name TEXT);\n`;
  }

  sql += `CREATE INDEX idx_include_single ON gen_cols (email) INCLUDE (full_name);\n`;
  sql += `CREATE INDEX idx_include_multi ON gen_cols (id) INCLUDE (first_name, last_name, email);\n`;
  sql += `CREATE UNIQUE INDEX idx_include_unique ON gen_cols (email) INCLUDE (full_name);\n`;
  sql += `CREATE INDEX idx_include_partial ON gen_cols (id) INCLUDE (email) WHERE email IS NOT NULL;\n`;
  sql += `CREATE INDEX idx_include_expr ON gen_cols ((upper(email))) INCLUDE (full_name);\n\n`;

  sql += `CREATE COLLATION nd_collation (provider = icu, locale = 'en-u-ks-level2', deterministic = false);\n\n`;
  sql += `CREATE TRIGGER trg_truncate AFTER TRUNCATE ON gen_cols FOR EACH STATEMENT EXECUTE FUNCTION fn_sql();\n\n`;

  while (sql.split('\n').length < 210) {
    const i = sql.split('\n').length;
    sql += `CREATE TABLE pg12_pad_${i} (id INT GENERATED ALWAYS AS IDENTITY, val TEXT GENERATED ALWAYS AS (upper(val_raw)) STORED, val_raw TEXT);\n`;
  }
  write('pg12-specific.sql', sql);
}

// ── File 3: pg13-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG13-specific DDL\n\nCREATE TABLE stats_tbl (a INT, b INT, c TEXT);\n\n`;
  sql += `CREATE STATISTICS s_ndistinct (ndistinct) ON a, b FROM stats_tbl;\n`;
  sql += `CREATE STATISTICS s_deps (dependencies) ON a, b FROM stats_tbl;\n`;
  sql += `CREATE STATISTICS s_mcv (mcv) ON a, b FROM stats_tbl;\n`;
  sql += `CREATE STATISTICS s_combo (ndistinct, dependencies) ON a, b FROM stats_tbl;\n`;
  sql += `CREATE STATISTICS s_all (ndistinct, dependencies, mcv) ON a, b, c FROM stats_tbl;\n`;
  sql += `CREATE STATISTICS s_expr ON a, lower(c) FROM stats_tbl;\n\n`;
  sql += `CREATE TABLE part_trg (id INT, dt DATE) PARTITION BY RANGE (dt);\n`;
  sql += `CREATE TABLE part_trg_2024 PARTITION OF part_trg FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');\n`;
  sql += `CREATE TRIGGER trg_part AFTER INSERT ON part_trg FOR EACH ROW EXECUTE FUNCTION fn_sql();\n\n`;
  sql += `CREATE INDEX brin_idx ON stats_tbl USING brin (a) WITH (pages_per_range = 128, autosummarize = on);\n\n`;
  sql += `DROP DATABASE IF EXISTS old_db WITH (FORCE);\n`;
  sql += `REINDEX INDEX CONCURRENTLY idx_include_single;\n\n`;
  while (sql.split('\n').length < 160) {
    const i = sql.split('\n').length;
    sql += `CREATE STATISTICS s_pad_${i} (ndistinct) ON a FROM stats_tbl;\n`;
  }
  write('pg13-specific.sql', sql);
}

// ── File 4: pg14-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG14-specific DDL\n\n`;
  sql += `CREATE FUNCTION add_nums(a INT, b INT) RETURNS INT LANGUAGE SQL RETURN a + b;\n`;
  sql += `CREATE FUNCTION get_name(id INT) RETURNS TEXT LANGUAGE SQL RETURN (SELECT name FROM users WHERE users.id = get_name.id);\n`;
  sql += `CREATE FUNCTION atomic_fn() RETURNS INT LANGUAGE SQL BEGIN ATOMIC SELECT 1; END;\n`;
  sql += `CREATE FUNCTION out_fn(IN p_id INT, OUT p_name TEXT) RETURNS SETOF record LANGUAGE SQL RETURN SELECT name FROM users WHERE id = p_id;\n`;
  sql += `CREATE FUNCTION set_fn() RETURNS INT LANGUAGE SQL SET search_path = public RETURN 42;\n\n`;
  sql += `CREATE TABLE parent_part (id INT, dt DATE) PARTITION BY RANGE (dt);\n`;
  sql += `CREATE TABLE child_part PARTITION OF parent_part FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');\n`;
  sql += `ALTER TABLE parent_part DETACH PARTITION child_part CONCURRENTLY;\n\n`;
  sql += `CREATE TYPE daterange_mr AS MULTIRANGE (SUBTYPE = daterange);\n`;
  sql += `CREATE TYPE addr_type AS (street TEXT, city TEXT);\n`;
  sql += `ALTER TYPE addr_type SET (storage = extended);\n\n`;
  sql += `CREATE TABLE gen_part_key (id INT GENERATED ALWAYS AS (id_raw * 2) STORED, id_raw INT, dt DATE) PARTITION BY RANGE (dt);\n\n`;
  sql += `CREATE PROCEDURE proc_inout(IN p1 INT, OUT p2 INT, INOUT p3 INT) LANGUAGE plpgsql AS $$ BEGIN p2 := p1; p3 := p3 + p1; END; $$;\n`;
  sql += `CREATE PROCEDURE proc_variadic(VARIADIC args INT[]) LANGUAGE plpgsql AS $$ BEGIN NULL; END; $$;\n\n`;
  while (sql.split('\n').length < 210) {
    const i = sql.split('\n').length;
    sql += `CREATE FUNCTION fn14_${i}(x INT) RETURNS INT LANGUAGE SQL RETURN x + ${i};\n`;
  }
  write('pg14-specific.sql', sql);
}

// ── File 5: pg15-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG15-specific DDL\n\nCREATE TABLE users (id INT, name TEXT, email TEXT);\n\n`;
  sql += `CREATE VIEW v_sec_inv WITH (security_invoker = true) AS SELECT id, name FROM users;\n`;
  sql += `CREATE VIEW v_sec_both WITH (security_barrier = true, security_invoker = true) AS SELECT * FROM users;\n\n`;
  sql += `CREATE UNIQUE INDEX idx_nulls_nd ON users (email) NULLS NOT DISTINCT;\n`;
  sql += `CREATE UNIQUE INDEX idx_nulls_nd_multi ON users (email, name) NULLS NOT DISTINCT;\n`;
  sql += `CREATE UNIQUE INDEX idx_nulls_nd_partial ON users (email) NULLS NOT DISTINCT WHERE email IS NOT NULL;\n`;
  sql += `CREATE UNIQUE INDEX idx_nulls_nd_expr ON users ((lower(email))) NULLS NOT DISTINCT;\n\n`;
  sql += `CREATE TABLE rls_part (id INT, tenant_id INT) PARTITION BY LIST (tenant_id);\n`;
  sql += `CREATE TABLE rls_part_1 PARTITION OF rls_part FOR VALUES IN (1);\n`;
  sql += `ALTER TABLE rls_part ENABLE ROW LEVEL SECURITY;\n`;
  sql += `CREATE POLICY tenant_pol ON rls_part FOR ALL USING (tenant_id = 1);\n\n`;
  sql += `CREATE SEQUENCE seq_big AS BIGINT;\n`;
  sql += `CREATE SEQUENCE seq_int AS INTEGER;\n`;
  sql += `ALTER SEQUENCE seq_big AS BIGINT;\n\n`;
  sql += `CREATE PROCEDURE proc_set() LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NULL; END; $$;\n\n`;
  sql += `ALTER TABLE parent_part DETACH PARTITION child_part FINALIZE;\n\n`;
  while (sql.split('\n').length < 210) {
    const i = sql.split('\n').length;
    sql += `CREATE UNIQUE INDEX idx15_${i} ON users (email) NULLS NOT DISTINCT;\n`;
  }
  write('pg15-specific.sql', sql);
}

// ── File 6: pg16-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG16-specific DDL\n\n`;
  sql += `CREATE TABLE reg_tbl (\n  id SERIAL PRIMARY KEY,\n  created_by regrole DEFAULT current_user::regrole,\n  ns regnamespace DEFAULT 'public'::regnamespace\n);\n\n`;
  sql += `CREATE TYPE comp16 AS (a INT, b TEXT);\n`;
  sql += `ALTER TYPE comp16 RENAME ATTRIBUTE b TO beta;\n\n`;
  sql += `CREATE DATABASE locale_db WITH LOCALE_PROVIDER = icu ICU_LOCALE = 'en-US';\n\n`;
  sql += `ALTER TABLE reg_tbl SET (access_method = heap);\n\n`;
  sql += `CREATE PUBLICATION pub16 FOR TABLE reg_tbl;\n`;
  sql += `CREATE SUBSCRIPTION sub16 CONNECTION 'host=localhost dbname=test' PUBLICATION pub16;\n\n`;
  while (sql.split('\n').length < 160) {
    const i = sql.split('\n').length;
    sql += `ALTER TABLE reg_tbl ADD COLUMN col_${i} regrole DEFAULT current_user::regrole;\n`;
  }
  write('pg16-specific.sql', sql);
}

// ── File 7: pg17-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG17-specific DDL\n\n`;
  sql += `CREATE TABLE merge_part (id INT, region TEXT) PARTITION BY LIST (region);\n`;
  sql += `CREATE TABLE merge_p1 PARTITION OF merge_part FOR VALUES IN ('A');\n`;
  sql += `CREATE TABLE merge_p2 PARTITION OF merge_part FOR VALUES IN ('B');\n`;
  sql += `ALTER TABLE merge_part MERGE PARTITIONS (merge_p1, merge_p2) INTO merge_combined;\n\n`;
  sql += `CREATE TABLE split_part (id INT) PARTITION BY RANGE (id);\n`;
  sql += `CREATE TABLE split_p PARTITION OF split_part FOR VALUES FROM (1) TO (100);\n`;
  sql += `ALTER TABLE split_part SPLIT PARTITION split_p INTO (PARTITION sp1 FOR VALUES FROM (1) TO (50), PARTITION sp2 FOR VALUES FROM (51) TO (100));\n\n`;
  sql += `CREATE TABLE temporal17 (id INT, name TEXT);\n\n`;
  while (sql.split('\n').length < 210) {
    const i = sql.split('\n').length;
    sql += `CREATE TABLE pg17_pad_${i} (id INT) PARTITION BY RANGE (id);\n`;
    sql += `CREATE TABLE pg17_pad_${i}_p PARTITION OF pg17_pad_${i} FOR VALUES FROM (${i * 100}) TO (${(i + 1) * 100});\n`;
  }
  write('pg17-specific.sql', sql);
}

// ── File 8: pg18-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG18-specific DDL\n\n`;
  sql += `CREATE TABLE temporal_main (\n  id INT PRIMARY KEY,\n  name TEXT,\n  valid_from TIMESTAMPTZ NOT NULL,\n  valid_to TIMESTAMPTZ NOT NULL,\n  PERIOD FOR SYSTEM_TIME (valid_from, valid_to)\n) WITH (system_versioning = true);\n\n`;
  sql += `CREATE TABLE bookings (\n  room_id INT,\n  guest TEXT,\n  valid_from TIMESTAMPTZ,\n  valid_to TIMESTAMPTZ,\n  PERIOD FOR valid_time (valid_from, valid_to),\n  EXCLUDE USING gist (room_id WITH =, valid_time WITHOUT OVERLAPS)\n);\n\n`;
  sql += `CREATE TABLE virtual_gen (\n  id INT,\n  raw TEXT,\n  computed TEXT GENERATED ALWAYS AS (upper(raw)) VIRTUAL\n);\n\n`;
  sql += `CREATE TABLE not_enforced (\n  id INT,\n  age INT,\n  CONSTRAINT age_check CHECK (age > 0) NOT ENFORCED\n);\n\n`;
  sql += `CREATE TABLE stored_gen (id INT, x INT, y INT GENERATED ALWAYS AS (x * 2) STORED);\n`;
  sql += `ALTER TABLE stored_gen ALTER COLUMN y SET EXPRESSION ((x * 3));\n\n`;
  while (sql.split('\n').length < 260) {
    const i = sql.split('\n').length;
    sql += `CREATE TABLE pg18_pad_${i} (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);\n`;
  }
  write('pg18-specific.sql', sql);
}

// ── File 9: pg19-specific.sql ──────────────────────────────────────────────
{
  let sql = `-- PG19-specific DDL — Property Graphs\n\n`;
  sql += `CREATE PROPERTY GRAPH social_network\n  NODE TABLES (\n    Person LABEL person (id, name, email),\n    Company LABEL company (id, name, industry)\n  )\n  EDGE TABLES (\n    WorksAt LABEL works_at\n      SOURCE Person\n      DESTINATION Company\n      PROPERTIES (start_date, role),\n    Knows LABEL knows\n      SOURCE Person\n      DESTINATION Person\n      PROPERTIES (since_date, strength)\n  );\n\n`;
  sql += `CREATE PROPERTY GRAPH supply_chain\n  NODE TABLES (\n    Supplier LABEL supplier DEFAULT LABEL vendor (id, name),\n    Product LABEL product (id, sku)\n  )\n  EDGE TABLES (\n    Supplies LABEL supplies\n      SOURCE Supplier\n      DESTINATION Product\n      PROPERTIES (price, lead_time)\n  );\n\n`;
  while (sql.split('\n').length < 210) {
    const i = sql.split('\n').length;
    sql += `CREATE PROPERTY GRAPH graph_${i}\n  NODE TABLES (Node${i} LABEL n${i} (id))\n  EDGE TABLES (Edge${i} LABEL e${i} SOURCE Node${i} DESTINATION Node${i} PROPERTIES (w));\n\n`;
  }
  write('pg19-specific.sql', sql);
}

// ── File 10: edge-cases-malformed.sql ──────────────────────────────────────
{
  let sql = `-- Edge cases — parser must not crash\n\n`;
  sql += `CREATE TABLE ok_table (id INT);\n`;
  sql += `CREATE/*comment*/TABLE t_comment (col INT);\n`;
  sql += `CREATE TABLE t_semi (col INT);; ; ;\nCREATE TABLE t_semi2 (col INT);\n\n`;
  sql += `CREATE FUNCTION f_dollar() RETURNS INT AS $mytag$ SELECT 1 $mytag$ LANGUAGE sql;\n`;
  sql += `CREATE FUNCTION f_empty() RETURNS INT AS $$ $$ LANGUAGE sql;\n\n`;
  sql += `CREATE TABLE "VeryLongIdentifierThatExceedsSixtyThreeCharactersLimitTest" (id INT);\n`;
  sql += `CREATE TABLE "user" (id INT);\n`;
  sql += `CREATE TABLE "select" (id INT);\n\n`;
  sql += `CREATE TABLE IF NOT EXISTS t_ifne (id INT);\n`;
  sql += `CREATE TABLE t_temp TEMPORARY (id INT) ON COMMIT DELETE ROWS;\n`;
  sql += `CREATE UNLOGGED TABLE t_unlogged (id INT);\n\n`;
  sql += `CREATE TABLE t_ctas AS SELECT 1 AS id;\n\n`;
  sql += `INSERT INTO ok_table VALUES (1);\nCREATE TABLE t_after_insert (id INT);\n\n`;
  sql += `BEGIN;\nCREATE TABLE t_in_tx (id INT);\nCOMMIT;\n\n`;
  sql += `DO $$ BEGIN RAISE NOTICE 'test'; END; $$;\n\n`;
  while (sql.split('\n').length < 310) {
    const i = sql.split('\n').length;
    sql += `CREATE TABLE edge_${i} (id INT);\n`;
  }
  write('edge-cases-malformed.sql', sql);
}

// ── File 11: alter-everything.sql ──────────────────────────────────────────
{
  let sql = `-- ALTER everything\n\nCREATE TABLE alter_base (id INT, name TEXT, val INT, dt DATE);\n\n`;
  const alters = [
    'ADD COLUMN extra TEXT DEFAULT \'x\'',
    'ADD COLUMN notnull_col TEXT NOT NULL DEFAULT \'y\'',
    'DROP COLUMN IF EXISTS extra',
    'ALTER COLUMN name TYPE VARCHAR(255)',
    'ALTER COLUMN name TYPE TEXT USING name::TEXT',
    'ALTER COLUMN val SET DEFAULT 0',
    'ALTER COLUMN val DROP DEFAULT',
    'ALTER COLUMN name SET NOT NULL',
    'ALTER COLUMN dt DROP NOT NULL',
    'ADD CONSTRAINT pk_alt PRIMARY KEY (id)',
    'ADD CONSTRAINT uq_name UNIQUE (name)',
    'ADD CONSTRAINT chk_val CHECK (val >= 0)',
    'DROP CONSTRAINT IF EXISTS chk_val',
    'CLUSTER ON alter_base_pkey',
    'SET WITHOUT CLUSTER',
    'SET STORAGE PLAIN',
    'SET (fillfactor = 50, autovacuum_enabled = true)',
    'RESET (fillfactor)',
    'ENABLE ROW LEVEL SECURITY',
    'DISABLE ROW LEVEL SECURITY',
    'FORCE ROW LEVEL SECURITY',
    'NO FORCE ROW LEVEL SECURITY',
    'ENABLE TRIGGER ALL',
    'DISABLE TRIGGER ALL',
    'RENAME TO alter_base_renamed',
    'RENAME COLUMN name TO full_name',
    'SET SCHEMA public',
    'OWNER TO postgres',
  ];
  for (const a of alters) sql += `ALTER TABLE alter_base ${a};\n`;
  sql += `\nCREATE INDEX alter_idx ON alter_base (name);\n`;
  sql += `ALTER INDEX alter_idx RENAME TO alter_idx_new;\n`;
  sql += `ALTER INDEX alter_idx_new SET (fillfactor = 90);\n\n`;
  sql += `CREATE VIEW alter_view AS SELECT id FROM alter_base;\n`;
  sql += `ALTER VIEW alter_view RENAME TO alter_view_new;\n\n`;
  sql += `CREATE SEQUENCE alter_seq;\n`;
  sql += `ALTER SEQUENCE alter_seq RESTART WITH 1;\n\n`;
  sql += `CREATE TYPE alter_enum AS ENUM ('a', 'b');\n`;
  sql += `ALTER TYPE alter_enum ADD VALUE 'c';\n\n`;
  while (sql.split('\n').length < 410) {
    const i = sql.split('\n').length;
    sql += `ALTER TABLE alter_base ADD COLUMN pad_${i} TEXT;\n`;
  }
  write('alter-everything.sql', sql);
}

// ── File 12: combinatorial-explosion.sql ───────────────────────────────────
{
  let sql = `-- Combinatorial option combinations\n\n`;
  sql += `CREATE UNLOGGED TABLE combo_tbl (\n  id INT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),\n  email TEXT NOT NULL COLLATE "C" DEFAULT 'a@b.com' CHECK (length(email) > 3) UNIQUE,\n  ref_id INT REFERENCES alter_base(id) ON DELETE CASCADE,\n  PRIMARY KEY (id),\n  UNIQUE (email),\n  CHECK (id > 0)\n) WITH (fillfactor = 90, autovacuum_enabled = true) TABLESPACE pg_default;\n\n`;
  sql += `CREATE UNIQUE INDEX IF NOT EXISTS combo_idx ON combo_tbl (email COLLATE "C" ASC NULLS LAST) INCLUDE (ref_id) WITH (fillfactor = 80) WHERE email IS NOT NULL;\n\n`;
  sql += `CREATE OR REPLACE FUNCTION combo_fn(\n  IN p1 INT DEFAULT 1,\n  OUT p2 TEXT,\n  VARIADIC args INT[]\n) RETURNS SETOF record\n  LANGUAGE plpgsql\n  IMMUTABLE PARALLEL SAFE\n  COST 100\n  SET search_path = public\n  SECURITY DEFINER\nAS $$\nBEGIN\n  p2 := 'ok';\n  RETURN NEXT;\nEND;\n$$;\n\n`;
  sql += `CREATE CONSTRAINT TRIGGER combo_trg\n  AFTER INSERT OR UPDATE OR DELETE ON combo_tbl\n  DEFERRABLE INITIALLY DEFERRED\n  FOR EACH ROW\n  WHEN (NEW.id > 0)\n  EXECUTE FUNCTION combo_fn(NEW.id);\n\n\n`;
  while (sql.split('\n').length < 510) {
    const i = sql.split('\n').length;
    sql += `CREATE TABLE combo_pad_${i} (id INT PRIMARY KEY, val TEXT NOT NULL CHECK (length(val) > 0));\n`;
  }
  write('combinatorial-explosion.sql', sql);
}

// ── File 13: pg-dump-multiversion.sql ──────────────────────────────────────
{
  let sql = '';
  for (const ver of ['12.18', '14.12', '15.8', '17.2', '18.0', '19.0']) {
    sql += pgDumpHeader(ver);
    sql += `-- === Simulated pg_dump from PG ${ver.split('.')[0]} ===\n\n`;
    sql += `CREATE SCHEMA dump_v${ver.split('.')[0]};\n`;
    sql += `CREATE TABLE dump_v${ver.split('.')[0]}.sample (id INT PRIMARY KEY, data TEXT);\n`;
    sql += `COMMENT ON TABLE dump_v${ver.split('.')[0]}.sample IS 'From pg_dump ${ver}';\n`;
    sql += `ALTER TABLE dump_v${ver.split('.')[0]}.sample OWNER TO postgres;\n\n`;
    if (ver.startsWith('15') || ver.startsWith('17')) {
      sql += `CREATE UNIQUE INDEX idx_nd ON dump_v${ver.split('.')[0]}.sample (data) NULLS NOT DISTINCT;\n\n`;
    }
    if (ver.startsWith('18') || ver.startsWith('19')) {
      sql += `CREATE TABLE dump_v${ver.split('.')[0]}.temporal (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);\n\n`;
    }
    if (ver.startsWith('19')) {
      sql += `CREATE PROPERTY GRAPH dump_graph NODE TABLES (N LABEL n (id)) EDGE TABLES (E LABEL e SOURCE N DESTINATION N PROPERTIES (w));\n\n`;
    }
    sql += `COPY dump_v${ver.split('.')[0]}.sample (id, data) FROM stdin;\n1\ttest\n\\.\n\n`;
  }
  while (sql.split('\n').length < 620) {
    const i = sql.split('\n').length;
    sql += `-- padding line ${i}\n`;
  }
  write('pg-dump-multiversion.sql', sql);
}

// ── File 14: security-rls-policies.sql ─────────────────────────────────────
{
  let sql = `-- RLS and security exhaustive\n\nCREATE TABLE sec_data (id INT, tenant_id INT, secret TEXT, owner TEXT);\n\n`;
  sql += `ALTER TABLE sec_data ENABLE ROW LEVEL SECURITY;\n`;
  sql += `ALTER TABLE sec_data FORCE ROW LEVEL SECURITY;\n\n`;
  const policies = [
    `CREATE POLICY pol_select ON sec_data FOR SELECT USING (tenant_id = current_setting('app.tenant')::INT)`,
    `CREATE POLICY pol_insert ON sec_data FOR INSERT WITH CHECK (secret IS NOT NULL)`,
    `CREATE POLICY pol_update ON sec_data FOR UPDATE USING (owner = current_user) WITH CHECK (secret IS NOT NULL)`,
    `CREATE POLICY pol_delete ON sec_data FOR DELETE USING (owner = current_user)`,
    `CREATE POLICY pol_all ON sec_data FOR ALL TO PUBLIC USING (true)`,
    `CREATE POLICY pol_roles ON sec_data FOR SELECT TO postgres, PUBLIC USING (true)`,
  ];
  for (const p of policies) sql += `${p};\n`;
  sql += `\nGRANT SELECT ON sec_data TO PUBLIC;\n`;
  sql += `GRANT INSERT, UPDATE ON sec_data TO postgres;\n`;
  sql += `REVOKE ALL ON sec_data FROM PUBLIC;\n\n`;
  sql += `CREATE ROLE app_reader NOLOGIN;\n`;
  sql += `CREATE ROLE app_writer LOGIN PASSWORD 'secret' IN ROLE app_reader;\n\n`;
  while (sql.split('\n').length < 210) {
    const i = sql.split('\n').length;
    sql += `CREATE POLICY pol_pad_${i} ON sec_data FOR SELECT USING (id > ${i});\n`;
  }
  write('security-rls-policies.sql', sql);
}

// ── File 15: partitioning-nightmare.sql ────────────────────────────────────
{
  let sql = `-- Partitioning nightmare\n\n`;
  sql += `CREATE TABLE part_range (created_at TIMESTAMPTZ, id BIGINT) PARTITION BY RANGE (created_at, id);\n`;
  sql += `CREATE TABLE part_list (region TEXT, country TEXT) PARTITION BY LIST (region, country);\n`;
  sql += `CREATE TABLE part_hash (id BIGINT) PARTITION BY HASH (id);\n\n`;
  sql += `CREATE TABLE events_ml (dt DATE, user_id INT) PARTITION BY RANGE (dt);\n`;
  sql += `CREATE TABLE events_ml_2024 PARTITION OF events_ml FOR VALUES FROM ('2024-01-01') TO ('2025-01-01') PARTITION BY HASH (user_id);\n`;
  sql += `CREATE TABLE events_ml_2024_h0 PARTITION OF events_ml_2024 FOR VALUES WITH (MODULUS 4, REMAINDER 0);\n`;
  sql += `CREATE TABLE events_ml_2024_h1 PARTITION OF events_ml_2024 FOR VALUES WITH (MODULUS 4, REMAINDER 1);\n\n`;
  sql += `CREATE TABLE part_parent (id INT) PARTITION BY RANGE (id);\n`;
  sql += `CREATE TABLE part_child PARTITION OF part_parent FOR VALUES FROM (1) TO (100);\n`;
  sql += `CREATE TABLE part_default PARTITION OF part_parent DEFAULT;\n\n`;
  sql += `ALTER TABLE part_parent DETACH PARTITION part_child CONCURRENTLY;\n`;
  sql += `ALTER TABLE part_parent DETACH PARTITION part_default FINALIZE;\n\n`;
  sql += `CREATE INDEX idx_part ON ONLY part_parent (id);\n\n`;
  while (sql.split('\n').length < 310) {
    const i = sql.split('\n').length;
    sql += `CREATE TABLE part_pad_${i} (id INT) PARTITION BY RANGE (id);\n`;
    sql += `CREATE TABLE part_pad_${i}_p PARTITION OF part_pad_${i} FOR VALUES FROM (${i * 1000}) TO (${(i + 1) * 1000});\n`;
  }
  write('partitioning-nightmare.sql', sql);
}

console.log('\nDone.');
