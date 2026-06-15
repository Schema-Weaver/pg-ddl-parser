import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Index } from '../../types';

describe('Edge Cases: Indexes (PG12-19)', () => {
    describe('Multi-column indexes with ordering', () => {
        it('should parse ASC/DESC and NULLS FIRST/LAST per column', () => {
            const sql = `
                CREATE INDEX idx_sorting ON events (
                    created_at DESC,
                    priority ASC NULLS FIRST,
                    name DESC NULLS LAST
                );
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_sorting');
            
            expect(index).toBeDefined();
            expect(index?.columns).toHaveLength(3);
            
            expect(index?.columns[0].column).toBe('created_at');
            expect(index?.columns[0].order).toBe('DESC');
            
            expect(index?.columns[1].column).toBe('priority');
            expect(index?.columns[1].order).toBe('ASC');
            expect(index?.columns[1].nulls).toBe('FIRST');
            
            expect(index?.columns[2].column).toBe('name');
            expect(index?.columns[2].order).toBe('DESC');
            expect(index?.columns[2].nulls).toBe('LAST');
        });
    });

    describe('Partial indexes', () => {
        it('should parse WHERE clause for partial index', () => {
            const sql = `
                CREATE INDEX idx_active_users ON users (email) 
                WHERE active = true AND deleted_at IS NULL;
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_active_users');
            
            expect(index).toBeDefined();
            expect(index?.isPartial).toBe(true);
            expect(index?.whereClause).toContain('active = true');
            expect(index?.whereClause).toContain('deleted_at IS NULL');
        });
    });

    describe('Expression indexes', () => {
        it('should parse function expression index', () => {
            const sql = `
                CREATE INDEX idx_lower_email ON users (LOWER(email));
                CREATE INDEX idx_json_data ON events ((data->>'key'));
                CREATE INDEX idx_computed ON orders ((col1 + col2));
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.indexes).toHaveLength(3);
            
            const lowerIndex = result.indexes.find(i => i.name === 'idx_lower_email');
            expect(lowerIndex?.columns[0].column).toContain('LOWER');
        });
    });

    describe('[PG12] Covering indexes', () => {
        it('should parse INCLUDE columns', () => {
            const sql = `
                CREATE INDEX idx_covering ON orders (user_id) INCLUDE (status, created_at, total);
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_covering');
            
            expect(index).toBeDefined();
            expect(index?.includeColumns).toBeDefined();
            expect(index?.includeColumns).toContain('status');
            expect(index?.includeColumns).toContain('created_at');
            expect(index?.includeColumns).toContain('total');
        });
    });

    describe('Index methods', () => {
        it('should parse all index access methods', () => {
            const sql = `
                CREATE INDEX idx_btree ON users (id);
                CREATE INDEX idx_hash ON users (email) USING hash;
                CREATE INDEX idx_gist ON logs (data) USING gist;
                CREATE INDEX idx_gin ON documents (content) USING gin;
                CREATE INDEX idx_spgist ON points (location) USING spgist;
                CREATE INDEX idx_brin ON events (created_at) USING brin;
            `;
            const result = parsePostgresSQL(sql);
            
            const btree = result.indexes.find(i => i.name === 'idx_btree');
            expect(btree?.type).toBe('btree');
            
            const hash = result.indexes.find(i => i.name === 'idx_hash');
            expect(hash?.type).toBe('hash');
            
            const gist = result.indexes.find(i => i.name === 'idx_gist');
            expect(gist?.type).toBe('gist');
            
            const gin = result.indexes.find(i => i.name === 'idx_gin');
            expect(gin?.type).toBe('gin');
            
            const spgist = result.indexes.find(i => i.name === 'idx_spgist');
            expect(spgist?.type).toBe('spgist');
            
            const brin = result.indexes.find(i => i.name === 'idx_brin');
            expect(brin?.type).toBe('brin');
        });
    });

    describe('BRIN index options', () => {
        it('should parse BRIN WITH pages_per_range', () => {
            const sql = `
                CREATE INDEX idx_brin_opts ON events (created_at) USING brin 
                WITH (pages_per_range=32, autosummarize=on);
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_brin_opts');
            
            expect(index?.type).toBe('brin');
            expect(index?.['with']).toBeDefined();
            expect(index?.['with']?.pages_per_range).toBe(32);
            expect(index?.['with']?.autosummarize).toBe(true);
        });
    });

    describe('GIN index options', () => {
        it('should parse GIN WITH fastupdate', () => {
            const sql = `
                CREATE INDEX idx_gin_opts ON documents (content) USING gin 
                WITH (fastupdate=on, gin_pending_list_limit=2048);
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_gin_opts');
            
            expect(index?.['with']?.fastupdate).toBe(true);
            expect(index?.['with']?.gin_pending_list_limit).toBe(2048);
        });
    });

    describe('[PG12] CONCURRENTLY', () => {
        it('should parse CREATE INDEX CONCURRENTLY', () => {
            const sql = `
                CREATE INDEX CONCURRENTLY idx_concurrent ON large_table (column);
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_concurrent');
            
            expect(index?.concurrently).toBe(true);
        });
    });

    describe('[PG15] NULLS NOT DISTINCT', () => {
        it('should parse unique index with NULLS NOT DISTINCT', () => {
            const sql = `
                CREATE UNIQUE INDEX idx_unique_nulls ON users (email) NULLS NOT DISTINCT;
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_unique_nulls');
            
            expect(index?.isUnique).toBe(true);
        });
    });

    describe('Index with COLLATE', () => {
        it('should parse COLLATE per column', () => {
            const sql = `
                CREATE INDEX idx_collate ON users (name COLLATE "en_US", email COLLATE "C");
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_collate');
            
            expect(index?.columns[0].collation).toBe('en_US');
            expect(index?.columns[1].collation).toBe('C');
        });
    });

    describe('Index with opclass', () => {
        it('should parse operator class with options', () => {
            const sql = `
                CREATE INDEX idx_trgm ON users (name gist_trgm_ops(siglen=32));
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_trgm');
            
            expect(index).toBeDefined();
            expect(index?.columns[0].operatorClass).toContain('gist_trgm_ops');
        });
    });

    describe('ALTER INDEX', () => {
        it('should parse ALTER INDEX SET/RESET', () => {
            const sql = `
                CREATE INDEX idx_config ON events (id);
                ALTER INDEX idx_config SET (fillfactor=90);
                ALTER INDEX idx_config RESET (fillfactor);
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.indexes).toBeDefined();
        });
    });

    describe('[PG15] ALTER INDEX ATTACH PARTITION', () => {
        it('should parse partition index attachment', () => {
            const sql = `
                CREATE INDEX idx_parent ON parent_table (id);
                CREATE INDEX idx_child ON child_partition (id);
                ALTER INDEX idx_parent ATTACH PARTITION idx_child;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.indexes).toHaveLength(2);
        });
    });

    describe('[PG12] ALTER INDEX SET TABLESPACE', () => {
        it('should parse tablespace change', () => {
            const sql = `
                CREATE INDEX idx_ts ON events (id);
                ALTER INDEX idx_ts SET TABLESPACE pg_default;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.indexes).toBeDefined();
        });
    });

    describe('DROP INDEX', () => {
        it('should parse DROP INDEX IF EXISTS CASCADE', () => {
            const sql = `
                CREATE INDEX idx_to_drop ON events (id);
                DROP INDEX IF EXISTS idx_to_drop CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.indexes).toBeDefined();
        });
    });

    describe('[PG13] BRIN deduplication', () => {
        it('should parse BRIN WITH deduplicate_items', () => {
            const sql = `
                CREATE INDEX idx_brin_dedup ON events (id) USING brin 
                WITH (deduplicate_items=on);
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_brin_dedup');
            
            expect(index?.['with']?.deduplicate_items).toBe(true);
        });
    });

    describe('[PG14] jsonb subscript expression', () => {
        it('should parse jsonb subscript in index expression', () => {
            const sql = `
                CREATE INDEX idx_jsonb_sub ON events ((data['key']));
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_jsonb_sub');
            
            expect(index).toBeDefined();
        });
    });

    describe('[PG15] NULLS NOT DISTINCT with partial WHERE', () => {
        it('should parse combined NULLS NOT DISTINCT and WHERE', () => {
            const sql = `
                CREATE UNIQUE INDEX idx_unique_partial ON users (email) 
                NULLS NOT DISTINCT 
                WHERE active = true;
            `;
            const result = parsePostgresSQL(sql);
            const index = result.indexes.find(i => i.name === 'idx_unique_partial');
            
            expect(index?.isUnique).toBe(true);
            expect(index?.isPartial).toBe(true);
            expect(index?.whereClause).toContain('active = true');
        });
    });
});
