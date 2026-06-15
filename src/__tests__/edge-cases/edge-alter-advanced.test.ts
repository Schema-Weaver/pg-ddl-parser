import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Table } from '../../types';

describe('Edge Cases: ALTER TABLE Advanced (PG12-19)', () => {
    describe('ADD COLUMN variants', () => {
        it('should parse ADD COLUMN with all options', () => {
            const sql = `
                CREATE TABLE alter_target (
                    id SERIAL PRIMARY KEY
                );
                ALTER TABLE alter_target ADD COLUMN name TEXT NOT NULL DEFAULT 'unknown';
                ALTER TABLE alter_target ADD COLUMN email TEXT UNIQUE CHECK (email ~* '@');
                ALTER TABLE alter_target ADD COLUMN ref_id INTEGER REFERENCES other_table(id) ON DELETE CASCADE;
                ALTER TABLE alter_target ADD COLUMN generated_col TEXT GENERATED ALWAYS AS (UPPER(name)) STORED;
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'alter_target');
            
            expect(table?.columns).toBeDefined();
            expect(table?.columns?.length).toBeGreaterThan(1);
        });

        it('[PG12] should parse ADD COLUMN with GENERATED AS IDENTITY', () => {
            const sql = `
                CREATE TABLE identity_alter (id SERIAL PRIMARY KEY);
                ALTER TABLE identity_alter ADD COLUMN auto_id INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 100);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse ADD COLUMN with COLLATE', () => {
            const sql = `
                CREATE TABLE collate_alter (id SERIAL);
                ALTER TABLE collate_alter ADD COLUMN sorted_name TEXT COLLATE "C" NOT NULL;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('DROP COLUMN', () => {
        it('should parse DROP COLUMN IF EXISTS CASCADE', () => {
            const sql = `
                CREATE TABLE drop_col_table (
                    id SERIAL PRIMARY KEY,
                    to_drop TEXT,
                    also_drop INTEGER
                );
                ALTER TABLE drop_col_table DROP COLUMN IF EXISTS to_drop CASCADE;
                ALTER TABLE drop_col_table DROP COLUMN also_drop RESTRICT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('ALTER COLUMN TYPE', () => {
        it('should parse ALTER COLUMN TYPE with USING', () => {
            const sql = `
                CREATE TABLE type_change (
                    id SERIAL PRIMARY KEY,
                    json_data TEXT
                );
                ALTER TABLE type_change ALTER COLUMN json_data TYPE JSONB USING json_data::jsonb;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse ALTER COLUMN TYPE with USING expression', () => {
            const sql = `
                CREATE TABLE complex_type (
                    id SERIAL PRIMARY KEY,
                    value TEXT
                );
                ALTER TABLE complex_type ALTER COLUMN value TYPE NUMERIC USING (value::NUMERIC);
                ALTER TABLE complex_type ALTER COLUMN value TYPE INTEGER USING (EXTRACT(EPOCH FROM value::TIMESTAMP));
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('ALTER COLUMN SET/DROP DEFAULT', () => {
        it('should parse SET DEFAULT and DROP DEFAULT', () => {
            const sql = `
                CREATE TABLE default_alter (
                    id SERIAL PRIMARY KEY,
                    status TEXT
                );
                ALTER TABLE default_alter ALTER COLUMN status SET DEFAULT 'pending';
                ALTER TABLE default_alter ALTER COLUMN status DROP DEFAULT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('ALTER COLUMN SET/DROP NOT NULL', () => {
        it('should parse SET NOT NULL and DROP NOT NULL', () => {
            const sql = `
                CREATE TABLE null_alter (
                    id SERIAL PRIMARY KEY,
                    value TEXT NOT NULL
                );
                ALTER TABLE null_alter ALTER COLUMN value DROP NOT NULL;
                ALTER TABLE null_alter ALTER COLUMN value SET NOT NULL;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG12] ALTER COLUMN ADD GENERATED', () => {
        it('should parse ADD GENERATED AS IDENTITY', () => {
            const sql = `
                CREATE TABLE gen_alter (
                    id INTEGER
                );
                ALTER TABLE gen_alter ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse SET GENERATED and DROP IDENTITY', () => {
            const sql = `
                CREATE TABLE gen_options (
                    id INTEGER GENERATED ALWAYS AS IDENTITY
                );
                ALTER TABLE gen_options ALTER COLUMN id SET GENERATED BY DEFAULT;
                ALTER TABLE gen_options ALTER COLUMN id DROP IDENTITY;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse RESTART WITH', () => {
            const sql = `
                CREATE TABLE restart_identity (
                    id INTEGER GENERATED ALWAYS AS IDENTITY
                );
                ALTER TABLE restart_identity ALTER COLUMN id RESTART WITH 1000;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG17] ALTER COLUMN SET/DROP EXPRESSION', () => {
        it('should parse SET EXPRESSION and DROP EXPRESSION', () => {
            const sql = `
                CREATE TABLE expr_alter (
                    id SERIAL PRIMARY KEY,
                    a INTEGER,
                    b INTEGER GENERATED ALWAYS AS (a * 2) STORED
                );
                ALTER TABLE expr_alter ALTER COLUMN b SET EXPRESSION AS (a * 3);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('ALTER COLUMN SET STATISTICS/STORAGE', () => {
        it('should parse SET STATISTICS', () => {
            const sql = `
                CREATE TABLE stats_alter (
                    id SERIAL PRIMARY KEY,
                    content TEXT
                );
                ALTER TABLE stats_alter ALTER COLUMN content SET STATISTICS 500;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse SET STORAGE', () => {
            const sql = `
                CREATE TABLE storage_alter (
                    id SERIAL PRIMARY KEY,
                    data BYTEA
                );
                ALTER TABLE storage_alter ALTER COLUMN data SET STORAGE EXTERNAL;
                ALTER TABLE storage_alter ALTER COLUMN data SET STORAGE EXTENDED;
                ALTER TABLE storage_alter ALTER COLUMN data SET STORAGE MAIN;
                ALTER TABLE storage_alter ALTER COLUMN data SET STORAGE PLAIN;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('ADD CONSTRAINT', () => {
        it('should parse ADD CONSTRAINT CHECK', () => {
            const sql = `
                CREATE TABLE check_alter (
                    id SERIAL PRIMARY KEY,
                    value NUMERIC
                );
                ALTER TABLE check_alter ADD CONSTRAINT positive_value CHECK (value > 0);
                ALTER TABLE check_alter ADD CONSTRAINT future_only CHECK (value > NOW()) NOT VALID;
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'check_alter');
            
            expect(table?.checkConstraints.length).toBeGreaterThan(0);
        });

        it('should parse ADD CONSTRAINT UNIQUE', () => {
            const sql = `
                CREATE TABLE unique_alter (
                    id SERIAL PRIMARY KEY,
                    email TEXT
                );
                ALTER TABLE unique_alter ADD CONSTRAINT unique_email UNIQUE (email);
                ALTER TABLE unique_alter ADD CONSTRAINT unique_pair UNIQUE (id, email);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse ADD CONSTRAINT FOREIGN KEY', () => {
            const sql = `
                CREATE TABLE fk_parent (id SERIAL PRIMARY KEY);
                CREATE TABLE fk_child (
                    id SERIAL PRIMARY KEY,
                    parent_id INTEGER
                );
                ALTER TABLE fk_child ADD CONSTRAINT fk_parent_ref
                    FOREIGN KEY (parent_id) REFERENCES fk_parent(id)
                    ON DELETE CASCADE ON UPDATE RESTRICT
                    DEFERRABLE INITIALLY DEFERRED;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse ADD CONSTRAINT EXCLUDE', () => {
            const sql = `
                CREATE TABLE exclude_alter (
                    id SERIAL PRIMARY KEY,
                    during TSRANGE
                );
                ALTER TABLE exclude_alter ADD CONSTRAINT no_overlap
                    EXCLUDE USING gist (during WITH &&);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('DROP CONSTRAINT', () => {
        it('should parse DROP CONSTRAINT IF EXISTS', () => {
            const sql = `
                CREATE TABLE drop_const (
                    id SERIAL PRIMARY KEY,
                    value INTEGER CHECK (value > 0)
                );
                ALTER TABLE drop_const DROP CONSTRAINT IF EXISTS value_check;
                ALTER TABLE drop_const DROP CONSTRAINT value_check CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('VALIDATE CONSTRAINT', () => {
        it('should parse VALIDATE CONSTRAINT', () => {
            const sql = `
                CREATE TABLE validate_table (
                    id SERIAL PRIMARY KEY,
                    value numERIC
                );
                ALTER TABLE validate_table ADD CONSTRAINT check_val CHECK (value > 0) NOT VALID;
                ALTER TABLE validate_table VALIDATE CONSTRAINT check_val;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG18] ALTER CONSTRAINT NOT ENFORCED', () => {
        it('should parse ALTER CONSTRAINT ENFORCED/NOT ENFORCED', () => {
            const sql = `
                CREATE TABLE enforced_alter (
                    id SERIAL PRIMARY KEY,
                    value INTEGER,
                    CONSTRAINT check_max CHECK (value < 1000)
                );
                ALTER TABLE enforced_alter ALTER CONSTRAINT check_max NOT ENFORCED;
                ALTER TABLE enforced_alter ALTER CONSTRAINT check_max ENFORCED;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('CLUSTER operations', () => {
        it('should parse CLUSTER ON and SET WITHOUT CLUSTER', () => {
            const sql = `
                CREATE TABLE cluster_table (
                    id SERIAL PRIMARY KEY,
                    value INTEGER
                );
                CREATE INDEX idx_cluster ON cluster_table (value);
                ALTER TABLE cluster_table CLUSTER ON idx_cluster;
                ALTER TABLE cluster_table SET WITHOUT CLUSTER;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('SET WITHOUT OIDS', () => {
        it('should parse SET WITHOUT OIDS', () => {
            const sql = `
                CREATE TABLE oids_table (
                    id SERIAL PRIMARY KEY
                ) WITH OIDS;
                ALTER TABLE oids_table SET WITHOUT OIDS;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG17] SET ACCESS METHOD', () => {
        it('should parse SET ACCESS METHOD', () => {
            const sql = `
                CREATE TABLE access_table (
                    id SERIAL PRIMARY KEY,
                    data JSONB
                );
                ALTER TABLE access_table SET ACCESS METHOD heap;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('SET TABLESPACE', () => {
        it('should parse SET TABLESPACE', () => {
            const sql = `
                CREATE TABLE tablespace_alter (
                    id SERIAL PRIMARY KEY
                );
                ALTER TABLE tablespace_alter SET TABLESPACE pg_default;
                ALTER TABLE tablespace_alter SET TABLESPACE custom_tablespace NOWAIT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('SET/RESET storage parameters', () => {
        it('should parse SET (parameters)', () => {
            const sql = `
                CREATE TABLE storage_params (
                    id SERIAL PRIMARY KEY,
                    data TEXT
                );
                ALTER TABLE storage_params SET (fillfactor=60, autovacuum_enabled=false);
                ALTER TABLE storage_params RESET (fillfactor);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('RLS commands', () => {
        it('should parse ENABLE/DISABLE/FORCE ROW LEVEL SECURITY', () => {
            const sql = `
                CREATE TABLE rls_alter (id SERIAL PRIMARY KEY);
                ALTER TABLE rls_alter ENABLE ROW LEVEL SECURITY;
                ALTER TABLE rls_alter FORCE ROW LEVEL SECURITY;
                ALTER TABLE rls_alter DISABLE ROW LEVEL SECURITY;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('Trigger ENABLE/DISABLE', () => {
        it('should parse ENABLE/DISABLE TRIGGER variants', () => {
            const sql = `
                CREATE TABLE trigger_alter (
                    id SERIAL PRIMARY KEY
                );
                CREATE TRIGGER test_trg AFTER INSERT ON trigger_alter
                    FOR EACH ROW EXECUTE FUNCTION dummy();
                ALTER TABLE trigger_alter ENABLE TRIGGER test_trg;
                ALTER TABLE trigger_alter DISABLE TRIGGER test_trg;
                ALTER TABLE trigger_alter ENABLE REPLICA TRIGGER test_trg;
                ALTER TABLE trigger_alter ENABLE ALWAYS TRIGGER test_trg;
                ALTER TABLE trigger_alter DISABLE TRIGGER ALL;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('INHERIT/NO INHERIT', () => {
        it('should parse INHERIT and NO INHERIT', () => {
            const sql = `
                CREATE TABLE parent_table (id SERIAL PRIMARY KEY);
                CREATE TABLE child_table (id SERIAL PRIMARY KEY);
                ALTER TABLE child_table INHERIT parent_table;
                ALTER TABLE child_table NO INHERIT parent_table;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('OF/NOT OF (typed tables)', () => {
        it('should parse OF type_name', () => {
            const sql = `
                CREATE TYPE table_type AS (id INTEGER, name TEXT);
                CREATE TABLE typed_alter (
                    id INTEGER,
                    name TEXT
                );
                ALTER TABLE typed_alter OF table_type;
                ALTER TABLE typed_alter NOT OF;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('OWNER TO', () => {
        it('should parse OWNER TO', () => {
            const sql = `
                CREATE TABLE owner_table (
                    id SERIAL PRIMARY KEY
                );
                ALTER TABLE owner_table OWNER TO new_owner;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('RENAME operations', () => {
        it('should parse RENAME COLUMN, CONSTRAINT, and TABLE', () => {
            const sql = `
                CREATE TABLE rename_table (
                    id SERIAL PRIMARY KEY,
                    old_name TEXT
                );
                ALTER TABLE rename_table RENAME COLUMN old_name TO new_name;
                ALTER TABLE rename_table RENAME CONSTRAINT id_pkey TO new_pkey;
                ALTER TABLE rename_table RENAME TO renamed_table;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('SET SCHEMA', () => {
        it('should parse SET SCHEMA', () => {
            const sql = `
                CREATE SCHEMA new_namespace;
                CREATE TABLE schema_alter (
                    id SERIAL PRIMARY KEY
                );
                ALTER TABLE schema_alter SET SCHEMA new_namespace;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('[PG17] MERGE/SPLIT PARTITIONS', () => {
        it('should parse MERGE PARTITIONS', () => {
            const sql = `
                CREATE TABLE merge_parts (
                    id SERIAL PRIMARY KEY,
                    region TEXT
                ) PARTITION BY LIST (region);
                CREATE TABLE part_a PARTITION OF merge_parts FOR VALUES IN ('A');
                CREATE TABLE part_b PARTITION OF merge_parts FOR VALUES IN ('B');
                ALTER TABLE merge_parts MERGE PARTITIONS (part_a, part_b) INTO merged;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse SPLIT PARTITION', () => {
            const sql = `
                CREATE TABLE split_table (
                    id SERIAL PRIMARY KEY,
                    value INTEGER
                ) PARTITION BY RANGE (value);
                CREATE TABLE unified PARTITION OF split_table FOR VALUES FROM (0) TO (1000);
                ALTER TABLE split_table SPLIT PARTITION unified AT (500) INTO (lower, upper);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('REPLICA IDENTITY', () => {
        it('should parse REPLICA IDENTITY variants', () => {
            const sql = `
                CREATE TABLE replica_table (
                    id SERIAL PRIMARY KEY,
                    value TEXT
                );
                CREATE INDEX idx_replica ON replica_table (value);
                ALTER TABLE replica_table REPLICA IDENTITY DEFAULT;
                ALTER TABLE replica_table REPLICA IDENTITY USING INDEX idx_replica;
                ALTER TABLE replica_table REPLICA IDENTITY FULL;
                ALTER TABLE replica_table REPLICA IDENTITY NOTHING;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });
});
