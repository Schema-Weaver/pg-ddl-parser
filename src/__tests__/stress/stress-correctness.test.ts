/**
 * Stress Test: Parse Correctness
 * Tests that parsed objects have correct structure and data
 */

import { describe, test, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import fs from 'fs';
import path from 'path';

const fixturesDir = __dirname;

describe('Stress Test: Parse Correctness', () => {
    test('Table Structure - All Required Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const table of result.tables) {
            expect(table.name).toBeDefined();
            expect(table.schema).toBeDefined();
            expect(Array.isArray(table.columns)).toBe(true);
            expect(table.columns.length).toBeGreaterThan(0);
            
            for (const col of table.columns) {
                expect(col.name).toBeDefined();
                expect(col.type).toBeDefined();
            }
        }
    });
    
    test('Enum Structure - All Values Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const enumType of result.enumTypes) {
            expect(enumType.name).toBeDefined();
            expect(enumType.schema).toBeDefined();
            expect(Array.isArray(enumType.values)).toBe(true);
            expect(enumType.values.length).toBeGreaterThan(0);
            
            for (const value of enumType.values) {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
            }
        }
    });
    
    test('Index Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const index of result.indexes) {
            expect(index.name).toBeDefined();
            expect(index.table).toBeDefined();
            expect(Array.isArray(index.columns)).toBe(true);
            
            if (index.columns.length > 0) {
                expect(index.columns[0]).toMatchObject({
                    column: expect.any(String),
                });
            }
        }
    });
    
    test('View Structure - Query Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const view of result.views) {
            expect(view.name).toBeDefined();
            expect(view.schema).toBeDefined();
            expect(typeof view.query).toBe('string');
            expect(view.query.length).toBeGreaterThan(0);
        }
    });
    
    test('Function Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const func of result.functions) {
            expect(func.name).toBeDefined();
            expect(Array.isArray(func.arguments)).toBe(true);
            expect(typeof func.body).toBe('string');
        }
    });
    
    test('Trigger Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const trigger of result.triggers) {
            expect(trigger.name).toBeDefined();
            expect(trigger.table).toBeDefined();
            expect(trigger.event).toBeDefined();
            expect(typeof trigger.function).toBe('string');
        }
    });
    
    test('Extension Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const ext of result.extensions) {
            expect(ext.name).toBeDefined();
            expect(ext.schema).toBeDefined();
        }
    });
    
    test('Schema Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const schema of result.schemas) {
            expect(typeof schema).toBe('string');
            expect(schema.length).toBeGreaterThan(0);
        }
    });
    
    test('Sequence Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const seq of result.sequences) {
            expect(seq.name).toBeDefined();
            expect(seq.schema).toBeDefined();
        }
    });
    
    test('Policy Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const policy of result.policies) {
            expect(policy.name).toBeDefined();
            expect(policy.table).toBeDefined();
            expect(policy.command).toBeDefined();
        }
    });
    
    test('Domain Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const domain of result.domains) {
            expect(domain.name).toBeDefined();
            expect(domain.baseType).toBeDefined();
        }
    });
    
    test('Composite Type Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const ct of result.compositeTypes) {
            expect(ct.name).toBeDefined();
            expect(ct.schema).toBeDefined();
            expect(Array.isArray(ct.fields)).toBe(true);
        }
    });
    
    test('Role Structure - All Fields Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        for (const role of result.roles) {
            expect(role.name).toBeDefined();
        }
    });
});
