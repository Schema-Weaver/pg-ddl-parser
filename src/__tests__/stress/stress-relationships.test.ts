/**
 * Stress Test: Relationship Detection
 * Tests all 9 relationship detectors at scale
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
        expectedFKs: 30,
        expectedPartitions: 5,
        expectedViews: 10,
        expectedTriggers: 20,
    },
    {
        name: 'PG15-17 SaaS Platform',
        path: path.join(fixturesDir, 'pg15-17-saas-platform.sql'),
        expectedFKs: 40,
        expectedPartitions: 8,
        expectedViews: 12,
        expectedTriggers: 25,
    },
    {
        name: 'PG18-19 Temporal Graph',
        path: path.join(fixturesDir, 'pg18-19-temporal-graph.sql'),
        expectedFKs: 35,
        expectedPartitions: 6,
        expectedViews: 8,
        expectedTriggers: 18,
    },
];

describe('Stress Test: Relationship Detection', () => {
    test('All Relationship Types Detected', () => {
        const sqlFiles = STRESS_FIXTURES.map(f => 
            fs.readFileSync(f.path, 'utf-8')
        );
        
        const allRelationships = new Map<string, Set<string>>();
        
        for (const sql of sqlFiles) {
            const result = parsePostgresSQL(sql);
            
            for (const rel of result.relationships) {
                if (!allRelationships.has(rel.type)) {
                    allRelationships.set(rel.type, new Set());
                }
                allRelationships.get(rel.type)!.add(rel.id);
            }
        }
        
        const relationshipTypes = Array.from(allRelationships.keys());
        
        expect(relationshipTypes).toContain('FOREIGN_KEY');
        expect(relationshipTypes).toContain('VIEW_DEPENDENCY');
        expect(relationshipTypes).toContain('TRIGGER_TARGET');
        expect(relationshipTypes).toContain('PARTITION_CHILD');
        expect(relationshipTypes).toContain('INHERITANCE');
    });
    
    test('Foreign Key Detection', () => {
        let totalFKs = 0;
        
        for (const fixture of STRESS_FIXTURES) {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            
            const result = parsePostgresSQL(sqlContent);
            
            const fks = result.relationships.filter(r => r.type === 'FOREIGN_KEY');
            totalFKs += fks.length;
        }
        
        expect(totalFKs).toBeGreaterThanOrEqual(50);
    });
    
    test('Partition Detection', () => {
        let totalPartitions = 0;
        
        for (const fixture of STRESS_FIXTURES) {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            
            const result = parsePostgresSQL(sqlContent);
            
            const partitions = result.relationships.filter(r => 
                r.type === 'PARTITION_CHILD' || r.type === 'PARTITION_PARENT'
            );
            totalPartitions += partitions.length;
        }
        
        expect(totalPartitions).toBeGreaterThanOrEqual(10);
    });
    
    test('View Dependency Detection', () => {
        let totalViews = 0;
        
        for (const fixture of STRESS_FIXTURES) {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            
            const result = parsePostgresSQL(sqlContent);
            
            totalViews += result.views.length;
        }
        
        expect(totalViews).toBeGreaterThanOrEqual(25);
    });
    
    test('Trigger Detection', () => {
        let totalTriggers = 0;
        
        for (const fixture of STRESS_FIXTURES) {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            
            const result = parsePostgresSQL(sqlContent);
            
            totalTriggers += result.triggers.length;
        }
        
        expect(totalTriggers).toBeGreaterThanOrEqual(50);
    });
    
    test('Temporal Relationship Detection', () => {
        const sqlContent = fs.readFileSync(path.join(fixturesDir, 'pg18-19-temporal-graph.sql'), 'utf-8');
        
        const result = parsePostgresSQL(sqlContent);
        
        const temporalRels = result.relationships.filter(r => 
            r.type === 'TEMPORAL_PK' || r.type === 'TEMPORAL_FK'
        );
        
        expect(temporalRels.length).toBeGreaterThanOrEqual(5);
    });
    
    test('Extension Dependency Detection', () => {
        let totalExtensions = 0;
        
        for (const fixture of STRESS_FIXTURES) {
            const sqlContent = fs.readFileSync(fixture.path, 'utf-8');
            
            const result = parsePostgresSQL(sqlContent);
            
            totalExtensions += result.extensions.length;
        }
        
        expect(totalExtensions).toBeGreaterThanOrEqual(25);
    });
});
