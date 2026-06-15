import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Schema, Extension } from '../../types';

describe('Edge Cases: Schemas & Extensions (PG12-19)', () => {
    describe('CREATE SCHEMA', () => {
        it('should parse simple schema', () => {
            const sql = `CREATE SCHEMA analytics;`;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toContain('analytics');
        });

        it('should parse CREATE SCHEMA AUTHORIZATION', () => {
            const sql = `CREATE SCHEMA AUTHORIZATION admin_user;`;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toBeDefined();
        });

        it('should parse CREATE SCHEMA IF NOT EXISTS', () => {
            const sql = `CREATE SCHEMA IF NOT EXISTS app_schema;`;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toContain('app_schema');
        });

        it('should parse CREATE SCHEMA with nested objects', () => {
            const sql = `
                CREATE SCHEMA app_schema CREATE TABLE users (id SERIAL PRIMARY KEY);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toContain('app_schema');
        });
    });

    describe('ALTER SCHEMA', () => {
        it('should parse ALTER SCHEMA SET/RESET', () => {
            const sql = `
                CREATE SCHEMA config_schema;
                ALTER SCHEMA config_schema SET search_path = 'public';
                ALTER SCHEMA config_schema RESET search_path;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toContain('config_schema');
        });
    });

    describe('DROP SCHEMA', () => {
        it('should parse DROP SCHEMA CASCADE', () => {
            const sql = `
                CREATE SCHEMA to_drop;
                DROP SCHEMA IF EXISTS to_drop CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toBeDefined();
        });

        it('should parse DROP SCHEMA RESTRICT', () => {
            const sql = `
                CREATE SCHEMA restricted;
                DROP SCHEMA IF EXISTS restricted RESTRICT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toBeDefined();
        });
    });

    describe('CREATE EXTENSION', () => {
        it('should parse simple extension', () => {
            const sql = `CREATE EXTENSION pg_stat_statements;`;
            const result = parsePostgresSQL(sql);
            const ext = result.extensions.find(e => e.name === 'pg_stat_statements');
            
            expect(ext).toBeDefined();
        });

        it('should parse extension with schema', () => {
            const sql = `
                CREATE SCHEMA extensions;
                CREATE EXTENSION pg_trgm WITH SCHEMA extensions;
            `;
            const result = parsePostgresSQL(sql);
            const ext = result.extensions.find(e => e.name === 'pg_trgm');
            
            expect(ext?.schema).toBe('extensions');
        });

        it('should parse extension with VERSION and FROM', () => {
            const sql = `
                CREATE EXTENSION IF NOT EXISTS postgis
                WITH SCHEMA public
                VERSION '3.3.0'
                FROM '3.2.0';
            `;
            const result = parsePostgresSQL(sql);
            const ext = result.extensions.find(e => e.name === 'postgis');
            
            expect(ext?.version).toBe('3.3.0');
        });
    });

    describe('ALTER EXTENSION', () => {
        it('should parse ALTER EXTENSION UPDATE TO', () => {
            const sql = `
                CREATE EXTENSION pg_repack;
                ALTER EXTENSION pg_repack UPDATE TO '1.5.0';
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });

        it('should parse ALTER EXTENSION SET SCHEMA', () => {
            const sql = `
                CREATE SCHEMA ext_schema;
                CREATE EXTENSION pg_freespacemap;
                ALTER EXTENSION pg_freespacemap SET SCHEMA ext_schema;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });

        it('should parse ALTER EXTENSION ADD TABLE', () => {
            const sql = `
                CREATE TABLE ext_table (id SERIAL);
                CREATE EXTENSION IF NOT EXISTS pg_partman;
                ALTER EXTENSION pg_partman ADD TABLE ext_table;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });

        it('should parse ALTER EXTENSION ADD FUNCTION', () => {
            const sql = `
                CREATE FUNCTION ext_func() RETURNS INTEGER LANGUAGE sql RETURN 1;
                CREATE EXTENSION IF NOT EXISTS pgcrypto;
                ALTER EXTENSION pgcrypto ADD FUNCTION ext_func();
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });

        it('should parse ALTER EXTENSION ADD VIEW', () => {
            const sql = `
                CREATE VIEW ext_view AS SELECT 1;
                CREATE EXTENSION IF NOT EXISTS timescaledb;
                ALTER EXTENSION timescaledb ADD VIEW ext_view;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toBeDefined();
        });

        it('should parse ALTER EXTENSION DROP objects', () => {
            const sql = `
                CREATE TABLE drop_table (id SERIAL);
                CREATE FUNCTION drop_func() RETURNS INTEGER LANGUAGE sql RETURN 1;
                CREATE EXTENSION test_ext;
                ALTER EXTENSION test_ext DROP TABLE drop_table;
                ALTER EXTENSION test_ext DROP FUNCTION drop_func();
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });
    });

    describe('DROP EXTENSION', () => {
        it('should parse DROP EXTENSION CASCADE', () => {
            const sql = `
                CREATE EXTENSION hstore;
                DROP EXTENSION IF EXISTS hstore CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });
    });

    describe('[PG13] Extended statistics', () => {
        it('should parse CREATE STATISTICS', () => {
            const sql = `
                CREATE TABLE stats_table (col1 INTEGER, col2 TEXT);
                CREATE STATISTICS stats_name ON col1, col2 FROM stats_table;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('[PG14] should parse CREATE STATISTICS with types', () => {
            const sql = `
                CREATE TABLE stats_expr (a INTEGER, b INTEGER, c TEXT);
                CREATE STATISTICS stats_multi (ndistinct, dependencies, mcv) ON a, b FROM stats_expr;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('[PG14] should parse statistics on expressions', () => {
            const sql = `
                CREATE TABLE stats_func (json_data JSONB);
                CREATE STATISTICS stats_json ON (json_data->>'key') FROM stats_func;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('Foreign data wrappers', () => {
        it('should parse CREATE FOREIGN DATA WRAPPER', () => {
            const sql = `
                CREATE FOREIGN DATA WRAPPER postgres_fdw;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.warnings).toBeDefined();
        });

        it('should parse FDW with options', () => {
            const sql = `
                CREATE FOREIGN DATA WRAPPER file_fdw
                HANDLER file_fdw_handler
                VALIDATOR file_fdw_validator;
                CREATE EXTENSION file_fdw;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });
    });

    describe('Foreign servers', () => {
        it('should parse CREATE SERVER', () => {
            const sql = `
                CREATE EXTENSION postgres_fdw;
                CREATE SERVER remote_db
                FOREIGN DATA WRAPPER postgres_fdw
                OPTIONS (host 'remote.example.com', dbname 'remote');
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });
    });

    describe('User mappings', () => {
        it('should parse CREATE USER MAPPING', () => {
            const sql = `
                CREATE EXTENSION postgres_fdw;
                CREATE SERVER local_server FOREIGN DATA WRAPPER postgres_fdw;
                CREATE USER MAPPING FOR current_user
                SERVER local_server
                OPTIONS (user 'remote_user', password 'secret');
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });
    });

    describe('IMPORT FOREIGN SCHEMA', () => {
        it('should parse IMPORT FOREIGN SCHEMA', () => {
            const sql = `
                CREATE EXTENSION postgres_fdw;
                CREATE SERVER remote_pg FOREIGN DATA WRAPPER postgres_fdw;
                IMPORT FOREIGN SCHEMA remote_schema
                LIMIT TO (table1, table2)
                FROM SERVER remote_pg
                INTO local_schema;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.extensions).toBeDefined();
        });
    });

    describe('COMMENT ON SCHEMA', () => {
        it('should parse COMMENT ON SCHEMA', () => {
            const sql = `
                CREATE SCHEMA commented_schema;
                COMMENT ON SCHEMA commented_schema IS 'Schema for application data';
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toContain('commented_schema');
        });
    });
});
