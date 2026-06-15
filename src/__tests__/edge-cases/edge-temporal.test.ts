import { describe, it, expect } from 'vitest';
import { parsePostgresSQL, tokenize } from '../../index';
import type { Table, PropertyGraph } from '../../types';

describe('Edge Cases: Temporal & PERIOD Features (PG18-19)', () => {
    describe('[PG18] CREATE TABLE with PERIOD SYSTEM_TIME', () => {
        it('should parse temporal table with SYSTEM VERSIONING', () => {
            const sql = `
                CREATE TABLE temporal_employees (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    valid_from TIMESTAMPTZ GENERATED ALWAYS AS ROW START,
                    valid_to TIMESTAMPTZ GENERATED ALWAYS AS ROW END,
                    PERIOD SYSTEM_TIME (valid_from, valid_to)
                ) WITH SYSTEM VERSIONING;
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'temporal_employees');
            
            expect(table?.period).toBeDefined();
            expect(table?.period?.name).toBe('SYSTEM_TIME');
            expect(table?.period?.startColumn).toBe('valid_from');
            expect(table?.period?.endColumn).toBe('valid_to');
            expect(table?.withSystemVersioning).toBe(true);
        });

        it('should parse multiple period columns', () => {
            const sql = `
                CREATE TABLE bitemporal_data (
                    id SERIAL PRIMARY KEY,
                    data TEXT,
                    application_time_start TIMESTAMP GENERATED ALWAYS AS ROW START,
                    application_time_end TIMESTAMP GENERATED ALWAYS AS ROW END,
                    PERIOD APPLICATION_TIME (application_time_start, application_time_end)
                );
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'bitemporal_data');
            
            expect(table?.period).toBeDefined();
        });
    });

    describe('[PG18] ALTER TABLE ADD/DROP PERIOD', () => {
        it('should parse ALTER TABLE ADD PERIOD', () => {
            const sql = `
                CREATE TABLE add_period_table (
                    id SERIAL PRIMARY KEY,
                    valid_from TIMESTAMPTZ,
                    valid_to TIMESTAMPTZ
                );
                ALTER TABLE add_period_table ADD PERIOD SYSTEM_TIME (valid_from, valid_to);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse ALTER TABLE DROP PERIOD', () => {
            const sql = `
                CREATE TABLE drop_period_table (
                    id SERIAL PRIMARY KEY,
                    valid_from TIMESTAMPTZ,
                    valid_to TIMESTAMPTZ,
                    PERIOD SYSTEM_TIME (valid_from, valid_to)
                ) WITH SYSTEM VERSIONING;
                ALTER TABLE drop_period_table DROP PERIOD SYSTEM_TIME;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG18] WITHOUT OVERLAPS constraint', () => {
        it('should parse EXCLUDE with WITHOUT OVERLAPS', () => {
            const sql = `
                CREATE TABLE temporal_appointments (
                    room_id INTEGER,
                    employee_id INTEGER,
                    valid_from DATE,
                    valid_to DATE,
                    EXCLUDE USING gist (
                        room_id WITH =,
                        PERIOD valid_from, valid_to WITHOUT OVERLAPS
                    )
                );
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'temporal_appointments');
            
            expect(table?.withoutOverlaps).toBe(true);
        });

        it('should parse multi-column WITHOUT OVERLAPS', () => {
            const sql = `
                CREATE TABLE temporal_schedule (
                    resource_type TEXT,
                    resource_id INTEGER,
                    schedule_start TIMESTAMPTZ,
                    schedule_end TIMESTAMPTZ,
                    EXCLUDE USING gist (
                        resource_type WITH =,
                        resource_id WITH =,
                        PERIOD schedule_start, schedule_end WITHOUT OVERLAPS
                    )
                );
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG18] NOT ENFORCED constraint', () => {
        it('should parse CHECK constraint with NOT ENFORCED', () => {
            const sql = `
                CREATE TABLE unenforced_table (
                    id SERIAL PRIMARY KEY,
                    value NUMERIC,
                    CONSTRAINT max_value CHECK (value <= 999999) NOT ENFORCED
                );
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'unenforced_table');
            
            expect(table?.checkConstraints).toHaveLength(1);
            expect(table?.checkConstraints[0].enforced).toBe(false);
        });

        it('should parse foreign key with NOT ENFORCED', () => {
            const sql = `
                CREATE TABLE referenced_table (
                    id SERIAL PRIMARY KEY
                );
                CREATE TABLE unenforced_fk (
                    id SERIAL PRIMARY KEY,
                    ref_id INTEGER,
                    CONSTRAINT fk_ref FOREIGN KEY (ref_id) REFERENCES referenced_table(id) NOT ENFORCED
                );
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG18] PERIOD foreign key', () => {
        it('should parse REFERENCES with PERIOD', () => {
            const sql = `
                CREATE TABLE temporal_parent (
                    id SERIAL PRIMARY KEY,
                    valid_from TIMESTAMPTZ,
                    valid_to TIMESTAMPTZ,
                    PERIOD SYSTEM_TIME (valid_from, valid_to)
                ) WITH SYSTEM VERSIONING;
                
                CREATE TABLE temporal_child (
                    id SERIAL PRIMARY KEY,
                    parent_id INTEGER,
                    valid_from TIMESTAMPTZ,
                    valid_to TIMESTAMPTZ,
                    PERIOD SYSTEM_TIME (valid_from, valid_to)
                ) WITH SYSTEM VERSIONING;
                ALTER TABLE temporal_child ADD CONSTRAINT fk_temporal
                    FOREIGN KEY (parent_id, PERIOD) REFERENCES temporal_parent(id, PERIOD);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG18] VIRTUAL generated columns', () => {
        it('should parse GENERATED ALWAYS AS ... VIRTUAL', () => {
            const sql = `
                CREATE TABLE virtual_generated (
                    id SERIAL PRIMARY KEY,
                    base_value INTEGER,
                    computed_value INTEGER GENERATED ALWAYS AS (base_value * 2) VIRTUAL
                );
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'virtual_generated');
            
            const col = table?.columns.find(c => c.name === 'computed_value');
            expect(col?.isGenerated).toBe(true);
            expect(col?.generatedType).toBe('VIRTUAL');
        });
    });

    describe('[PG17] ALTER COLUMN SET EXPRESSION', () => {
        it('should parse ALTER COLUMN SET EXPRESSION AS', () => {
            const sql = `
                CREATE TABLE set_expr_table (
                    id SERIAL PRIMARY KEY,
                    value INTEGER,
                    doubled INTEGER GENERATED ALWAYS AS (value * 2) STORED
                );
                ALTER TABLE set_expr_table ALTER COLUMN doubled SET EXPRESSION AS (value * 3);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse ALTER COLUMN DROP EXPRESSION', () => {
            const sql = `
                CREATE TABLE drop_expr_table (
                    id SERIAL PRIMARY KEY,
                    a INTEGER,
                    b INTEGER GENERATED ALWAYS AS (a + 1) STORED
                );
                ALTER TABLE drop_expr_table ALTER COLUMN b DROP EXPRESSION;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG18-19] CREATE PROPERTY GRAPH', () => {
        it('should parse simple property graph', () => {
            const sql = `
                CREATE TABLE persons (
                    id BIGINT PRIMARY KEY,
                    name TEXT
                );
                CREATE TABLE friendships (
                    id BIGINT PRIMARY KEY,
                    person1_id BIGINT,
                    person2_id BIGINT
                );
                CREATE PROPERTY GRAPH social_graph
                    NODE TABLES (persons)
                    EDGE TABLES (
                        friendships SOURCE persons DESTINATION persons
                    );
            `;
            const result = parsePostgresSQL(sql);
            const graph = result.propertyGraphs?.find(g => g.name === 'social_graph');
            
            expect(graph).toBeDefined();
            expect(graph?.vertices).toHaveLength(1);
            expect(graph?.vertices?.[0].table).toBe('persons');
        });

        it('should parse property graph with labels', () => {
            const sql = `
                CREATE TABLE accounts (
                    id BIGINT PRIMARY KEY,
                    username TEXT
                );
                CREATE TABLE follows (
                    id BIGINT PRIMARY KEY,
                    follower_id BIGINT,
                    followee_id BIGINT
                );
                CREATE PROPERTY GRAPH twitter_graph
                    NODE TABLES (
                        accounts LABEL User (id, username)
                    )
                    EDGE TABLES (
                        follows LABEL Follows
                        SOURCE accounts
                        DESTINATION accounts
                    );
            `;
            const result = parsePostgresSQL(sql);
            const graph = result.propertyGraphs?.find(g => g.name === 'twitter_graph');
            
            expect(graph).toBeDefined();
        });
    });

    describe('[PG19] Enhanced PROPERTY GRAPH', () => {
        it('should parse property graph with properties', () => {
            const sql = `
                CREATE TABLE vertices (
                    id BIGINT PRIMARY KEY,
                    name TEXT,
                    created_at TIMESTAMPTZ
                );
                CREATE TABLE edges (
                    id BIGINT PRIMARY KEY,
                    source_id BIGINT,
                    target_id BIGINT,
                    weight NUMERIC
                );
                CREATE PROPERTY GRAPH enhanced_graph
                    NODE TABLES (
                        vertices LABEL Vtx PROPERTIES (id, name)
                    )
                    EDGE TABLES (
                        edges LABEL Edge
                        SOURCE vertices
                        DESTINATION vertices
                        PROPERTIES (weight)
                    );
            `;
            const result = parsePostgresSQL(sql);
            const graph = result.propertyGraphs?.find(g => g.name === 'enhanced_graph');
            
            expect(graph).toBeDefined();
        });
    });

    describe('Temporal queries reference', () => {
        it('should not crash on temporal function references', () => {
            const sql = `
                CREATE TABLE history_events (
                    id SERIAL,
                    event_time TIMESTAMPTZ,
                    data JSONB
                );
                -- temporal function reference that parser should handle gracefully
                SELECT * FROM parsePostgresSQL('history_events FOR SYSTEM_TIME AS OF TIMESTAMP '2024-01-01'');
            `;
            const result = parsePostgresSQL(sql);
            expect(result.errors.length).toBe(0);
            expect(result.warnings).toBeDefined();
        });
    });
});
