import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { Trigger } from '../../types';

describe('Edge Cases: Triggers (PG12-19)', () => {
    describe('Trigger timing and events', () => {
        it('should parse BEFORE INSERT trigger', () => {
            const sql = `
                CREATE TABLE audit_log (
                    id SERIAL PRIMARY KEY,
                    action TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE TRIGGER trg_before_insert
                BEFORE INSERT ON audit_log
                FOR EACH ROW EXECUTE FUNCTION log_audit_event();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_before_insert');
            
            expect(trigger).toBeDefined();
            expect(trigger?.timing).toBe('BEFORE');
            expect(trigger?.events).toContain('INSERT');
            expect(trigger?.level).toBe('ROW');
            expect(trigger?.function).toBe('log_audit_event');
        });

        it('should parse AFTER UPDATE/DELETE trigger', () => {
            const sql = `
                CREATE TRIGGER trg_after_changes
                AFTER UPDATE OR DELETE ON orders
                FOR EACH ROW EXECUTE FUNCTION track_changes();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_after_changes');
            
            expect(trigger?.timing).toBe('AFTER');
            expect(trigger?.events).toContain('UPDATE');
            expect(trigger?.events).toContain('DELETE');
        });

        it('should parse INSTEAD OF trigger on view', () => {
            const sql = `
                CREATE VIEW order_summary AS SELECT id, status FROM orders;
                CREATE TRIGGER trg_instead_insert
                INSTEAD OF INSERT ON order_summary
                FOR EACH ROW EXECUTE FUNCTION handle_view_insert();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_instead_insert');
            
            expect(trigger?.timing).toBe('INSTEAD OF');
            expect(trigger?.level).toBe('ROW');
        });

        it('should parse TRUNCATE trigger', () => {
            const sql = `
                CREATE TRIGGER trg_truncate
                BEFORE TRUNCATE ON logs
                FOR EACH STATEMENT EXECUTE FUNCTION warn_truncate();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_truncate');
            
            expect(trigger?.timing).toBe('BEFORE');
            expect(trigger?.events).toContain('TRUNCATE');
            expect(trigger?.level).toBe('STATEMENT');
        });
    });

    describe('WHEN condition', () => {
        it('should parse WHEN condition', () => {
            const sql = `
                CREATE TRIGGER trg_conditional
                BEFORE UPDATE ON products
                FOR EACH ROW
                WHEN (NEW.price <> OLD.price)
                EXECUTE FUNCTION log_price_change();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_conditional');
            
            expect(trigger?.condition).toBeDefined();
            expect(trigger?.condition).toContain('NEW.price');
            expect(trigger?.condition).toContain('OLD.price');
        });
    });

    describe('[PG10+] Transition tables', () => {
        it('should parse REFERENCING NEW TABLE AS', () => {
            const sql = `
                CREATE TRIGGER trg_with_transition
                AFTER INSERT ON orders
                REFERENCING NEW TABLE AS new_rows
                FOR EACH STATEMENT EXECUTE FUNCTION bulk_process_new();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_with_transition');
            
            expect(trigger?.referencing).toBeDefined();
            expect(trigger?.referencing?.newTable).toBe('new_rows');
        });

        it('should parse REFERENCING OLD/NEW TABLE AS', () => {
            const sql = `
                CREATE TRIGGER trg_both_tables
                AFTER UPDATE ON products
                REFERENCING OLD TABLE AS deleted_rows NEW TABLE AS inserted_rows
                FOR EACH STATEMENT EXECUTE FUNCTION sync_changes();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_both_tables');
            
            expect(trigger?.referencing?.oldTable).toBe('deleted_rows');
            expect(trigger?.referencing?.newTable).toBe('inserted_rows');
        });
    });

    describe('DEFERRABLE triggers', () => {
        it('should parse DEFERRABLE INITIALLY DEFERRED', () => {
            const sql = `
                CREATE CONSTRAINT TRIGGER trg_deferred
                AFTER INSERT ON orders
                DEFERRABLE INITIALLY DEFERRED
                FOR EACH ROW EXECUTE FUNCTION check_order_constraints();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_deferred');
            
            expect(trigger?.deferrable).toBe(true);
            expect(trigger?.initiallyDeferred).toBe(true);
        });
    });

    describe('UPDATE OF specific columns', () => {
        it('should parse UPDATE OF columns', () => {
            const sql = `
                CREATE TRIGGER trg_specific_cols
                AFTER UPDATE OF status, priority ON tasks
                FOR EACH ROW EXECUTE FUNCTION notify_status_change();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_specific_cols');
            
            expect(trigger?.events).toContain('UPDATE');
        });
    });

    describe('Trigger function with arguments', () => {
        it('should parse EXECUTE FUNCTION with arguments', () => {
            const sql = `
                CREATE TRIGGER trg_with_args
                BEFORE INSERT ON events
                FOR EACH ROW EXECUTE FUNCTION process_event('arg1', 'arg2');
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_with_args');
            
            expect(trigger?.function).toBe('process_event');
        });
    });

    describe('[PG13] Triggers on partitioned tables', () => {
        it('should handle trigger on partitioned table', () => {
            const sql = `
                CREATE TABLE measurements (
                    id SERIAL,
                    recorded_at TIMESTAMPTZ,
                    value NUMERIC
                ) PARTITION BY RANGE (recorded_at);
                
                CREATE TRIGGER trg_partition_audit
                BEFORE INSERT ON measurements
                FOR EACH ROW EXECUTE FUNCTION audit_insert();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_partition_audit');
            
            expect(trigger).toBeDefined();
            expect(trigger?.table).toBe('measurements');
        });
    });

    describe('[PG13] ENABLE/DISABLE TRIGGER', () => {
        it('should parse ALTER TABLE ENABLE TRIGGER', () => {
            const sql = `
                CREATE TABLE test_table (id SERIAL PRIMARY KEY);
                CREATE TRIGGER trg_test BEFORE INSERT ON test_table
                FOR EACH ROW EXECUTE FUNCTION dummy_func();
                ALTER TABLE test_table ENABLE TRIGGER trg_test;
                ALTER TABLE test_table DISABLE TRIGGER trg_test;
                ALTER TABLE test_table ENABLE REPLICA TRIGGER trg_test;
                ALTER TABLE test_table ENABLE ALWAYS TRIGGER trg_test;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.triggers).toBeDefined();
        });
    });

    describe('ALTER TRIGGER', () => {
        it('should parse ALTER TRIGGER RENAME', () => {
            const sql = `
                CREATE TABLE items (id SERIAL PRIMARY KEY);
                CREATE TRIGGER old_name BEFORE INSERT ON items
                FOR EACH ROW EXECUTE FUNCTION dummy_func();
                ALTER TRIGGER old_name ON items RENAME TO new_name;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.triggers).toBeDefined();
        });
    });

    describe('DROP TRIGGER', () => {
        it('should parse DROP TRIGGER IF EXISTS CASCADE', () => {
            const sql = `
                CREATE TABLE to_drop (id SERIAL PRIMARY KEY);
                CREATE TRIGGER trg_to_drop BEFORE INSERT ON to_drop
                FOR EACH ROW EXECUTE FUNCTION dummy_func();
                DROP TRIGGER IF EXISTS trg_to_drop ON to_drop CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.triggers).toBeDefined();
        });
    });

    describe('Multiple triggers with firing order', () => {
        it('should handle multiple triggers on same table', () => {
            const sql = `
                CREATE TABLE multi_trigger_table (id SERIAL PRIMARY KEY);
                CREATE TRIGGER trg_first BEFORE INSERT ON multi_trigger_table
                FOR EACH ROW EXECUTE FUNCTION first_func();
                CREATE TRIGGER trg_second BEFORE INSERT ON multi_trigger_table
                FOR EACH ROW EXECUTE FUNCTION second_func();
                CREATE TRIGGER trg_third AFTER INSERT ON multi_trigger_table
                FOR EACH ROW EXECUTE FUNCTION third_func();
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.triggers).toHaveLength(3);
        });
    });

    describe('[PG14] Triggers with transition tables on partitioned tables', () => {
        it('should parse transition tables on partitioned table', () => {
            const sql = `
                CREATE TABLE events_partitioned (
                    id SERIAL,
                    event_time TIMESTAMPTZ,
                    data JSONB
                ) PARTITION BY RANGE (event_time);
                
                CREATE TRIGGER trg_partition_transition
                AFTER INSERT ON events_partitioned
                REFERENCING NEW TABLE AS new_events
                FOR EACH STATEMENT EXECUTE FUNCTION process_batch();
            `;
            const result = parsePostgresSQL(sql);
            const trigger = result.triggers.find(t => t.name === 'trg_partition_transition');
            
            expect(trigger?.referencing?.newTable).toBe('new_events');
        });
    });

    describe('Trigger function returning TRIGGER type', () => {
        it('should identify trigger functions', () => {
            const sql = `
                CREATE FUNCTION trigger_handler() RETURNS TRIGGER
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    RETURN NEW;
                END;
                $$;
                
                CREATE TRIGGER uses_trigger_func
                BEFORE INSERT ON items
                FOR EACH ROW EXECUTE FUNCTION trigger_handler();
            `;
            const result = parsePostgresSQL(sql);
            
            const func = result.functions.find(f => f.name === 'trigger_handler');
            expect(func?.returnType).toBe('TRIGGER');
        });
    });
});
