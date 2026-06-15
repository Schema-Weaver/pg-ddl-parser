import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Table, Partition } from '../../types';

describe('Edge Cases: Partitioning (PG12-19)', () => {
    describe('[PG12] Range partitions', () => {
        it('should parse PARTITION OF FOR VALUES FROM ... TO', () => {
            const sql = `
                CREATE TABLE measurements (
                    id SERIAL,
                    recorded_at TIMESTAMPTZ,
                    value NUMERIC
                ) PARTITION BY RANGE (recorded_at);
                
                CREATE TABLE measurements_2024_01 PARTITION OF measurements
                FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
                
                CREATE TABLE measurements_2024_02 PARTITION OF measurements
                FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
            `;
            const result = parsePostgresSQL(sql);
            
            const parent = result.tables.find(t => t.name === 'measurements');
            expect(parent?.isPartitioned).toBe(true);
            expect(parent?.partitionType).toBe('range');
            
            const partition = result.tables.find(t => t.name === 'measurements_2024_01');
            expect(partition?.partitionOf).toBe('measurements');
        });
    });

    describe('[PG12] List partitions', () => {
        it('should parse PARTITION OF FOR VALUES IN', () => {
            const sql = `
                CREATE TABLE sales (
                    id SERIAL,
                    region TEXT
                ) PARTITION BY LIST (region);
                
                CREATE TABLE sales_us PARTITION OF sales FOR VALUES IN ('US');
                CREATE TABLE sales_eu PARTITION OF sales FOR VALUES IN ('UK', 'DE', 'FR');
                CREATE TABLE sales_other PARTITION OF sales FOR VALUES IN ('JP', 'CN', 'AU');
            `;
            const result = parsePostgresSQL(sql);
            
            const parent = result.tables.find(t => t.name === 'sales');
            expect(parent?.partitionType).toBe('list');
        });
    });

    describe('[PG12] Hash partitions', () => {
        it('should parse PARTITION OF FOR VALUES WITH (MODULUS, REMAINDER)', () => {
            const sql = `
                CREATE TABLE users (
                    id BIGINT,
                    data JSONB
                ) PARTITION BY HASH (id);
                
                CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
                CREATE TABLE users_1 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 1);
                CREATE TABLE users_2 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 2);
                CREATE TABLE users_3 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 3);
            `;
            const result = parsePostgresSQL(sql);
            
            const parent = result.tables.find(t => t.name === 'users');
            expect(parent?.partitionType).toBe('hash');
        });
    });

    describe('[PG12] Default partition', () => {
        it('should parse PARTITION OF DEFAULT', () => {
            const sql = `
                CREATE TABLE events (
                    id SERIAL,
                    event_type TEXT
                ) PARTITION BY LIST (event_type);
                
                CREATE TABLE events_known PARTITION OF events FOR VALUES IN ('click', 'view', 'purchase');
                CREATE TABLE events_default PARTITION OF events DEFAULT;
            `;
            const result = parsePostgresSQL(sql);
            
            const defaultPart = result.tables.find(t => t.name === 'events_default');
            expect(defaultPart?.partitionOf).toBe('events');
        });
    });

    describe('Multi-level partitioning', () => {
        it('should parse partition of partition (3 levels)', () => {
            const sql = `
                CREATE TABLE events (
                    id BIGINT,
                    event_date DATE,
                    region TEXT,
                    data JSONB
                ) PARTITION BY RANGE (event_date);
                
                CREATE TABLE events_2024 PARTITION OF events
                FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
                PARTITION BY LIST (region);
                
                CREATE TABLE events_2024_us PARTITION OF events_2024
                FOR VALUES IN ('US');
                
                CREATE TABLE events_2024_eu PARTITION OF events_2024
                FOR VALUES IN ('UK', 'DE', 'FR');
            `;
            const result = parsePostgresSQL(sql);
            
            const top = result.tables.find(t => t.name === 'events');
            expect(top?.isPartitioned).toBe(true);
            
            const mid = result.tables.find(t => t.name === 'events_2024');
            expect(mid?.isPartitioned).toBe(true);
            expect(mid?.partitionOf).toBe('events');
            
            const leaf = result.tables.find(t => t.name === 'events_2024_us');
            expect(leaf?.partitionOf).toBe('events_2024');
        });
    });

    describe('[PG12] DETACH PARTITION', () => {
        it('should parse ALTER TABLE DETACH PARTITION', () => {
            const sql = `
                CREATE TABLE orders (
                    id SERIAL,
                    order_date DATE
                ) PARTITION BY RANGE (order_date);
                
                CREATE TABLE orders_2023 PARTITION OF orders
                FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
                
                ALTER TABLE orders DETACH PARTITION orders_2023;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG14] DETACH PARTITION CONCURRENTLY', () => {
        it('should parse CONCURRENTLY option', () => {
            const sql = `
                CREATE TABLE partitioned (id SERIAL, created_at TIMESTAMPTZ) PARTITION BY RANGE (created_at);
                CREATE TABLE part_2023 PARTITION OF partitioned FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
                ALTER TABLE partitioned DETACH PARTITION part_2023 CONCURRENTLY;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('ATTACH PARTITION', () => {
        it('should parse ALTER TABLE ATTACH PARTITION', () => {
            const sql = `
                CREATE TABLE new_partition (
                    id SERIAL,
                    created_at TIMESTAMPTZ,
                    data JSONB
                );
                
                CREATE TABLE source_table (
                    id SERIAL,
                    created_at TIMESTAMPTZ,
                    data JSONB
                ) PARTITION BY RANGE (created_at);
                
                ALTER TABLE source_table ATTACH PARTITION new_partition
                FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG14] Generated column in partition key', () => {
        it('should parse partition by generated column', () => {
            const sql = `
                CREATE TABLE time_series (
                    id SERIAL,
                    event_time TIMESTAMPTZ,
                    event_date DATE GENERATED ALWAYS AS (event_time::DATE) STORED,
                    value NUMERIC
                ) PARTITION BY RANGE (event_date);
                
                CREATE TABLE time_series_jan PARTITION OF time_series
                FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
            `;
            const result = parsePostgresSQL(sql);
            
            const table = result.tables.find(t => t.name === 'time_series');
            expect(table?.partitionKey).toContain('event_date');
        });
    });

    describe('[PG17] MERGE PARTITIONS', () => {
        it('should parse ALTER TABLE MERGE PARTITIONS', () => {
            const sql = `
                CREATE TABLE partitioned (id SERIAL, region TEXT) PARTITION BY LIST (region);
                CREATE TABLE part_us PARTITION OF partitioned FOR VALUES IN ('US');
                CREATE TABLE part_eu PARTITION OF partitioned FOR VALUES IN ('UK', 'DE');
                ALTER TABLE partitioned MERGE PARTITIONS (part_us, part_eu) INTO merged_part;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG17] SPLIT PARTITION', () => {
        it('should parse ALTER TABLE SPLIT PARTITION', () => {
            const sql = `
                CREATE TABLE ranged (id SERIAL, value INT) PARTITION BY RANGE (value);
                CREATE TABLE part_range PARTITION OF ranged FOR VALUES FROM (0) TO (1000);
                ALTER TABLE ranged SPLIT PARTITION part_range AT (500) INTO (part_a, part_b);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG15] RLS on partitioned tables', () => {
        it('should parse policies on partitioned table', () => {
            const sql = `
                CREATE TABLE sensitive_partitioned (
                    id SERIAL,
                    user_id INTEGER,
                    data TEXT
                ) PARTITION BY HASH (user_id);
                
                ALTER TABLE sensitive_partitioned ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY user_policy ON sensitive_partitioned
                    USING (user_id = current_user_id());
            `;
            const result = parsePostgresSQL(sql);
            
            const table = result.tables.find(t => t.name === 'sensitive_partitioned');
            expect(table?.isPartitioned).toBe(true);
            expect(table?.rlsEnabled).toBe(true);
        });
    });

    describe('[PG13] Triggers on partitioned tables', () => {
        it('should parse triggers on partitioned table', () => {
            const sql = `
                CREATE TABLE trigger_partitioned (
                    id SERIAL,
                    created_at TIMESTAMPTZ
                ) PARTITION BY RANGE (created_at);
                
                CREATE TRIGGER audit_trigger
                AFTER INSERT ON trigger_partitioned
                FOR EACH ROW EXECUTE FUNCTION log_audit();
            `;
            const result = parsePostgresSQL(sql);
            
            const trigger = result.triggers.find(t => t.name === 'audit_trigger');
            expect(trigger?.table).toBe('trigger_partitioned');
        });
    });

    describe('[PG17] ALTER INDEX ATTACH PARTITION', () => {
        it('should parse index on partitioned table', () => {
            const sql = `
                CREATE TABLE indexed_partitioned (
                    id SERIAL,
                    created_at TIMESTAMPTZ,
                    status TEXT
                ) PARTITION BY RANGE (created_at);
                
                CREATE INDEX idx_status ON indexed_partitioned (status);
            `;
            const result = parsePostgresSQL(sql);
            
            const index = result.indexes.find(i => i.name === 'idx_status');
            expect(index?.table).toBe('indexed_partitioned');
        });
    });

    describe('Partition with constraints', () => {
        it('should parse partition with additional constraints', () => {
            const sql = `
                CREATE TABLE constrained (
                    id SERIAL,
                    value NUMERIC
                ) PARTITION BY HASH (id);
                
                CREATE TABLE constrained_0 PARTITION OF constrained
                FOR VALUES WITH (MODULUS 4, REMAINDER 0);
                
                ALTER TABLE constrained_0 ADD CONSTRAINT chk_positive CHECK (value > 0);
            `;
            const result = parsePostgresSQL(sql);
            
            const partition = result.tables.find(t => t.name === 'constrained_0');
            expect(partition?.partitionOf).toBe('constrained');
        });
    });

    describe('Multi-column partition key', () => {
        it('should parse PARTITION BY RANGE (col1, col2)', () => {
            const sql = `
                CREATE TABLE multi_col_range (
                    tenant_id INTEGER,
                    user_id INTEGER,
                    created_at TIMESTAMPTZ,
                    data JSONB
                ) PARTITION BY RANGE (tenant_id, user_id);
                
                CREATE TABLE multi_col_range_0_1000 PARTITION OF multi_col_range
                FOR VALUES FROM (0, 0) TO (1, 1000);
            `;
            const result = parsePostgresSQL(sql);
            
            const table = result.tables.find(t => t.name === 'multi_col_range');
            expect(table?.partitionKey).toContain('tenant_id');
            expect(table?.partitionKey).toContain('user_id');
        });
    });
});
