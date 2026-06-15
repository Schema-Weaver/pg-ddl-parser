-- PostgreSQL database dump
-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

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

-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
CREATE SCHEMA public;

-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
CREATE SCHEMA auth;

-- Name: analytics; Type: SCHEMA; Schema: -; Owner: postgres
CREATE SCHEMA analytics;

-- Name: audit; Type: SCHEMA; Schema: -; Owner: postgres
CREATE SCHEMA audit;

-- Name: t_1; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_1 JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_2; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_2 TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_3; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_3 BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_4; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_4 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_4 INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_5; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_5 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_5 CIDR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_6; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_6 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_6 MACADDR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_7; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_7 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_7 INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_8; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_8 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_8 MONEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_9; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_9 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_9 TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_10; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_10 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_10 XML,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_11; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_11 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_11 POINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_12; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_12 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_12 LINE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_13; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_13 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_13 LSEG,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_14; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_14 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_14 BOX,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_15; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_15 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_15 PATH,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_16; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_16 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_16 POLYGON,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_17; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_17 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_17 CIRCLE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_18; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_18 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_18 TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_19; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_19 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_19 INTEGER[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_20; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_20 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_20 UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_21; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_21 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_21 JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_22; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_22 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_22 TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_23; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_23 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_23 BYTEA,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_24; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_24 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_24 INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_25; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_25 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_25 CIDR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_26; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_26 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_26 MACADDR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_27; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_27 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_27 INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_28; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_28 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_28 MONEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_29; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_29 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_29 TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Name: t_30; Type: TABLE; Schema: public; Owner: postgres
CREATE TABLE public.t_30 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  col_30 XML,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_t_1_gin ON public.t_1 USING gin (col_1);
CREATE INDEX idx_t_2_gist ON public.t_2 USING gist (col_2);
CREATE INDEX idx_t_3_brin ON public.t_3 USING brin (col_3);
CREATE INDEX idx_t_4_hash ON public.t_4 USING hash (col_4);
CREATE INDEX idx_t_5_spgist ON public.t_5 USING spgist (col_5);
CREATE INDEX idx_t_6_btree ON public.t_6 USING btree (col_6);
CREATE INDEX idx_t_7_gin ON public.t_7 USING gin (col_7);
CREATE INDEX idx_t_8_gist ON public.t_8 USING gist (col_8);
CREATE INDEX idx_t_9_brin ON public.t_9 USING brin (col_9);
CREATE INDEX idx_t_10_hash ON public.t_10 USING hash (col_10);
CREATE INDEX idx_partial ON public.t_1 (created_at) WHERE col_1 IS NOT NULL;
CREATE INDEX idx_expr ON public.t_2 ((meta->>'key'));
CREATE INDEX idx_cover ON public.t_3 (id) INCLUDE (col_3, created_at);

-- Name: fn_1; Type: FUNCTION; Schema: public; Owner: postgres
CREATE FUNCTION public.fn_1(p_id UUID) RETURNS TABLE(id UUID, val TEXT)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN QUERY SELECT p_id, 'ok';
END;
$$;

-- Name: fn_2; Type: FUNCTION; Schema: public; Owner: postgres
CREATE FUNCTION public.fn_2(p_id UUID) RETURNS TABLE(id UUID, val TEXT)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN QUERY SELECT p_id, 'ok';
END;
$$;

-- Name: fn_3; Type: FUNCTION; Schema: public; Owner: postgres
CREATE FUNCTION public.fn_3(p_id UUID) RETURNS TABLE(id UUID, val TEXT)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN QUERY SELECT p_id, 'ok';
END;
$$;

-- Name: fn_4; Type: FUNCTION; Schema: public; Owner: postgres
CREATE FUNCTION public.fn_4(p_id UUID) RETURNS TABLE(id UUID, val TEXT)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN QUERY SELECT p_id, 'ok';
END;
$$;

-- Name: fn_5; Type: FUNCTION; Schema: public; Owner: postgres
CREATE FUNCTION public.fn_5(p_id UUID) RETURNS TABLE(id UUID, val TEXT)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN QUERY SELECT p_id, 'ok';
END;
$$;

CREATE FUNCTION public.fn_sql() RETURNS INT LANGUAGE sql RETURN 42;

CREATE TRIGGER trg_1 AFTER INSERT OR UPDATE ON public.t_1
  FOR EACH ROW WHEN (NEW.col_1 IS NOT NULL)
  EXECUTE FUNCTION public.fn_1(NEW.id);

CREATE TRIGGER trg_2 AFTER INSERT OR UPDATE ON public.t_2
  FOR EACH ROW WHEN (NEW.col_2 IS NOT NULL)
  EXECUTE FUNCTION public.fn_1(NEW.id);

CREATE TRIGGER trg_3 AFTER INSERT OR UPDATE ON public.t_3
  FOR EACH ROW WHEN (NEW.col_3 IS NOT NULL)
  EXECUTE FUNCTION public.fn_1(NEW.id);

CREATE VIEW public.v_1 WITH (security_barrier = true) AS SELECT id, col_1 FROM public.t_1;

CREATE VIEW public.v_2 WITH (security_barrier = true) AS SELECT id, col_2 FROM public.t_2;

CREATE VIEW public.v_3 WITH (security_barrier = true) AS SELECT id, col_3 FROM public.t_3;

CREATE MATERIALIZED VIEW public.mv_1 AS SELECT id, col_1 FROM public.t_1 WITH DATA;
CREATE MATERIALIZED VIEW public.mv_2 AS SELECT count(*) AS cnt FROM public.t_2 WITH NO DATA;

CREATE TYPE public.status_1 AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.status_2 AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.status_3 AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.status_4 AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.status_5 AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.address AS (street TEXT, city TEXT, zip TEXT);
CREATE TYPE public.geo_point AS (lat DOUBLE PRECISION, lng DOUBLE PRECISION);

CREATE DOMAIN public.email_domain AS TEXT CHECK (VALUE ~ '^[^@]+@[^@]+$');
CREATE DOMAIN public.positive_int AS INTEGER CHECK (VALUE > 0);

CREATE TABLE public.events (
  id BIGSERIAL,
  event_date DATE NOT NULL,
  region TEXT NOT NULL
) PARTITION BY RANGE (event_date);
CREATE TABLE public.events_2024 PARTITION OF public.events FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE public.events_2025 PARTITION OF public.events FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE public.events_default PARTITION OF public.events DEFAULT;

CREATE TABLE public.regions (code TEXT, name TEXT) PARTITION BY LIST (code);
CREATE TABLE public.regions_us PARTITION OF public.regions FOR VALUES IN ('US');
CREATE TABLE public.regions_eu PARTITION OF public.regions FOR VALUES IN ('EU', 'UK');

ALTER TABLE public.t_1 ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_select ON public.t_1 FOR SELECT USING (true);
CREATE POLICY pol_insert ON public.t_2 FOR INSERT WITH CHECK (col_2 IS NOT NULL);

GRANT SELECT ON public.t_1 TO PUBLIC;
GRANT ALL ON public.t_2 TO postgres;

COMMENT ON TABLE public.t_1 IS 'Table 1 for brutal test';
COMMENT ON TABLE public.t_2 IS 'Table 2 for brutal test';
COMMENT ON TABLE public.t_3 IS 'Table 3 for brutal test';
COMMENT ON TABLE public.t_4 IS 'Table 4 for brutal test';
COMMENT ON TABLE public.t_5 IS 'Table 5 for brutal test';
CREATE SEQUENCE public.custom_seq START WITH 100 INCREMENT BY 5 MINVALUE 100 MAXVALUE 999999 CYCLE CACHE 20;
CREATE SEQUENCE public.big_seq AS BIGINT;

CREATE STATISTICS public.stats_t1 (ndistinct, dependencies) ON id, col_1 FROM public.t_1;

CREATE RULE deny_del AS ON DELETE TO public.t_5 DO INSTEAD NOTHING;

ALTER TABLE public.t_10 ADD COLUMN extra TEXT DEFAULT 'x';
ALTER TABLE public.t_10 DROP COLUMN IF EXISTS extra;
ALTER TABLE public.t_11 ALTER COLUMN col_11 TYPE TEXT USING col_11::TEXT;
ALTER TABLE public.t_12 ADD CONSTRAINT chk_pos CHECK (id IS NOT NULL);
ALTER TABLE public.t_13 ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.t_14 ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.t_15 CLUSTER ON idx_t_15_btree;
ALTER TABLE public.t_16 SET (fillfactor = 80, autovacuum_enabled = true);

COPY public.t_1 (id, col_1) FROM stdin;
\.

ALTER TABLE public.t_21 SET SCHEMA public;
ALTER TABLE public.t_22 SET SCHEMA public;
ALTER TABLE public.t_23 SET SCHEMA public;
ALTER TABLE public.t_24 SET SCHEMA public;
ALTER TABLE public.t_25 SET SCHEMA public;
ALTER TABLE public.t_26 SET SCHEMA public;
ALTER TABLE public.t_27 SET SCHEMA public;
ALTER TABLE public.t_28 SET SCHEMA public;
ALTER TABLE public.t_29 SET SCHEMA public;
ALTER TABLE public.t_30 SET SCHEMA public;
ALTER TABLE public.t_1 SET SCHEMA public;
ALTER TABLE public.t_2 SET SCHEMA public;
ALTER TABLE public.t_3 SET SCHEMA public;
ALTER TABLE public.t_4 SET SCHEMA public;
ALTER TABLE public.t_5 SET SCHEMA public;
ALTER TABLE public.t_6 SET SCHEMA public;
ALTER TABLE public.t_7 SET SCHEMA public;
ALTER TABLE public.t_8 SET SCHEMA public;
ALTER TABLE public.t_9 SET SCHEMA public;
ALTER TABLE public.t_10 SET SCHEMA public;
ALTER TABLE public.t_11 SET SCHEMA public;
ALTER TABLE public.t_12 SET SCHEMA public;
ALTER TABLE public.t_13 SET SCHEMA public;
ALTER TABLE public.t_14 SET SCHEMA public;
ALTER TABLE public.t_15 SET SCHEMA public;
ALTER TABLE public.t_16 SET SCHEMA public;
ALTER TABLE public.t_17 SET SCHEMA public;
ALTER TABLE public.t_18 SET SCHEMA public;
ALTER TABLE public.t_19 SET SCHEMA public;
ALTER TABLE public.t_20 SET SCHEMA public;
ALTER TABLE public.t_21 SET SCHEMA public;
ALTER TABLE public.t_22 SET SCHEMA public;
ALTER TABLE public.t_23 SET SCHEMA public;
ALTER TABLE public.t_24 SET SCHEMA public;
ALTER TABLE public.t_25 SET SCHEMA public;
ALTER TABLE public.t_26 SET SCHEMA public;
ALTER TABLE public.t_27 SET SCHEMA public;
ALTER TABLE public.t_28 SET SCHEMA public;
ALTER TABLE public.t_29 SET SCHEMA public;
ALTER TABLE public.t_30 SET SCHEMA public;
ALTER TABLE public.t_1 SET SCHEMA public;
ALTER TABLE public.t_2 SET SCHEMA public;
ALTER TABLE public.t_3 SET SCHEMA public;
ALTER TABLE public.t_4 SET SCHEMA public;
ALTER TABLE public.t_5 SET SCHEMA public;
ALTER TABLE public.t_6 SET SCHEMA public;
ALTER TABLE public.t_7 SET SCHEMA public;
ALTER TABLE public.t_8 SET SCHEMA public;
ALTER TABLE public.t_9 SET SCHEMA public;
ALTER TABLE public.t_10 SET SCHEMA public;
ALTER TABLE public.t_11 SET SCHEMA public;
ALTER TABLE public.t_12 SET SCHEMA public;
ALTER TABLE public.t_13 SET SCHEMA public;
ALTER TABLE public.t_14 SET SCHEMA public;
ALTER TABLE public.t_15 SET SCHEMA public;
ALTER TABLE public.t_16 SET SCHEMA public;
ALTER TABLE public.t_17 SET SCHEMA public;
ALTER TABLE public.t_18 SET SCHEMA public;
ALTER TABLE public.t_19 SET SCHEMA public;
ALTER TABLE public.t_20 SET SCHEMA public;
ALTER TABLE public.t_21 SET SCHEMA public;
ALTER TABLE public.t_22 SET SCHEMA public;
ALTER TABLE public.t_23 SET SCHEMA public;
ALTER TABLE public.t_24 SET SCHEMA public;
ALTER TABLE public.t_25 SET SCHEMA public;
ALTER TABLE public.t_26 SET SCHEMA public;
ALTER TABLE public.t_27 SET SCHEMA public;
ALTER TABLE public.t_28 SET SCHEMA public;
ALTER TABLE public.t_29 SET SCHEMA public;
ALTER TABLE public.t_30 SET SCHEMA public;
ALTER TABLE public.t_1 SET SCHEMA public;
ALTER TABLE public.t_2 SET SCHEMA public;
ALTER TABLE public.t_3 SET SCHEMA public;
ALTER TABLE public.t_4 SET SCHEMA public;
ALTER TABLE public.t_5 SET SCHEMA public;
ALTER TABLE public.t_6 SET SCHEMA public;
ALTER TABLE public.t_7 SET SCHEMA public;
ALTER TABLE public.t_8 SET SCHEMA public;
ALTER TABLE public.t_9 SET SCHEMA public;
ALTER TABLE public.t_10 SET SCHEMA public;
ALTER TABLE public.t_11 SET SCHEMA public;
ALTER TABLE public.t_12 SET SCHEMA public;
ALTER TABLE public.t_13 SET SCHEMA public;
ALTER TABLE public.t_14 SET SCHEMA public;
ALTER TABLE public.t_15 SET SCHEMA public;
ALTER TABLE public.t_16 SET SCHEMA public;
ALTER TABLE public.t_17 SET SCHEMA public;
ALTER TABLE public.t_18 SET SCHEMA public;
ALTER TABLE public.t_19 SET SCHEMA public;
ALTER TABLE public.t_20 SET SCHEMA public;
ALTER TABLE public.t_21 SET SCHEMA public;
ALTER TABLE public.t_22 SET SCHEMA public;
ALTER TABLE public.t_23 SET SCHEMA public;
ALTER TABLE public.t_24 SET SCHEMA public;
ALTER TABLE public.t_25 SET SCHEMA public;
ALTER TABLE public.t_26 SET SCHEMA public;
ALTER TABLE public.t_27 SET SCHEMA public;
ALTER TABLE public.t_28 SET SCHEMA public;
ALTER TABLE public.t_29 SET SCHEMA public;
ALTER TABLE public.t_30 SET SCHEMA public;
ALTER TABLE public.t_1 SET SCHEMA public;
ALTER TABLE public.t_2 SET SCHEMA public;
ALTER TABLE public.t_3 SET SCHEMA public;
ALTER TABLE public.t_4 SET SCHEMA public;
ALTER TABLE public.t_5 SET SCHEMA public;
ALTER TABLE public.t_6 SET SCHEMA public;
ALTER TABLE public.t_7 SET SCHEMA public;
ALTER TABLE public.t_8 SET SCHEMA public;
ALTER TABLE public.t_9 SET SCHEMA public;
ALTER TABLE public.t_10 SET SCHEMA public;
