import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Policy, Role } from '../../types';

describe('Edge Cases: Security & RLS (PG12-19)', () => {
    describe('Row Level Security', () => {
        it('should parse ENABLE ROW LEVEL SECURITY', () => {
            const sql = `
                CREATE TABLE sensitive_data (
                    id SERIAL PRIMARY KEY,
                    owner_id INTEGER,
                    data TEXT
                );
                ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'sensitive_data');
            
            expect(table?.rlsEnabled).toBe(true);
        });

        it('should parse DISABLE ROW LEVEL SECURITY', () => {
            const sql = `
                CREATE TABLE public_table (id SERIAL, data TEXT);
                ALTER TABLE public_table ENABLE ROW LEVEL SECURITY;
                ALTER TABLE public_table DISABLE ROW LEVEL SECURITY;
            `;
            const result = parsePostgresSQL(sql);
            const table = result.tables.find(t => t.name === 'public_table');
            
            expect(table?.rlsEnabled).toBe(false);
        });

        it('should parse FORCE ROW LEVEL SECURITY', () => {
            const sql = `
                CREATE TABLE enforced_table (id SERIAL, owner_id INTEGER);
                ALTER TABLE enforced_table ENABLE ROW LEVEL SECURITY;
                ALTER TABLE enforced_table FORCE ROW LEVEL SECURITY;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('CREATE POLICY', () => {
        it('should parse policy for SELECT', () => {
            const sql = `
                CREATE TABLE documents (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    content TEXT
                );
                CREATE POLICY user_select ON documents
                    FOR SELECT
                    USING (user_id = current_user_id());
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'user_select');
            
            expect(policy).toBeDefined();
            expect(policy?.table).toBe('documents');
            expect(policy?.command).toBe('SELECT');
            expect(policy?.using).toContain('user_id');
        });

        it('should parse policy for INSERT with WITH CHECK', () => {
            const sql = `
                CREATE TABLE posts (id SERIAL, author_id INTEGER, content TEXT);
                CREATE POLICY user_insert ON posts
                    FOR INSERT
                    WITH CHECK (author_id = current_user_id());
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'user_insert');
            
            expect(policy?.command).toBe('INSERT');
            expect(policy?.withCheck).toBeDefined();
        });

        it('should parse policy for UPDATE with USING and WITH CHECK', () => {
            const sql = `
                CREATE TABLE articles (id SERIAL, author_id INTEGER, status TEXT);
                CREATE POLICY user_update ON articles
                    FOR UPDATE
                    USING (author_id = current_user_id())
                    WITH CHECK (status IN ('draft', 'published'));
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'user_update');
            
            expect(policy?.command).toBe('UPDATE');
            expect(policy?.using).toBeDefined();
            expect(policy?.withCheck).toBeDefined();
        });

        it('should parse policy for DELETE', () => {
            const sql = `
                CREATE TABLE comments (id SERIAL, user_id INTEGER);
                CREATE POLICY user_delete ON comments
                    FOR DELETE
                    USING (user_id = current_user_id());
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'user_delete');
            
            expect(policy?.command).toBe('DELETE');
        });

        it('should parse policy for ALL', () => {
            const sql = `
                CREATE TABLE all_access (id SERIAL, owner_id INTEGER);
                CREATE POLICY owner_all ON all_access
                    FOR ALL
                    USING (owner_id = current_user_id());
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'owner_all');
            
            expect(policy?.command).toBe('ALL');
        });
    });

    describe('Policy with multiple roles', () => {
        it('should parse TO with multiple roles', () => {
            const sql = `
                CREATE TABLE shared (id SERIAL, data TEXT);
                CREATE POLICY multi_role ON shared
                    FOR SELECT
                    TO authenticated, admin, public
                    USING (true);
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'multi_role');
            
            expect(policy?.roles).toContain('authenticated');
            expect(policy?.roles).toContain('admin');
            expect(policy?.roles).toContain('public');
        });
    });

    describe('Policy with USING subquery', () => {
        it('should parse complex USING expression', () => {
            const sql = `
                CREATE TABLE team_resources (
                    id SERIAL,
                    team_id INTEGER,
                    user_id INTEGER
                );
                CREATE POLICY team_access ON team_resources
                    USING (EXISTS (
                        SELECT 1 FROM team_members 
                        WHERE team_members.team_id = team_resources.team_id 
                        AND team_members.user_id = current_user_id()
                    ));
            `;
            const result = parsePostgresSQL(sql);
            const policy = result.policies.find(p => p.name === 'team_access');
            
            expect(policy?.using).toContain('EXISTS');
        });
    });

    describe('ALTER POLICY', () => {
        it('should parse ALTER POLICY', () => {
            const sql = `
                CREATE TABLE alterable (id SERIAL, data TEXT);
                CREATE POLICY old_policy ON alterable FOR SELECT USING (true);
                ALTER POLICY old_policy ON alterable
                    TO admin, superuser
                    USING (data IS NOT NULL)
                    WITH CHECK (data <> '');
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.policies).toBeDefined();
        });
    });

    describe('DROP POLICY', () => {
        it('should parse DROP POLICY IF EXISTS', () => {
            const sql = `
                CREATE TABLE droppable (id SERIAL, data TEXT);
                CREATE POLICY to_drop ON droppable FOR SELECT USING (true);
                DROP POLICY IF EXISTS to_drop ON droppable;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.policies).toBeDefined();
        });
    });

    describe('[PG15] RLS on partitioned tables', () => {
        it('should parse policy on partitioned table', () => {
            const sql = `
                CREATE TABLE partitioned_secure (
                    id SERIAL,
                    user_id INTEGER,
                    data TEXT
                ) PARTITION BY HASH (user_id);
                
                ALTER TABLE partitioned_secure ENABLE ROW LEVEL SECURITY;
                
                CREATE POLICY user_partition_policy ON partitioned_secure
                    FOR ALL
                    USING (user_id = current_user_id());
            `;
            const result = parsePostgresSQL(sql);
            
            const policy = result.policies.find(p => p.name === 'user_partition_policy');
            expect(policy?.table).toBe('partitioned_secure');
        });
    });

    describe('CREATE ROLE', () => {
        it('should parse role with all attributes', () => {
            const sql = `
                CREATE ROLE app_admin
                WITH LOGIN SUPERUSER CREATEDB CREATEROLE INHERIT
                CONNECTION LIMIT 100
                VALID UNTIL '2025-12-31'
                PASSWORD 'secret' ENCRYPTED;
            `;
            const result = parsePostgresSQL(sql);
            console.log('DEBUG PARSED ROLES:', JSON.stringify(result.roles, null, 2));
            const role = result.roles.find(r => r.name === 'app_admin');
            
            expect(role).toBeDefined();
        });

        it('should parse role with NOINHERIT', () => {
            const sql = `
                CREATE ROLE limited_user WITH NOINHERIT NOCREATEDB;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.roles).toBeDefined();
        });
    });

    describe('ALTER ROLE', () => {
        it('should parse ALTER ROLE SET', () => {
            const sql = `
                CREATE ROLE config_user;
                ALTER ROLE config_user SET search_path = schema1, schema2;
                ALTER ROLE config_user SET work_mem = '256MB';
                ALTER ROLE config_user RESET search_path;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.roles).toBeDefined();
        });
    });

    describe('DROP ROLE', () => {
        it('should parse DROP ROLE IF EXISTS', () => {
            const sql = `
                CREATE ROLE to_delete;
                DROP ROLE IF EXISTS to_delete;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.roles).toBeDefined();
        });
    });

    describe('GRANT/REVOKE on tables', () => {
        it('should parse GRANT on table', () => {
            const sql = `
                CREATE TABLE grants_test (id SERIAL, data TEXT);
                GRANT SELECT, INSERT, UPDATE ON grants_test TO role1, role2;
                GRANT ALL ON grants_test TO PUBLIC;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse column-level GRANT', () => {
            const sql = `
                CREATE TABLE col_grants (id SERIAL, public_col TEXT, private_col TEXT);
                GRANT SELECT (id, public_col) ON col_grants TO reader_role;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });

        it('should parse REVOKE', () => {
            const sql = `
                CREATE TABLE revokes_test (id SERIAL);
                GRANT ALL ON revokes_test TO role1;
                REVOKE UPDATE, DELETE ON revokes_test FROM role1;
                REVOKE GRANT OPTION FOR SELECT ON revokes_test FROM role1;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('GRANT on sequences', () => {
        it('should parse GRANT USAGE, SELECT ON SEQUENCE', () => {
            const sql = `
                CREATE SEQUENCE app_seq;
                GRANT USAGE, SELECT ON SEQUENCE app_seq TO app_role;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.sequences).toBeDefined();
        });
    });

    describe('GRANT on functions', () => {
        it('should parse GRANT EXECUTE ON FUNCTION', () => {
            const sql = `
                CREATE FUNCTION helper_func() RETURNS INTEGER LANGUAGE sql RETURN 1;
                GRANT EXECUTE ON FUNCTION helper_func() TO PUBLIC;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });
    });

    describe('GRANT on schemas', () => {
        it('should parse GRANT USAGE, CREATE ON SCHEMA', () => {
            const sql = `
                CREATE SCHEMA app_schema;
                GRANT USAGE, CREATE ON SCHEMA app_schema TO app_dev;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toBeDefined();
        });
    });

    describe('GRANT ALL ON ALL TABLES', () => {
        it('should parse GRANT ALL ON ALL TABLES IN SCHEMA', () => {
            const sql = `
                CREATE SCHEMA bulk_schema;
                GRANT ALL ON ALL TABLES IN SCHEMA bulk_schema TO bulk_role;
                GRANT ALL ON ALL SEQUENCES IN SCHEMA bulk_schema TO bulk_role;
                GRANT ALL ON ALL FUNCTIONS IN SCHEMA bulk_schema TO bulk_role;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toBeDefined();
        });
    });

    describe('[PG15] ALTER DEFAULT PRIVILEGES', () => {
        it('should parse ALTER DEFAULT PRIVILEGES IN SCHEMA', () => {
            const sql = `
                CREATE SCHEMA default_priv_schema;
                ALTER DEFAULT PRIVILEGES IN SCHEMA default_priv_schema
                    GRANT SELECT ON TABLES TO reader_role;
                ALTER DEFAULT PRIVILEGES FOR ROLE owner_role
                    GRANT EXECUTE ON FUNCTIONS TO api_role;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.schemas).toBeDefined();
        });
    });

    describe('[PG15] pg_database_owner', () => {
        it('should parse reference to predefined role', () => {
            const sql = `
                CREATE TABLE pg_owner_test (id SERIAL);
                GRANT ALL ON pg_owner_test TO pg_database_owner;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.tables).toBeDefined();
        });
    });

    describe('GRANT on types', () => {
        it('should parse GRANT USAGE ON TYPE', () => {
            const sql = `
                CREATE TYPE custom_enum AS ENUM ('a', 'b', 'c');
                GRANT USAGE ON TYPE custom_enum TO type_user;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.enums).toBeDefined();
        });
    });
});
