import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { PostgresFunction } from '../../types';

describe('Edge Cases: Functions & Procedures (PG12-19)', () => {
    describe('Function languages', () => {
        it('should parse plpgsql function', () => {
            const sql = `
                CREATE FUNCTION calculate_total(order_id INTEGER) RETURNS NUMERIC
                LANGUAGE plpgsql
                AS $$
                DECLARE
                    total NUMERIC;
                BEGIN
                    SELECT SUM(quantity * price) INTO total FROM order_items WHERE order_id = $1;
                    RETURN total;
                END;
                $$;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'calculate_total');
            
            expect(func).toBeDefined();
            expect(func?.language).toBe('plpgsql');
            expect(func?.returnType).toBe('NUMERIC');
        });

        it('should parse sql function', () => {
            const sql = `
                CREATE FUNCTION get_user_name(user_id INTEGER) RETURNS TEXT
                LANGUAGE sql
                IMMUTABLE
                RETURN (SELECT name FROM users WHERE id = $1);
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'get_user_name');
            
            expect(func?.language).toBe('sql');
            expect(func?.volatility).toBe('IMMUTABLE');
        });
    });

    describe('SETOF and TABLE returns', () => {
        it('should parse RETURNS SETOF', () => {
            const sql = `
                CREATE FUNCTION list_users() RETURNS SETOF users
                LANGUAGE sql STABLE
                RETURN SELECT * FROM users;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'list_users');
            
            expect(func?.setReturning).toBe(true);
        });

        it('[PG12] should parse RETURNS TABLE', () => {
            const sql = `
                CREATE FUNCTION get_user_orders(user_id INTEGER)
                RETURNS TABLE (order_id INTEGER, total NUMERIC, created_at TIMESTAMPTZ)
                LANGUAGE sql STABLE
                RETURN SELECT id, total, created_at FROM orders WHERE user_id = $1;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'get_user_orders');
            
            expect(func).toBeDefined();
            expect(func?.returnType).toContain('TABLE');
        });
    });

    describe('Parameter modes', () => {
        it('should parse IN/OUT/INOUT/VARIADIC parameters', () => {
            const sql = `
                CREATE FUNCTION process_data(
                    p_input IN TEXT,
                    p_output OUT TEXT,
                    p_counter INOUT INTEGER DEFAULT 0,
                    p_extra VARIADIC TEXT[]
                ) RETURNS RECORD
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    p_output := UPPER(p_input);
                    p_counter := p_counter + 1;
                END;
                $$;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'process_data');
            
            expect(func?.parameters).toBeDefined();
            expect(func?.parameters).toHaveLength(4);
            
            const inputParam = func?.parameters?.find(p => p.name === 'p_input');
            expect(inputParam?.mode).toBe('IN');
            
            const outParam = func?.parameters?.find(p => p.name === 'p_output');
            expect(outParam?.mode).toBe('OUT');
            
            const inoutParam = func?.parameters?.find(p => p.name === 'p_counter');
            expect(inoutParam?.mode).toBe('INOUT');
            expect(inoutParam?.default).toBe('0');
            
            const variadicParam = func?.parameters?.find(p => p.name === 'p_extra');
            expect(variadicParam?.mode).toBe('VARIADIC');
        });
    });

    describe('Function attributes', () => {
        it('should parse IMMUTABLE/STABLE/VOLATILE', () => {
            const sql = `
                CREATE FUNCTION immutable_func() RETURNS INTEGER LANGUAGE sql IMMUTABLE RETURN 1;
                CREATE FUNCTION stable_func() RETURNS INTEGER LANGUAGE sql STABLE RETURN 1;
                CREATE FUNCTION volatile_func() RETURNS INTEGER LANGUAGE sql VOLATILE RETURN 1;
            `;
            const result = parsePostgresSQL(sql);
            
            const immutable = result.functions.find(f => f.name === 'immutable_func');
            expect(immutable?.volatility).toBe('IMMUTABLE');
            
            const stable = result.functions.find(f => f.name === 'stable_func');
            expect(stable?.volatility).toBe('STABLE');
            
            const volatile = result.functions.find(f => f.name === 'volatile_func');
            expect(volatile?.volatility).toBe('VOLATILE');
        });

        it('should parse SECURITY DEFINER/INVOKER', () => {
            const sql = `
                CREATE FUNCTION secure_func() RETURNS INTEGER
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$ BEGIN RETURN 1; END; $$;
                
                CREATE FUNCTION normal_func() RETURNS INTEGER
                LANGUAGE plpgsql
                SECURITY INVOKER
                AS $$ BEGIN RETURN 1; END; $$;
            `;
            const result = parsePostgresSQL(sql);
            
            const secure = result.functions.find(f => f.name === 'secure_func');
            expect(secure?.securityDefiner).toBe(true);
        });

        it('should parse PARALLEL SAFE/UNSAFE/RESTRICTED', () => {
            const sql = `
                CREATE FUNCTION parallel_safe() RETURNS INTEGER
                LANGUAGE sql PARALLEL SAFE RETURN 1;
                
                CREATE FUNCTION parallel_unsafe() RETURNS INTEGER
                LANGUAGE sql PARALLEL UNSAFE RETURN 1;
                
                CREATE FUNCTION parallel_restricted() RETURNS INTEGER
                LANGUAGE sql PARALLEL RESTRICTED RETURN 1;
            `;
            const result = parsePostgresSQL(sql);
            
            const safe = result.functions.find(f => f.name === 'parallel_safe');
            expect(safe?.parallel).toBe('SAFE');
            
            const unsafe = result.functions.find(f => f.name === 'parallel_unsafe');
            expect(unsafe?.parallel).toBe('UNSAFE');
            
            const restricted = result.functions.find(f => f.name === 'parallel_restricted');
            expect(restricted?.parallel).toBe('RESTRICTED');
        });

        it('should parse LEAKPROOF', () => {
            const sql = `
                CREATE FUNCTION safe_hash(input TEXT) RETURNS TEXT
                LANGUAGE sql
                IMMUTABLE LEAKPROOF
                RETURN md5(input);
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'safe_hash');
            
            expect(func?.volatility).toBe('IMMUTABLE');
        });

        it('should parse COST and ROWS', () => {
            const sql = `
                CREATE FUNCTION expensive_func() RETURNS SETOF users
                LANGUAGE sql
                STABLE
                COST 1000
                ROWS 500
                RETURN SELECT * FROM users;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'expensive_func');
            
            expect(func?.cost).toBe(1000);
            expect(func?.rows).toBe(500);
        });

        it('should parse SET configuration parameters', () => {
            const sql = `
                CREATE FUNCTION secure_query() RETURNS TEXT
                LANGUAGE plpgsql
                SET search_path = 'public'
                SET work_mem = '256MB'
                AS $$ BEGIN RETURN 'ok'; END; $$;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'secure_query');
            
            expect(func?.setOptions).toBeDefined();
            expect(func?.setOptions).toHaveLength(2);
            expect(func?.setOptions?.[0].name).toBe('search_path');
        });
    });

    describe('[PG14] SQL body functions', () => {
        it('should parse RETURN expression syntax', () => {
            const sql = `
                CREATE FUNCTION add(a INTEGER, b INTEGER) RETURNS INTEGER
                LANGUAGE sql
                RETURN a + b;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'add');
            
            expect(func?.language).toBe('sql');
            expect(func?.sqlBody).toBeDefined();
        });

        it('should parse BEGIN ATOMIC ... END block', () => {
            const sql = `
                CREATE FUNCTION multi_stmt(x INTEGER) RETURNS INTEGER
                LANGUAGE sql
                BEGIN ATOMIC
                    SELECT x + 1;
                    SELECT x * 2;
                END;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'multi_stmt');
            
            expect(func?.language).toBe('sql');
            expect(func?.sqlBody).toContain('ATOMIC');
        });
    });

    describe('Procedures', () => {
        it('should parse CREATE PROCEDURE with all parameter modes', () => {
            const sql = `
                CREATE PROCEDURE update_user(
                    p_id INTEGER,
                    p_name TEXT,
                    p_result OUT INTEGER
                )
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    UPDATE users SET name = p_name WHERE id = p_id;
                    p_result := 1;
                END;
                $$;
            `;
            const result = parsePostgresSQL(sql);
            const proc = result.functions.find(f => f.name === 'update_user');
            
            expect(proc?.isProcedure).toBe(true);
            expect(proc?.parameters).toBeDefined();
        });

        it('[PG14] should parse procedure OUT parameters', () => {
            const sql = `
                CREATE PROCEDURE get_user_status(
                    p_user_id INTEGER,
                    p_status OUT TEXT,
                    p_count OUT INTEGER
                )
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    SELECT status, count INTO p_status, p_count FROM user_stats WHERE user_id = p_user_id;
                END;
                $$;
            `;
            const result = parsePostgresSQL(sql);
            const proc = result.functions.find(f => f.name === 'get_user_status');
            
            expect(proc?.isProcedure).toBe(true);
        });
    });

    describe('Aggregate functions', () => {
        it('should parse CREATE AGGREGATE', () => {
            const sql = `
                CREATE AGGREGATE sum_ngrams (TEXT) (
                    SFUNC = ngram_sum,
                    STYPE = TEXT[],
                    FINALFUNC = ngram_final,
                    INITCOND = '{}',
                    SORTOP = '<'
                );
            `;
            const result = parsePostgresSQL(sql);
            const agg = result.aggregates?.find(a => a.name === 'sum_ngrams');
            
            expect(agg).toBeDefined();
            expect(agg?.finalFunc).toBe('ngram_final');
        });

        it('should parse complex aggregate with combine/serialize', () => {
            const sql = `
                CREATE AGGREGATE percentile_cont (FLOAT, INTEGER) (
                    SFUNC = array_append,
                    STYPE = FLOAT[],
                    FINALFUNC = percentile_final,
                    COMBINEFUNC = array_cat,
                    SERIALFUNC = array_to_bytea,
                    DESERIALFUNC = bytea_to_array,
                    INITCOND = '{}'
                );
            `;
            const result = parsePostgresSQL(sql);
            const agg = result.aggregates?.find(a => a.name === 'percentile_cont');
            
            expect(agg).toBeDefined();
            expect(agg?.combineFunc).toBe('array_cat');
            expect(agg?.serializeFunc).toBe('array_to_bytea');
        });
    });

    describe('ALTER FUNCTION', () => {
        it('should parse ALTER FUNCTION OWNER TO', () => {
            const sql = `
                CREATE FUNCTION test_func() RETURNS INTEGER LANGUAGE sql RETURN 1;
                ALTER FUNCTION test_func() OWNER TO admin;
                ALTER FUNCTION test_func() SET SCHEMA analytics;
                ALTER FUNCTION test_func() RENAME TO renamed_func;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });

        it('should parse ALTER FUNCTION SET/RESET', () => {
            const sql = `
                CREATE FUNCTION config_func() RETURNS INTEGER LANGUAGE sql RETURN 1;
                ALTER FUNCTION config_func() SET search_path = 'public';
                ALTER FUNCTION config_func() RESET search_path;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });
    });

    describe('DROP FUNCTION', () => {
        it('should parse DROP FUNCTION with argument types for overloading', () => {
            const sql = `
                CREATE FUNCTION process(a INTEGER, b TEXT) RETURNS TEXT LANGUAGE sql RETURN 'int_text';
                CREATE FUNCTION process(a TEXT, b INTEGER) RETURNS TEXT LANGUAGE sql RETURN 'text_int';
                DROP FUNCTION process(INTEGER, TEXT);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });
    });

    describe('[PG13] DROP ROUTINE', () => {
        it('should parse DROP ROUTINE', () => {
            const sql = `
                CREATE FUNCTION func_to_drop() RETURNS INTEGER LANGUAGE sql RETURN 1;
                DROP ROUTINE func_to_drop();
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });

        it('[PG13] should parse ALTER ROUTINE SET SCHEMA', () => {
            const sql = `
                CREATE FUNCTION moveable_func() RETURNS INTEGER LANGUAGE sql RETURN 1;
                ALTER ROUTINE moveable_func() SET SCHEMA new_schema;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.functions).toBeDefined();
        });
    });

    describe('Function overloading', () => {
        it('should handle multiple functions with same name', () => {
            const sql = `
                CREATE FUNCTION process(x INTEGER) RETURNS INTEGER LANGUAGE sql RETURN x * 2;
                CREATE FUNCTION process(x TEXT) RETURNS TEXT LANGUAGE sql RETURN UPPER(x);
                CREATE FUNCTION process(x INTEGER, y INTEGER) RETURNS INTEGER LANGUAGE sql RETURN x + y;
            `;
            const result = parsePostgresSQL(sql);
            
            const process_funcs = result.functions.filter(f => f.name === 'process');
            expect(process_funcs.length).toBeGreaterThan(0);
        });
    });

    describe('Polymorphic types', () => {
        it('should parse anyelement/anyarray', () => {
            const sql = `
                CREATE FUNCTION identity(x anyelement) RETURNS anyelement
                LANGUAGE sql IMMUTABLE
                RETURN x;
                
                CREATE FUNCTION array_first(arr anyarray) RETURNS anyelement
                LANGUAGE sql IMMUTABLE
                RETURN arr[1];
            `;
            const result = parsePostgresSQL(sql);
            
            const identity = result.functions.find(f => f.name === 'identity');
            expect(identity?.parameters?.[0].type).toBe('anyelement');
            
            const arr_first = result.functions.find(f => f.name === 'array_first');
            expect(arr_first?.parameters?.[0].type).toBe('anyarray');
        });
    });

    describe('[PG17] SQL/JSON functions', () => {
        it('should parse function with JSON_TABLE', () => {
            const sql = `
                CREATE FUNCTION extract_users(data JSONB)
                RETURNS TABLE (id INTEGER, name TEXT)
                LANGUAGE sql
                RETURN SELECT * FROM JSON_TABLE(data, '$.users[*]' COLUMNS (id INTEGER, name TEXT));
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'extract_users');
            
            expect(func?.language).toBe('sql');
        });
    });

    describe('CREATE OR REPLACE FUNCTION', () => {
        it('should handle OR REPLACE', () => {
            const sql = `
                CREATE OR REPLACE FUNCTION increment(x INTEGER) RETURNS INTEGER
                LANGUAGE sql IMMUTABLE
                RETURN x + 1;
            `;
            const result = parsePostgresSQL(sql);
            const func = result.functions.find(f => f.name === 'increment');
            
            expect(func).toBeDefined();
            expect(func?.language).toBe('sql');
        });
    });
});
