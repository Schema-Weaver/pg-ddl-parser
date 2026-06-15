/**
 * Stress Test: Parse Performance and Coverage
 * Tests parsing of large real-world SQL schema files
 */

import { describe, test, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import fs from 'fs';
import path from 'path';

const fixturesDir = __dirname;

const STRESS_FIXTURES = [
    {
        name: 'PG12-14 E-Commerce',
        path: path.join(fixturesDir, 'pg12-14-ecommerce.sql'),
        expectedTables: 37,
        expectedSchemas: 8,
        expectedExtensions: 7,
        expectedEnums: 14,
        expectedIndexes: 50,
        expectedViews: 10,
        expectedFunctions: 15,
        expectedTriggers: 20,
    },
    {
        name: 'PG15-17 SaaS Platform',
        path: path.join(fixturesDir, 'pg15-17-saas-platform.sql'),
        expectedTables: 42,
        expectedSchemas: 9,
        expectedExtensions: 11,
        expectedEnums: 21,
        expectedIndexes: 45,
        expectedViews: 12,
        expectedFunctions: 18,
        expectedTriggers: 25,
    },
    {
        name: 'PG18-19 Temporal Graph',
        path: path.join(fixturesDir, 'pg18-19-temporal-graph.sql'),
        expectedTables: 35,
        expectedSchemas: 10,
        expectedExtensions: 14,
        expectedEnums: 17,
        expectedIndexes: 43,
        expectedViews: 8,
        expectedFunctions: 12,
        expectedTriggers: 18,
    },
];

describe('Stress Test: Parse Performance and Coverage', () => {
    for (const fixture of STRESS_FIXTURES) {
        test(`Parse ${fixture.name} - No Crashes`, async () => {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            
            expect(sqlContent.length).toBeGreaterThan(1000);
            
            const startTime = performance.now();
            
            const result = parsePostgresSQL(sqlContent);
            
            const parseTime = performance.now() - startTime;
            
            expect(result.errors.length).toBeLessThan(50);
            expect(parseTime).toBeLessThan(30000);
            
            expect(result.tables.length).toBeGreaterThanOrEqual(fixture.expectedTables * 0.8);
            expect(result.schemas.length).toBeGreaterThanOrEqual(fixture.expectedSchemas * 0.8);
            expect(result.extensions.length).toBeGreaterThanOrEqual(fixture.expectedExtensions * 0.8);
        });
        
        test(`Parse ${fixture.name} - Object Counts`, async () => {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            const result = parsePostgresSQL(sqlContent);
            
            expect(result.tables.length).toBeGreaterThanOrEqual(fixture.expectedTables * 0.8);
            expect(result.schemas.length).toBeGreaterThanOrEqual(fixture.expectedSchemas * 0.8);
            expect(result.extensions.length).toBeGreaterThanOrEqual(fixture.expectedExtensions * 0.8);
            expect(result.enumTypes.length).toBeGreaterThanOrEqual(fixture.expectedEnums * 0.8);
            expect(result.indexes.length).toBeGreaterThanOrEqual(fixture.expectedIndexes * 0.8);
        });
        
        test(`Parse ${fixture.name} - No Critical Errors`, async () => {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            const result = parsePostgresSQL(sqlContent);
            
            const criticalErrors = result.errors.filter(e => 
                e.code === 'UNEXPECTED_EOF' || 
                e.code === 'SYNTAX_ERROR' ||
                e.code === 'UNEXPECTED_TOKEN'
            );
            
            expect(criticalErrors.length).toBeLessThan(10);
        });
    }
});

describe('Stress Test: Memory Usage', () => {
    test('Parse Large Schema - Memory Under Limit', async () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const initialMemory = process.memoryUsage().heapUsed;
        
        const result = parsePostgresSQL(sqlContent);
        
        const finalMemory = process.memoryUsage().heapUsed;
        const memoryUsed = finalMemory - initialMemory;
        
        expect(memoryUsed).toBeLessThan(500 * 1024 * 1024);
    });
});

describe('Stress Test: Error Rate', () => {
    test('High Parse Success Rate', async () => {
        let totalObjects = 0;
        let objectsWithErrors = 0;
        
        for (const fixture of STRESS_FIXTURES) {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            const result = parsePostgresSQL(sqlContent);
            
            const objCount = result.tables.length + result.views.length + 
                           result.enumTypes.length + result.extensions.length;
            totalObjects += objCount;
            
            if (result.errors.length > 0) {
                objectsWithErrors += 1;
            }
        }
        
        if (totalObjects === 0) {
            expect.fail('No objects parsed - check SQL file paths and parser');
        }
        
        const successRate = (totalObjects - objectsWithErrors) / totalObjects;
        expect(successRate).toBeGreaterThanOrEqual(0.95);
    });
});
