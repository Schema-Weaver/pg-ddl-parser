import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import { tokenize } from '../../tokenizer/tokenizer';
import { splitStatements } from '../../splitter/statement-splitter';

describe('Debug RLS', () => {
    it('should enable RLS on table', () => {
        const sql = `
            CREATE TABLE sensitive_data (
                id SERIAL PRIMARY KEY,
                data TEXT
            );
            ALTER TABLE sensitive_data ENABLE ROW LEVEL SECURITY;
        `;
        
        // Check tokenizer/splitter first
        const tokens = tokenize(sql);
        const stmts = splitStatements(tokens);
        console.log('Statements:');
        for (const s of stmts) {
            console.log(`  type=${s.type}, text="${s.text.substring(0, 80)}"`);
        }
        
        const result = parsePostgresSQL(sql);
        console.log('Tables:', result.tables.map(t => ({ name: t.name, rls: t.rlsEnabled, schema: t.schema })));
        console.log('Warnings:', result.warnings.map(w => w.message));
        console.log('Errors:', result.errors.map(e => e.message));
        
        const table = result.tables.find(t => t.name === 'sensitive_data');
        expect(table).toBeDefined();
        expect(table?.rlsEnabled).toBe(true);
    });
});
