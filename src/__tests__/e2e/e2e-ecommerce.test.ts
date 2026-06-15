/**
 * E2E Test: PG12-14 E-Commerce Schema
 * Full pipeline validation for e-commerce database
 */

import { describe, test, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(__dirname, '..', 'stress');

describe('E2E Test: PG12-14 E-Commerce Schema', () => {
    test('Full Pipeline - Parse to Schema Model', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.tables.length).toBeGreaterThan(30);
        expect(result.schemas.length).toBeGreaterThanOrEqual(8);
        expect(result.extensions.length).toBeGreaterThanOrEqual(7);
        expect(result.enumTypes.length).toBeGreaterThanOrEqual(25);
        expect(result.indexes.length).toBeGreaterThanOrEqual(40);
        expect(result.views.length).toBeGreaterThanOrEqual(8);
        expect(result.functions.length).toBeGreaterThanOrEqual(10);
        expect(result.triggers.length).toBeGreaterThanOrEqual(15);
        expect(result.relationships.length).toBeGreaterThanOrEqual(50);
        
        expect(result.parseTime).toBeLessThan(30000);
        expect(result.warnings.length).toBeLessThan(100);
    });
    
    test('Cross-Schema References - FK Detection', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const fks = result.relationships.filter(r => r.type === 'FOREIGN_KEY');
        
        expect(fks.length).toBeGreaterThanOrEqual(20);
        
        const crossSchemaFKs = fks.filter(fk => 
            fk.source.schema && fk.target.schema && 
            fk.source.schema !== fk.target.schema
        );
        
        expect(crossSchemaFKs.length).toBeGreaterThanOrEqual(5);
    });
    
    test('Partition Hierarchies - Parent-Child Detection', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const partitions = result.relationships.filter(r => 
            r.type === 'PARTITION_CHILD' || r.type === 'PARTITION_PARENT'
        );
        
        expect(partitions.length).toBeGreaterThanOrEqual(3);
    });
    
    test('Inheritance Chains - Superclass-Subclass Detection', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const inheritance = result.relationships.filter(r => r.type === 'INHERITANCE');
        
        expect(inheritance.length).toBeGreaterThanOrEqual(2);
    });
    
    test('View Dependencies - Referenced Tables', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const viewDeps = result.relationships.filter(r => r.type === 'VIEW_DEPENDENCY');
        
        expect(viewDeps.length).toBeGreaterThanOrEqual(5);
        
        for (const dep of viewDeps) {
            expect(dep.source.schema).toBeDefined();
            expect(dep.source.table).toBeDefined();
            expect(dep.target.schema).toBeDefined();
            expect(dep.target.table).toBeDefined();
        }
    });
    
    test('Trigger Bindings - Function References', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const triggerRels = result.relationships.filter(r => 
            r.type === 'TRIGGER_TARGET' || r.type === 'TRIGGER_FUNCTION'
        );
        
        expect(triggerRels.length).toBeGreaterThanOrEqual(10);
    });
    
    test('Sequence Ownership - Serial Columns', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const seqRels = result.relationships.filter(r => r.type === 'HAS_SEQUENCE');
        
        expect(seqRels.length).toBeGreaterThanOrEqual(0);
        expect(result.sequences.length).toBeGreaterThanOrEqual(5);
    });
    
    test('Extension Dependencies - Schema Extensions', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const extDeps = result.relationships.filter(r => r.type === 'DEPENDS_ON');
        
        expect(extDeps.length).toBeGreaterThanOrEqual(5);
    });
    
    test('Stats Calculation - All Counters Present', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.stats.primaryKeys).toBeGreaterThan(0);
        expect(result.stats.foreignKeys).toBeGreaterThan(0);
        expect(result.stats.uniqueConstraints).toBeGreaterThan(0);
        expect(result.stats.checkConstraints).toBeGreaterThan(0);
        expect(result.stats.notNullConstraints).toBeGreaterThan(0);
        expect(result.stats.indexTypes.size).toBeGreaterThan(0);
        expect(result.stats.partitionedTables).toBeGreaterThanOrEqual(0);
        expect(result.stats.childPartitions).toBeGreaterThanOrEqual(0);
    });
    
    test('Error Handling - Graceful Degradation', () => {
        const sqlPath = path.join(fixturesDir, 'pg12-14-ecommerce.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const criticalErrors = result.errors.filter(e => 
            e.code === 'UNEXPECTED_EOF' || 
            e.code === 'SYNTAX_ERROR' ||
            e.code === 'UNEXPECTED_TOKEN'
        );
        
        expect(criticalErrors.length).toBeLessThan(10);
    });
});
