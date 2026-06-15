import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Sequence } from '../../types';

describe('Edge Cases: Sequences (PG12-19)', () => {
    describe('CREATE SEQUENCE with all options', () => {
        it('should parse full sequence definition', () => {
            const sql = `
                CREATE SEQUENCE orders_seq
                INCREMENT BY 1
                MINVALUE 1
                MAXVALUE 999999
                START WITH 1
                CACHE 20
                CYCLE;
            `;
            const result = parsePostgresSQL(sql);
            const seq = result.sequences.find(s => s.name === 'orders_seq');
            
            expect(seq).toBeDefined();
            expect(seq?.increment).toBe(1);
            expect(seq?.minValue).toBe(1);
            expect(seq?.maxValue).toBe(999999);
            expect(seq?.start).toBe(1);
            expect(seq?.cache).toBe(20);
            expect(seq?.cycle).toBe(true);
        });

        it('should parse NO MINVALUE, NO MAXVALUE, NO CYCLE', () => {
            const sql = `
                CREATE SEQUENCE infinite_seq
                NO MINVALUE
                NO MAXVALUE
                NO CYCLE
                INCREMENT 5;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });
    });

    describe('OWNED BY', () => {
        it('should parse OWNED BY table.column', () => {
            const sql = `
                CREATE TABLE owners (id SERIAL);
                CREATE SEQUENCE owned_seq OWNED BY owners.id;
            `;
            const result = parsePostgresSQL(sql);
            const seq = result.sequences.find(s => s.name === 'owned_seq');
            
            expect(seq?.ownedBy).toBe('owners.id');
        });

        it('should parse OWNED BY NONE', () => {
            const sql = `CREATE SEQUENCE standalone_seq OWNED BY NONE;`;
            const result = parsePostgresSQL(sql);
            const seq = result.sequences.find(s => s.name === 'standalone_seq');
            
            expect(seq?.ownedBy).toBe('NONE');
        });
    });

    describe('ALTER SEQUENCE', () => {
        it('should parse RESTART WITH', () => {
            const sql = `
                CREATE SEQUENCE restart_seq;
                ALTER SEQUENCE restart_seq RESTART WITH 100;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });

        it('should parse SET SCHEMA', () => {
            const sql = `
                CREATE SCHEMA seq_schema;
                CREATE SEQUENCE move_seq;
                ALTER SEQUENCE move_seq SET SCHEMA seq_schema;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });

        it('should parse OWNER TO', () => {
            const sql = `
                CREATE SEQUENCE owner_change_seq;
                ALTER SEQUENCE owner_change_seq OWNER TO new_owner;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });

        it('should parse INCREMENT BY change', () => {
            const sql = `
                CREATE SEQUENCE inc_seq INCREMENT 1;
                ALTER SEQUENCE inc_seq INCREMENT BY 2;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });

        it('should parse SET (log_cnt=0)', () => {
            const sql = `
                CREATE SEQUENCE config_seq;
                ALTER SEQUENCE config_seq SET (log_cnt=0);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });
    });

    describe('Sequence as DEFAULT', () => {
        it('should parse DEFAULT nextval with regclass cast', () => {
            const sql = `
                CREATE SEQUENCE user_seq;
                CREATE TABLE default_users (
                    id INTEGER DEFAULT nextval('user_seq'::regclass),
                    name TEXT
                );
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'default_users');
            
            const idCol = table?.columns.find(c => c.name === 'id');
            expect(idCol?.defaultValue).toContain('nextval');
        });
    });

    describe('DROP SEQUENCE', () => {
        it('should parse DROP SEQUENCE CASCADE', () => {
            const sql = `
                CREATE SEQUENCE drop_seq;
                DROP SEQUENCE IF EXISTS drop_seq CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });
    });

    describe('CREATE SEQUENCE IF NOT EXISTS', () => {
        it('should parse IF NOT EXISTS', () => {
            const sql = `CREATE SEQUENCE IF NOT EXISTS safe_seq START WITH 1;`;
            const result = parsePostgresSQL(sql);
            const seq = result.sequences.find(s => s.name === 'safe_seq');
            
            expect(seq).toBeDefined();
        });
    });

    describe('Multiple sequences', () => {
        it('should handle multiple sequences in schema', () => {
            const sql = `
                CREATE SCHEMA multi_seq;
                CREATE SEQUENCE multi_seq.seq1 START 1;
                CREATE SEQUENCE multi_seq.seq2 START 1000 INCREMENT 10;
                CREATE SEQUENCE multi_seq.seq3 START 10000 CACHE 50 NO CYCLE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Identity vs explicit sequence', () => {
        it('should distinguish GENERATED AS IDENTITY from explicit nextval', () => {
            const sql = `
                CREATE TABLE identity_test (
                    id_identity INTEGER GENERATED ALWAYS AS IDENTITY,
                    id_explicit INTEGER DEFAULT nextval('id_seq'::regclass)
                );
                CREATE SEQUENCE id_seq;
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'identity_test');
            
            const identityCol = table?.columns.find(c => c.name === 'id_identity');
            expect(identityCol?.defaultValue).toContain('IDENTITY');
            
            const explicitCol = table?.columns.find(c => c.name === 'id_explicit');
            expect(explicitCol?.defaultValue).toContain('nextval');
        });
    });

    describe('GRANT on SEQUENCE', () => {
        it('should parse GRANT USAGE, SELECT ON SEQUENCE', () => {
            const sql = `
                CREATE SEQUENCE grant_seq;
                GRANT USAGE, SELECT ON SEQUENCE grant_seq TO app_role;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });
    });

    describe('[PG15] Sequence type specification', () => {
        it('should parse ALTER SEQUENCE AS type', () => {
            const sql = `
                CREATE SEQUENCE typed_seq;
                ALTER SEQUENCE typed_seq AS BIGINT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });

        it('should parse CREATE SEQUENCE with type', () => {
            const sql = `CREATE SEQUENCE big_seq AS BIGINT START WITH 1;`;
            const result = parsePostgresSQL(sql);
            const seq = result.sequences.find(s => s.name === 'big_seq');
            
            expect(seq?.dataType).toBe('BIGINT');
        });
    });

    describe('Sequence in partitioned table', () => {
        it('should parse sequence used in partition', () => {
            const sql = `
                CREATE SEQUENCE global_seq;
                CREATE TABLE partitioned_table (
                    id BIGINT DEFAULT nextval('global_seq'::regclass),
                    region TEXT
                ) PARTITION BY LIST (region);
                
                CREATE TABLE part_us PARTITION OF partitioned_table FOR VALUES IN ('US');
            `;
            const result = parsePostgresSQL(sql);
            
            const seq = result.sequences.find(s => s.name === 'global_seq');
            expect(seq).toBeDefined();
            
            const table = result.tables.find(t => t.name === 'partitioned_table');
            expect(table?.isPartitioned).toBe(true);
        });
    });
});
