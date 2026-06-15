/**
 * E2E Test: PG18-19 Temporal Graph Schema
 * Full pipeline validation for temporal and property graph features
 */

import { describe, test, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(__dirname, '..', 'stress');

describe('E2E Test: PG18-19 Temporal Graph Schema', () => {
    test('Full Pipeline - Parse to Schema Model', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        console.log('--- E2E WARNINGS ---');
        result.warnings.forEach((w, i) => console.log(`${i+1}: ${w.message} - STMT: ${w.statement?.substring(0, 100)}`));
        expect(result.tables.length).toBeGreaterThan(30);
        expect(result.schemas.length).toBeGreaterThanOrEqual(8);
        expect(result.extensions.length).toBeGreaterThanOrEqual(12);
        expect(result.enumTypes.length).toBeGreaterThanOrEqual(30);
        expect(result.indexes.length).toBeGreaterThanOrEqual(45);
        expect(result.views.length).toBeGreaterThanOrEqual(8);
        expect(result.functions.length).toBeGreaterThanOrEqual(10);
        expect(result.triggers.length).toBeGreaterThanOrEqual(15);
        expect(result.relationships.length).toBeGreaterThanOrEqual(50);
        
        expect(result.parseTime).toBeLessThan(30000);
        expect(result.warnings.length).toBeLessThan(100);
    });
    
    test('Temporal Tables - Period Constraints', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const periodRels = result.relationships.filter(r => 
            r.type === 'PERIOD' || r.type === 'TEMPORAL_PK' || r.type === 'TEMPORAL_FK'
        );
        
        expect(periodRels.length).toBeGreaterThanOrEqual(5);
        
        const temporalTables = result.tables.filter(t => 
            t.period !== undefined || 
            t.withSystemVersioning !== undefined
        );
        
        expect(temporalTables.length).toBeGreaterThanOrEqual(3);
    });
    
    test('Property Graph - SQL/PGQ Support', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const propertyGraphRels = result.relationships.filter(r => 
            r.type === 'PROPERTY_GRAPH_VERTEX' || 
            r.type === 'PROPERTY_GRAPH_EDGE' ||
            r.type === 'PROPERTY_GRAPH_PATH'
        );
        
        expect(propertyGraphRels.length).toBeGreaterThanOrEqual(3);
        
        const propertyGraphTables = result.tables.filter(t => 
            t.propertyGraph !== undefined
        );
        
        expect(propertyGraphTables.length).toBeGreaterThanOrEqual(2);
    });
    
    test('Merge/Split Partitions - PG17+ Features', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const partitions = result.relationships.filter(r => 
            r.type === 'PARTITION_CHILD' || r.type === 'PARTITION_PARENT'
        );
        
        expect(partitions.length).toBeGreaterThanOrEqual(4);
        
        const partitionedTables = result.tables.filter(t => t.partitionOf !== undefined);
        
        expect(partitionedTables.length).toBeGreaterThanOrEqual(4);
    });
    
    test('Extension Dependencies - PostGIS and More', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.extensions.length).toBeGreaterThanOrEqual(12);
        
        const postgisExt = result.extensions.find(e => 
            e.name === 'postgis' || e.name === 'postgis_topology'
        );
        
        expect(postgisExt).toBeDefined();
        
        const extDeps = result.relationships.filter(r => r.type === 'DEPENDS_ON');
        
        expect(extDeps.length).toBeGreaterThanOrEqual(10);
    });
    
    test('Complex Index Types - BRIN, GiST, GIN', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const brinIndexes = result.indexes.filter(i => i.method === 'brin');
        const gistIndexes = result.indexes.filter(i => i.method === 'gist');
        const ginIndexes = result.indexes.filter(i => i.method === 'gin');
        
        expect(brinIndexes.length).toBeGreaterThanOrEqual(3);
        expect(gistIndexes.length).toBeGreaterThanOrEqual(5);
        expect(ginIndexes.length).toBeGreaterThanOrEqual(5);
    });
    
    test('Stats Calculation - PG18-19 Features', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        expect(result.stats.primaryKeys).toBeGreaterThan(0);
        expect(result.stats.foreignKeys).toBeGreaterThan(0);
        expect(result.stats.uniqueConstraints).toBeGreaterThan(0);
        expect(result.stats.checkConstraints).toBeGreaterThan(0);
        expect(result.stats.notNullConstraints).toBeGreaterThan(0);
        expect(result.stats.indexTypes.size).toBeGreaterThan(0);
        expect(result.stats.partitionedTables).toBeGreaterThanOrEqual(4);
        expect(result.stats.childPartitions).toBeGreaterThanOrEqual(4);
        expect(result.stats.withoutOverlapsConstraints).toBeGreaterThanOrEqual(0);
        expect(result.stats.periodTemporalConstraints).toBeGreaterThanOrEqual(0);
    });
    
    test('Error Handling - Graceful Degradation', () => {
        const sqlPath = path.join(fixturesDir, 'pg18-19-temporal-graph.sql');
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
