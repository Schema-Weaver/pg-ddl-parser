import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { View } from '../../types';

describe('Edge Cases: Views (PG12-19)', () => {
    describe('WITH CHECK OPTION', () => {
        it('[PG12] should parse WITH CHECK OPTION', () => {
            const sql = `
                CREATE VIEW active_users AS
                SELECT id, name, email FROM users WHERE active = true
                WITH CHECK OPTION;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'active_users');
            
            expect(view).toBeDefined();
            expect(view?.checkOption).toBe('CASCADED');
        });

        it('should parse WITH LOCAL CHECK OPTION', () => {
            const sql = `
                CREATE VIEW local_check_view AS
                SELECT * FROM products WHERE price > 0
                WITH LOCAL CHECK OPTION;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'local_check_view');
            
            expect(view?.checkOption).toBe('LOCAL');
        });

        it('should parse WITH CASCADED CHECK OPTION', () => {
            const sql = `
                CREATE VIEW cascaded_view AS
                SELECT id, name FROM items WHERE quantity > 0
                WITH CASCADED CHECK OPTION;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'cascaded_view');
            
            expect(view?.checkOption).toBe('CASCADED');
        });
    });

    describe('[PG12] Recursive views', () => {
        it('should parse CREATE RECURSIVE VIEW', () => {
            const sql = `
                CREATE RECURSIVE VIEW category_tree (
                    id, name, parent_id, depth
                ) AS
                SELECT id, name, parent_id, 0 AS depth
                FROM categories WHERE parent_id IS NULL
                UNION ALL
                SELECT c.id, c.name, c.parent_id, ct.depth + 1
                FROM categories c
                JOIN category_tree ct ON c.parent_id = ct.id;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'category_tree');
            
            expect(view?.isRecursive).toBe(true);
            expect(view?.columns).toBeDefined();
        });
    });

    describe('Materialized views', () => {
        it('should parse CREATE MATERIALIZED VIEW with options', () => {
            const sql = `
                CREATE MATERIALIZED VIEW sales_summary AS
                SELECT product_id, SUM(quantity) AS total_qty, SUM(revenue) AS total_rev
                FROM sales
                GROUP BY product_id
                WITH (populated=false, fillfactor=80)
                TABLESPACE pg_default;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'sales_summary');
            
            expect(view?.isMaterialized).toBe(true);
        });

        it('should parse REFRESH MATERIALIZED VIEW', () => {
            const sql = `
                CREATE MATERIALIZED VIEW mv_test AS SELECT * FROM items;
                REFRESH MATERIALIZED VIEW mv_test;
                REFRESH MATERIALIZED VIEW CONCURRENTLY mv_test;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toBeDefined();
        });
    });

    describe('Security options', () => {
        it('should parse security_barrier=true', () => {
            const sql = `
                CREATE VIEW secure_view AS
                SELECT id, name FROM users
                WITH (security_barrier=true);
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'secure_view');
            
            expect(view?.securityBarrier).toBe(true);
        });

        it('[PG15] should parse security_invoker=true', () => {
            const sql = `
                CREATE VIEW invoker_view AS
                SELECT * FROM restricted_data
                WITH (security_invoker=true);
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'invoker_view');
            
            expect(view?.securityInvoker).toBe(true);
        });

        it('[PG15] should parse WITH options before AS (security_barrier)', () => {
            const sql = `CREATE VIEW public.active_users WITH (security_barrier = true) AS SELECT id FROM public.users;`;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'active_users');
            expect(view?.securityBarrier).toBe(true);
        });

        it('[PG15] should parse WITH options before AS (security_invoker + security_barrier)', () => {
            const sql = `CREATE VIEW v_both WITH (security_barrier = true, security_invoker = true) AS SELECT * FROM users;`;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'v_both');
            expect(view?.securityBarrier).toBe(true);
            expect(view?.securityInvoker).toBe(true);
        });
    });

    describe('ALTER VIEW', () => {
        it('should parse ALTER VIEW SET/RESET options', () => {
            const sql = `
                CREATE VIEW alterable_view AS SELECT * FROM items;
                ALTER VIEW alterable_view SET (check_option=cascaded);
                ALTER VIEW alterable_view RESET (check_option);
                ALTER VIEW alterable_view ALTER COLUMN id SET DEFAULT nextval('seq');
                ALTER VIEW alterable_view ALTER COLUMN name DROP DEFAULT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toBeDefined();
        });
    });

    describe('View with complex queries', () => {
        it('should parse view with CTEs', () => {
            const sql = `
                CREATE VIEW complex_view AS
                WITH RECURSIVE hierarchy AS (
                    SELECT id, parent_id, 1 AS level FROM tree WHERE parent_id IS NULL
                    UNION ALL
                    SELECT t.id, t.parent_id, h.level + 1
                    FROM tree t JOIN hierarchy h ON t.parent_id = h.id
                )
                SELECT * FROM hierarchy;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'complex_view');
            
            expect(view).toBeDefined();
            expect(view?.query).toContain('WITH RECURSIVE');
        });

        it('should parse view with window functions', () => {
            const sql = `
                CREATE VIEW ranked_view AS
                SELECT 
                    id, name,
                    ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) AS rank,
                    SUM(quantity) OVER (PARTITION BY category) AS cat_total
                FROM products;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'ranked_view');
            
            expect(view?.query).toContain('OVER');
        });

        it('should parse view with UNION and ORDER BY', () => {
            const sql = `
                CREATE VIEW combined_view AS
                SELECT id, name FROM table_a
                UNION ALL
                SELECT id, name FROM table_b
                ORDER BY name;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'combined_view');
            
            expect(view?.query).toContain('UNION');
        });
    });

    describe('Nested views', () => {
        it('should track view dependencies', () => {
            const sql = `
                CREATE VIEW base_view AS SELECT id, name FROM users;
                CREATE VIEW derived_view AS SELECT id, name FROM base_view WHERE active = true;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toHaveLength(2);
            
            const derivedView = result.views.find(v => v.name === 'derived_view');
            expect(derivedView?.query).toContain('base_view');
        });
    });

    describe('DROP VIEW', () => {
        it('should parse DROP VIEW CASCADE', () => {
            const sql = `
                CREATE VIEW to_drop AS SELECT * FROM items;
                DROP VIEW IF EXISTS to_drop CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toBeDefined();
        });

        it('should parse DROP MATERIALIZED VIEW', () => {
            const sql = `
                CREATE MATERIALIZED VIEW mv_to_drop AS SELECT * FROM items;
                DROP MATERIALIZED VIEW IF EXISTS mv_to_drop CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toBeDefined();
        });
    });

    describe('ALTER MATERIALIZED VIEW', () => {
        it('should parse ALTER MATERIALIZED VIEW operations', () => {
            const sql = `
                CREATE MATERIALIZED VIEW alterable_mv AS SELECT * FROM items;
                ALTER MATERIALIZED VIEW alterable_mv SET SCHEMA analytics;
                ALTER MATERIALIZED VIEW alterable_mv RENAME TO renamed_mv;
                ALTER MATERIALIZED VIEW alterable_mv OWNER TO admin;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.views).toBeDefined();
        });
    });

    describe('View column aliases', () => {
        it('should parse view with column aliases', () => {
            const sql = `
                CREATE VIEW aliased_view (user_id, user_name, user_email) AS
                SELECT id, name, email FROM users;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'aliased_view');
            
            expect(view?.columns).toBeDefined();
            expect(view?.columns).toEqual(['user_id', 'user_name', 'user_email']);
        });
    });

    describe('[PG14] jsonb subscript in view', () => {
        it('should parse view with jsonb subscript', () => {
            const sql = `
                CREATE VIEW json_extract_view AS
                SELECT id, data['key'] AS extracted_value
                FROM json_events;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'json_extract_view');
            
            expect(view).toBeDefined();
        });
    });

    describe('[PG17] View with SQL/JSON', () => {
        it('should parse view using JSON_TABLE', () => {
            const sql = `
                CREATE VIEW user_details_view AS
                SELECT id, jt.name, jt.email
                FROM users,
                JSON_TABLE(profile_json, '$' COLUMNS (name TEXT, email TEXT)) AS jt;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'user_details_view');
            
            expect(view).toBeDefined();
        });
    });

    describe('CREATE OR REPLACE VIEW', () => {
        it('should handle OR REPLACE', () => {
            const sql = `
                CREATE VIEW replaceable_view AS SELECT id FROM items;
                CREATE OR REPLACE VIEW replaceable_view AS SELECT id, name FROM items;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'replaceable_view');
            
            expect(view).toBeDefined();
        });
    });

    describe('View with aggregation', () => {
        it('should parse view with GROUP BY', () => {
            const sql = `
                CREATE VIEW category_stats AS
                SELECT category_id, COUNT(*) AS product_count, AVG(price) AS avg_price
                FROM products
                GROUP BY category_id
                HAVING COUNT(*) > 0;
            `;
            const result = parsePostgresSQL(sql);
            const view = result.views.find(v => v.name === 'category_stats');
            
            expect(view?.query).toContain('GROUP BY');
        });
    });
});
