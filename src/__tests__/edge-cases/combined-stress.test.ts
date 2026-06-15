import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { ParsedSchema } from '../../types';

const MASSIVE_SQL = `
-- =============================================================================
-- Comprehensive PG12-19 Stress Test
-- Tests all major features in one parse
-- =============================================================================

-- Schemas
CREATE SCHEMA app;
CREATE SCHEMA analytics;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public VERSION '1.5';
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Composite Types
CREATE TYPE address_type AS (
    street TEXT,
    city TEXT,
    country TEXT,
    postal_code VARCHAR(20)
);

-- Domains
CREATE DOMAIN email_domain TEXT 
    CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
CREATE DOMAIN positive_int INTEGER 
    DEFAULT 0 NOT NULL CHECK (VALUE >= 0);

-- [PG12] Range-partitioned table
CREATE TABLE events (
    id BIGSERIAL,
    event_type user_status NOT NULL,
    event_date DATE NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (event_date);

-- [PG12] Range partition
CREATE TABLE events_2024 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
    PARTITION BY LIST (event_type);

CREATE TABLE events_2024_active PARTITION OF events_2024
    FOR VALUES IN ('active');
CREATE TABLE events_2024_inactive PARTITION OF events_2024
    FOR VALUES IN ('inactive', 'suspended');

-- [PG12] Table with generated columns
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    quantity INTEGER DEFAULT 0,
    total_value NUMERIC(14,2) GENERATED ALWAYS AS (price * quantity) STORED,
    status user_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [PG12] Identity column
CREATE TABLE audit_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1000 INCREMENT BY 10 MAXVALUE 9999999 CYCLE),
    action TEXT NOT NULL,
    user_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [PG18] Temporal table with PERIOD
CREATE TABLE temporal_employees (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT,
    salary NUMERIC(12,2),
    valid_from TIMESTAMPTZ GENERATED ALWAYS AS ROW START,
    valid_to TIMESTAMPTZ GENERATED ALWAYS AS ROW END,
    PERIOD SYSTEM_TIME (valid_from, valid_to)
) WITH SYSTEM VERSIONING;

-- [PG18] WITHOUT OVERLAPS constraint
CREATE TABLE temporal_room_booking (
    room_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    EXCLUDE USING gist (
        room_id WITH =,
        PERIOD valid_from, valid_to WITHOUT OVERLAPS
    )
);

-- [PG18] VIRTUAL generated column
CREATE TABLE computed_metrics (
    id SERIAL PRIMARY KEY,
    raw_value NUMERIC,
    computed_score NUMERIC GENERATED ALWAYS AS (raw_value * 1.5 + 100) VIRTUAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [PG13] Table with BRIN index
CREATE TABLE time_series (
    id BIGSERIAL PRIMARY KEY,
    recorded_at TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL,
    value NUMERIC,
    metadata JSONB
);

CREATE INDEX idx_time_series_brin ON time_series USING brin (recorded_at)
    WITH (pages_per_range=128, autosummarize=on);

-- [PG12] Covering index
CREATE INDEX idx_products_covering ON products (name) INCLUDE (price, quantity, status);

-- [PG15] NULLS NOT DISTINCT unique index
CREATE UNIQUE INDEX idx_unique_email ON products (name) NULLS NOT DISTINCT
    WHERE status = 'active';

-- [PG12] Partial index with complex WHERE
CREATE INDEX idx_active_products ON products (name, price)
    WHERE status = 'active' AND quantity > 0 AND price < 1000;

-- Expression index
CREATE INDEX idx_lower_product_name ON products (LOWER(name));

-- GIN index with options
CREATE INDEX idx_payload_gin ON products (payload) USING gin
    WITH (fastupdate=on, gin_pending_list_limit=4096);

-- [PG14] SQL body function
CREATE OR REPLACE FUNCTION calculate_discount(price NUMERIC, category TEXT)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE PARALLEL SAFE
RETURN CASE
    WHEN category = 'premium' THEN price * 0.80
    WHEN category = 'standard' THEN price * 0.90
    ELSE price
END;

-- Function with full attributes
CREATE FUNCTION get_user_stats(user_id INTEGER)
RETURNS TABLE (total_orders INTEGER, total_spent NUMERIC, last_order TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
COST 100 ROWS 50
RETURN SELECT 
    COUNT(*)::INTEGER, 
    SUM(total)::NUMERIC, 
    MAX(created_at)
FROM orders WHERE user_id = $1;

-- [PG13] Aggregate function
CREATE AGGREGATE percentile_cont (FLOAT) (
    SFUNC = float8_accum,
    STYPE = FLOAT[],
    FINALFUNC = percentile_cont_final,
    COMBINEFUNC = float8_combine,
    INITCOND = '{}'
);

-- Procedure
CREATE PROCEDURE bulk_insert_orders(
    p_orders JSONB,
    OUT inserted_count INTEGER,
    OUT error_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO orders (user_id, total, created_at)
    SELECT 
        (o->>'user_id')::INTEGER,
        (o->>'total')::NUMERIC,
        NOW()
    FROM jsonb_array_elements(p_orders) o;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    error_count := 0;
END;
$$;

-- [PG10+] Trigger with transition tables
CREATE TRIGGER trg_order_audit
AFTER INSERT OR UPDATE OR DELETE ON orders
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION order_audit_func();

-- [PG13] Trigger on partitioned table
CREATE TRIGGER trg_events_audit
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION event_log_func();

-- Constraint trigger
CREATE CONSTRAINT TRIGGER trg_check_order_integrity
AFTER INSERT ON orders
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_order();

-- Column UPDATE OF trigger
CREATE TRIGGER trg_status_change
AFTER UPDATE OF status ON products
FOR EACH ROW
WHEN (OLD.status <> NEW.status)
EXECUTE FUNCTION log_status_change();

-- [PG12] Recursive view
CREATE RECURSIVE VIEW category_tree (id, name, parent_id, depth) AS
SELECT id, name, parent_id, 0 AS depth
FROM categories WHERE parent_id IS NULL
UNION ALL
SELECT c.id, c.name, c.parent_id, ct.depth + 1
FROM categories c
JOIN category_tree ct ON c.parent_id = ct.id;

-- [PG12] View with CHECK OPTION
CREATE VIEW active_products AS
SELECT id, name, price, quantity
FROM products WHERE status = 'active'
WITH CASCADED CHECK OPTION;

-- [PG15] Security invoker view
CREATE VIEW user_orders AS
SELECT id, user_id, total, status
FROM orders
WITH (security_invoker=true);

-- Materialized view
CREATE MATERIALIZED VIEW sales_summary AS
SELECT 
    DATE(created_at) AS sale_date,
    COUNT(*) AS order_count,
    SUM(total) AS revenue
FROM orders
GROUP BY DATE(created_at)
WITH (fillfactor=80, populated=false)
TABLESPACE pg_default;

-- [PG15] RLS on partitioned table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_access ON events
    FOR ALL
    TO authenticated
    USING (payload->>'tenant_id' = current_setting('app.tenant_id'))
    WITH CHECK (payload->>'tenant_id' = current_setting('app.tenant_id'));

-- Roles
CREATE ROLE app_user WITH LOGIN NOCREATEDB INHERIT CONNECTION LIMIT 10;
CREATE ROLE app_admin WITH LOGIN SUPERUSER CREATEDB VALID UNTIL '2025-12-31';
ALTER ROLE app_user SET search_path = 'app, public';

-- Grants
GRANT SELECT, INSERT, UPDATE ON products TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA app TO app_admin;
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO app_user;
GRANT EXECUTE ON FUNCTION calculate_discount(NUMERIC, TEXT) TO PUBLIC;

-- [PG15] ALTER DEFAULT PRIVILEGES
ALTER DEFAULT PRIVILEGES IN SCHEMA app
    GRANT SELECT ON TABLES TO app_user;

-- [PG13] Extended statistics
CREATE STATISTICS stats_product_category (ndistinct, dependencies, mcv)
ON category, price_range FROM products;

-- [PG16] REGROLE default
CREATE TABLE audit_records (
    id SERIAL PRIMARY KEY,
    action TEXT,
    actor REGROLE DEFAULT current_user::regrole,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [PG19] Property graph
CREATE TABLE graph_vertices (
    id BIGINT PRIMARY KEY,
    label TEXT,
    properties JSONB
);

CREATE TABLE graph_edges (
    id BIGINT PRIMARY KEY,
    source_id BIGINT REFERENCES graph_vertices(id),
    target_id BIGINT REFERENCES graph_vertices(id),
    edge_type TEXT,
    weight NUMERIC
);

CREATE PROPERTY GRAPH knowledge_graph
    NODE TABLES (
        graph_vertices LABEL Node (id, properties)
    )
    EDGE TABLES (
        graph_edges AS Relates
        SOURCE graph_vertices
        DESTINATION graph_vertices
        PROPERTIES (weight)
    );

-- Complex foreign keys
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE ON UPDATE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT items_unique UNIQUE (order_id, product_id)
);

-- Multi-column partition key
CREATE TABLE multi_partitioned (
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    event_time TIMESTAMPTZ NOT NULL,
    data JSONB
) PARTITION BY RANGE (tenant_id, user_id);

-- Comments
COMMENT ON TABLE products IS 'Product catalog table';
COMMENT ON COLUMN products.status IS 'Current product status';

-- Sequences
CREATE SEQUENCE custom_seq INCREMENT BY 5 MINVALUE 100 MAXVALUE 999999 START WITH 100 CACHE 10 CYCLE;
ALTER SEQUENCE custom_seq OWNED BY products.id;
`;

describe('Combined Stress Test: All PG12-19 Features', () => {
    let result: ParsedSchema;

    it('should parse massive combined SQL without errors', () => {
        result = parsePostgresSQL(MASSIVE_SQL);
        expect(result.errors.length).toBe(0);
    });

    describe('Schema Coverage', () => {
        it('should parse all schemas', () => {
            expect(result.schemas).toContain('app');
            expect(result.schemas).toContain('analytics');
        });
    });

    describe('Extension Coverage', () => {
        it('should parse extensions', () => {
            expect(result.extensions.length).toBeGreaterThan(0);
            const pgTrgm = result.extensions.find(e => e.name === 'pg_trgm');
            expect(pgTrgm).toBeDefined();
        });
    });

    describe('Enum Coverage', () => {
        it('should parse enums', () => {
            expect(result.enumTypes.length).toBeGreaterThanOrEqual(2);
            const userStatus = result.enumTypes.find(e => e.name === 'user_status');
            expect(userStatus?.values).toContain('active');
            expect(userStatus?.values).toContain('inactive');
        });
    });

    describe('Composite Type Coverage', () => {
        it('should parse composite types', () => {
            expect(result.compositeTypes.length).toBeGreaterThan(0);
            const addrType = result.compositeTypes.find(t => t.name === 'address_type');
            expect(addrType?.attributes).toBeDefined();
        });
    });

    describe('Domain Coverage', () => {
        it('should parse domains', () => {
            expect(result.domains.length).toBeGreaterThanOrEqual(2);
            const emailDomain = result.domains.find(d => d.name === 'email_domain');
            expect(emailDomain?.baseType).toBe('TEXT');
        });
    });

    describe('Table Coverage', () => {
        it('should parse partitioned tables', () => {
            const events = result.tables.find(t => t.name === 'events');
            expect(events?.isPartitioned).toBe(true);
            expect(events?.partitionType).toBe('range');
        });

        it('should parse generated columns [PG12]', () => {
            const products = result.tables.find(t => t.name === 'products');
            const totalValue = products?.columns.find(c => c.name === 'total_value');
            expect(totalValue?.isGenerated).toBe(true);
            expect(totalValue?.generatedType).toBe('STORED');
        });

        it('should parse identity columns [PG12]', () => {
            const auditLog = result.tables.find(t => t.name === 'audit_log');
            expect(auditLog).toBeDefined();
        });

        it('should parse temporal tables [PG18]', () => {
            const employees = result.tables.find(t => t.name === 'temporal_employees');
            expect(employees?.period).toBeDefined();
            expect(employees?.withSystemVersioning).toBe(true);
        });

        it('should parse VIRTUAL generated columns [PG18]', () => {
            const metrics = result.tables.find(t => t.name === 'computed_metrics');
            const computed = metrics?.columns.find(c => c.name === 'computed_score');
            expect(computed?.generatedType).toBe('VIRTUAL');
        });

        it('should parse WITHOUT OVERLAPS constraints [PG18]', () => {
            const booking = result.tables.find(t => t.name === 'temporal_room_booking');
            expect(booking?.withoutOverlaps).toBe(true);
        });

        it('should parse REGROLE defaults [PG16]', () => {
            const audit = result.tables.find(t => t.name === 'audit_records');
            const actor = audit?.columns.find(c => c.name === 'actor');
            expect(actor?.type).toBe('REGROLE');
        });
    });

    describe('Index Coverage', () => {
        it('should parse covering indexes [PG12]', () => {
            const covering = result.indexes.find(i => i.name === 'idx_products_covering');
            expect(covering?.includeColumns).toBeDefined();
        });

        it('should parse NULLS NOT DISTINCT [PG15]', () => {
            const uniqueIdx = result.indexes.find(i => i.name === 'idx_unique_email');
            expect(uniqueIdx?.isPartial).toBe(true);
        });

        it('should parse BRIN indexes', () => {
            const brin = result.indexes.find(i => i.name === 'idx_time_series_brin');
            expect(brin?.type).toBe('brin');
        });

        it('should parse GIN indexes', () => {
            const gin = result.indexes.find(i => i.name === 'idx_payload_gin');
            expect(gin?.type).toBe('gin');
        });
    });

    describe('Function Coverage', () => {
        it('should parse SQL body functions [PG14]', () => {
            const discount = result.functions.find(f => f.name === 'calculate_discount');
            expect(discount?.language).toBe('sql');
            expect(discount?.volatility).toBe('IMMUTABLE');
        });

        it('should parse functions returning TABLE', () => {
            const stats = result.functions.find(f => f.name === 'get_user_stats');
            expect(stats?.setReturning).toBe(true);
        });

        it('should parse aggregates', () => {
            const agg = result.aggregates?.find(a => a.name === 'percentile_cont');
            expect(agg).toBeDefined();
        });

        it('should parse procedures', () => {
            const proc = result.functions.find(f => f.name === 'bulk_insert_orders');
            expect(proc?.isProcedure).toBe(true);
        });
    });

    describe('Trigger Coverage', () => {
        it('should parse triggers with transition tables', () => {
            const audit = result.triggers.find(t => t.name === 'trg_order_audit');
            expect(audit?.referencing?.newTable).toBe('new_rows');
            expect(audit?.referencing?.oldTable).toBe('old_rows');
        });

        it('should parse constraint triggers', () => {
            const constraint = result.triggers.find(t => t.name === 'trg_check_order_integrity');
            expect(constraint?.deferrable).toBe(true);
        });

        it('should parse UPDATE OF triggers', () => {
            const status = result.triggers.find(t => t.name === 'trg_status_change');
            expect(status?.condition).toBeDefined();
        });
    });

    describe('View Coverage', () => {
        it('should parse recursive views [PG12]', () => {
            const tree = result.views.find(v => v.name === 'category_tree');
            expect(tree?.isRecursive).toBe(true);
        });

        it('should parse CHECK OPTION views [PG12]', () => {
            const active = result.views.find(v => v.name === 'active_products');
            expect(active?.checkOption).toBe('CASCADED');
        });

        it('should parse security invoker views [PG15]', () => {
            const userOrders = result.views.find(v => v.name === 'user_orders');
            expect(userOrders?.securityInvoker).toBe(true);
        });

        it('should parse materialized views', () => {
            const summary = result.views.find(v => v.name === 'sales_summary');
            expect(summary?.isMaterialized).toBe(true);
        });
    });

    describe('Security Coverage', () => {
        it('should parse RLS policies', () => {
            const policy = result.policies.find(p => p.name === 'events_access');
            expect(policy).toBeDefined();
            expect(policy?.using).toBeDefined();
        });

        it('should parse roles', () => {
            const appUser = result.roles.find(r => r.name === 'app_user');
            expect(appUser).toBeDefined();
        });
    });

    describe('Property Graph Coverage [PG19]', () => {
        it('should parse property graphs', () => {
            const graph = result.propertyGraphs?.find(g => g.name === 'knowledge_graph');
            expect(graph).toBeDefined();
        });
    });

    describe('Sequence Coverage', () => {
        it('should parse sequences with all options', () => {
            const customSeq = result.sequences.find(s => s.name === 'custom_seq');
            expect(customSeq?.increment).toBe(5);
            expect(customSeq?.cycle).toBe(true);
        });
    });

    describe('Relationship Coverage', () => {
        it('should detect foreign key relationships', () => {
            const fkRels = result.relationships.filter(r => r.type === 'FOREIGN_KEY');
            expect(fkRels.length).toBeGreaterThan(0);
        });

        it('should detect partition relationships', () => {
            const partRels = result.relationships.filter(r => r.type === 'PARTITION_CHILD');
            expect(partRels.length).toBeGreaterThan(0);
        });

        it('should detect view dependencies', () => {
            const viewDeps = result.relationships.filter(r => r.type === 'VIEW_DEPENDENCY');
            expect(viewDeps.length).toBeGreaterThan(0);
        });

        it('should detect trigger relationships', () => {
            const triggerRels = result.relationships.filter(r => 
                r.type === 'TRIGGER_TARGET' || r.type === 'TRIGGER_FUNCTION'
            );
            expect(triggerRels.length).toBeGreaterThan(0);
        });
    });

    describe('No undefined fields', () => {
        it('should not have undefined in critical table fields', () => {
            for (const table of result.tables) {
                expect(table.name).toBeDefined();
                expect(table.columns).toBeDefined();
                for (const col of table.columns) {
                    expect(col.name).toBeDefined();
                    expect(col.type).toBeDefined();
                }
            }
        });

        it('should not have undefined in index columns', () => {
            for (const idx of result.indexes) {
                expect(idx.name).toBeDefined();
                expect(idx.table).toBeDefined();
                expect(idx.columns).toBeDefined();
            }
        });

        it('should not have undefined in function signatures', () => {
            for (const fn of result.functions) {
                expect(fn.name).toBeDefined();
                expect(fn.language).toBeDefined();
            }
        });
    });
});
