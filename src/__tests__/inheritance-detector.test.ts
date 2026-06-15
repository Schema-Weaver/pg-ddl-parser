import { describe, it, expect } from 'vitest';
import { createParseContext } from '../context/parse-context';
import { detectInheritance } from '../relationships/inheritance-detector';
import { Table } from '../types/tables';

describe('Inheritance Detector', () => {
  it('should detect table inheritance relationships', () => {
    const context = createParseContext();
    
    // Mock parent table
    const parentTable: Table = {
      name: 'people',
      schema: 'public',
      columns: [
        {
          name: 'id',
          type: 'integer',
          typeCategory: 'NUMERIC',
          nullable: false,
          isPrimaryKey: true,
        },
        {
          name: 'name',
          type: 'varchar',
          typeCategory: 'STRING',
          nullable: false,
        }
      ],
      isPartitioned: false,
      foreignKeys: [],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_people',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Mock child table inheriting from parent
    const childTable: Table = {
      name: 'employees',
      schema: 'public',
      columns: [
        {
          name: 'employee_id',
          type: 'integer',
          typeCategory: 'NUMERIC',
          nullable: false,
          isPrimaryKey: true,
        },
        {
          name: 'department',
          type: 'varchar',
          typeCategory: 'STRING',
          nullable: true,
        }
      ],
      isPartitioned: false,
      foreignKeys: [],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_employees',
        columns: ['employee_id']
      },
      inheritsFrom: 'people', // Reference to parent
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    context.tables.set('people', parentTable);
    context.tables.set('employees', childTable);
    
    const relationships = detectInheritance(context);
    
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('INHERITANCE');
    expect(relationships[0].source.table).toBe('people');
    expect(relationships[0].target.table).toBe('employees');
    expect(relationships[0].cardinality).toBe('ONE_TO_MANY');
  });
  
  it('should handle schema-qualified inheritance', () => {
    const context = createParseContext();
    
    // Mock parent table in different schema
    const parentTable: Table = {
      name: 'base_entity',
      schema: 'common',
      columns: [
        {
          name: 'id',
          type: 'integer',
          typeCategory: 'NUMERIC',
          nullable: false,
          isPrimaryKey: true,
        }
      ],
      isPartitioned: false,
      foreignKeys: [],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_base_entity',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Mock child table inheriting from parent with schema
    const childTable: Table = {
      name: 'derived_table',
      schema: 'public',
      columns: [
        {
          name: 'derived_id',
          type: 'integer',
          typeCategory: 'NUMERIC',
          nullable: false,
          isPrimaryKey: true,
        }
      ],
      isPartitioned: false,
      foreignKeys: [],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_derived_table',
        columns: ['derived_id']
      },
      inheritsFrom: 'common.base_entity', // Schema-qualified reference
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    context.tables.set('common.base_entity', parentTable);
    context.tables.set('derived_table', childTable);
    
    const relationships = detectInheritance(context);
    
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('INHERITANCE');
    expect(relationships[0].source.table).toBe('base_entity');
    expect(relationships[0].source.schema).toBe('common');
    expect(relationships[0].target.table).toBe('derived_table');
    expect(relationships[0].target.schema).toBe('public');
  });
});