/**
 * E2E Test: PG15-17 SaaS Platform Schema
 * Full pipeline validation for multi-tenant SaaS database
 */

import { describe, test, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(__dirname, '..', 'stress');

describe('E2E Test: PG15-17 SaaS Platform Schema', () => {
    test('Full Pipeline - Parse to Schema Model', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.tables.length).toBeGreaterThan(35);
        expect(result.schemas.length).toBeGreaterThanOrEqual(9);
        expect(result.extensions.length).toBeGreaterThanOrEqual(10);
        expect(result.enumTypes.length).toBeGreaterThanOrEqual(35);
        expect(result.indexes.length).toBeGreaterThanOrEqual(50);
        expect(result.views.length).toBeGreaterThanOrEqual(10);
        expect(result.functions.length).toBeGreaterThanOrEqual(15);
        expect(result.triggers.length).toBeGreaterThanOrEqual(20);
        expect(result.relationships.length).toBeGreaterThanOrEqual(60);
        
        expect(result.parseTime).toBeLessThan(30000);
        expect(result.warnings.length).toBeLessThan(100);
    });
    
    test('Multi-Tenant Schema - Tenant Isolation', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const tenantTables = result.tables.filter(t => 
            t.name.includes('tenant') || 
            t.name.includes('organization') ||
            t.name.includes('subscription')
        );
        
        expect(tenantTables.length).toBeGreaterThanOrEqual(8);
        
        const tenantFKs = result.relationships.filter(r => 
            r.type === 'FOREIGN_KEY' &&
            (r.source.table.includes('tenant') || r.target.table.includes('tenant'))
        );
        
        expect(tenantFKs.length).toBeGreaterThanOrEqual(15);
    });
    
    test('Partition Hierarchies - Time-Based Partitioning', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const partitions = result.relationships.filter(r => 
            r.type === 'PARTITION_CHILD' || r.type === 'PARTITION_PARENT'
        );
        
        expect(partitions.length).toBeGreaterThanOrEqual(5);
        
        const partitionedTables = result.tables.filter(t => t.partitionOf !== undefined);
        
        expect(partitionedTables.length).toBeGreaterThanOrEqual(5);
    });
    
    test('Temporal Features - Period Constraints', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const periodRels = result.relationships.filter(r => 
            r.type === 'PERIOD' || r.type === 'TEMPORAL_PK' || r.type === 'TEMPORAL_FK'
        );
        
        expect(periodRels.length).toBeGreaterThanOrEqual(3);
    });
    
    test('RLS Policies - Row-Level Security', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.policies.length).toBeGreaterThanOrEqual(10);
        
        const rlsPolicies = result.policies.filter(p => 
            p.cmd === 'SELECT' || p.cmd === 'INSERT' || 
            p.cmd === 'UPDATE' || p.cmd === 'DELETE'
        );
        
        expect(rlsPolicies.length).toBeGreaterThanOrEqual(8);
    });
    
    test('Extension Dependencies - Extension Usage', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.extensions.length).toBeGreaterThanOrEqual(10);
        
        const extDeps = result.relationships.filter(r => r.type === 'DEPENDS_ON');
        
        expect(extDeps.length).toBeGreaterThanOrEqual(10);
    });
    
    test('Stats Calculation - Advanced Features', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.stats.primaryKeys).toBeGreaterThan(0);
        expect(result.stats.foreignKeys).toBeGreaterThan(0);
        expect(result.stats.uniqueConstraints).toBeGreaterThan(0);
        expect(result.stats.checkConstraints).toBeGreaterThan(0);
        expect(result.stats.notNullConstraints).toBeGreaterThan(0);
        expect(result.stats.indexTypes.size).toBeGreaterThan(0);
        expect(result.stats.partitionedTables).toBeGreaterThanOrEqual(5);
        expect(result.stats.childPartitions).toBeGreaterThanOrEqual(5);
        expect(result.stats.temporalTables).toBeGreaterThanOrEqual(0);
    });
    
    test('Error Handling - Graceful Degradation', () => {
        const sqlPath = path.join(fixturesDir, 'pg15-17-saas-platform.sql');
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
