import { describe, it, expect } from 'vitest';
import { createParseContext } from '../context/parse-context';
import { buildRelationships } from '../relationships/relationship-builder';
import { Table } from '../types/tables';

describe('Relationship Builder', () => {
  it('should combine relationships from all detectors and deduplicate', () => {
    const context = createParseContext();
    
    // Create table with FK
    const usersTable: Table = {
      name: 'users',
      schema: 'public',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          typeCategory: 'UUID',
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
        name: 'pk_users',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Create table with FK to users
    const ordersTable: Table = {
      name: 'orders',
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
          name: 'user_id',
          type: 'uuid',
          typeCategory: 'UUID',
          nullable: false,
        }
      ],
      isPartitioned: false,
      foreignKeys: [
        {
          name: 'fk_orders_user',
          columns: ['user_id'],
          targetTable: 'users',
          targetColumns: ['id'],
          onDelete: 'CASCADE',
          onUpdate: 'RESTRICT',
        }
      ],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_orders',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Create partitioned parent table
    const parentTable: Table = {
      name: 'orders_parent',
      schema: 'public',
      columns: [
        {
          name: 'id',
          type: 'integer',
          typeCategory: 'NUMERIC',
          nullable: false,
          isPrimaryKey: true,
        }
      ],
      isPartitioned: true,
      partitionType: 'range',
      partitionKey: ['created_at'],
      partitionOf: undefined,
      partitionBounds: undefined,
      foreignKeys: [],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_orders_parent',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Create child partition table
    const childTable: Table = {
      name: 'orders_2023',
      schema: 'public',
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
      partitionType: undefined,
      partitionKey: undefined,
      partitionOf: 'orders_parent',
      partitionBounds: { from: '2023-01-01', to: '2023-12-31' },
      foreignKeys: [],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: {
        name: 'pk_orders_2023',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Create inheritance parent
    const entityTable: Table = {
      name: 'entities',
      schema: 'public',
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
        name: 'pk_entities',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Create inheritance child
    const childEntityTable: Table = {
      name: 'products',
      schema: 'public',
      columns: [
        {
          name: 'product_id',
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
        name: 'pk_products',
        columns: ['product_id']
      },
      inheritsFrom: 'entities',
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    context.tables.set('users', usersTable);
    context.tables.set('orders', ordersTable);
    context.tables.set('orders_parent', parentTable);
    context.tables.set('orders_2023', childTable);
    context.tables.set('entities', entityTable);
    context.tables.set('products', childEntityTable);
    
    const relationships = buildRelationships(context);
    
    // Should have 3 relationships:
    // 1. FK relationship from orders.user_id to users.id
    // 2. Partition relationship from orders_parent to orders_2023
    // 3. Inheritance relationship from entities to products
    
    expect(relationships).toHaveLength(3);
    
    const fkRel = relationships.find(r => r.type === 'FOREIGN_KEY');
    const partitionRel = relationships.find(r => r.type === 'PARTITION_CHILD');
    const inheritRel = relationships.find(r => r.type === 'INHERITANCE');
    
    expect(fkRel).toBeDefined();
    expect(partitionRel).toBeDefined();
    expect(inheritRel).toBeDefined();
    
    expect(fkRel?.source.table).toBe('orders');
    expect(fkRel?.target.table).toBe('users');
    
    expect(partitionRel?.source.table).toBe('orders_parent');
    expect(partitionRel?.target.table).toBe('orders_2023');
    
    expect(inheritRel?.source.table).toBe('entities');
    expect(inheritRel?.target.table).toBe('products');
  });
  
  it('should return empty array when no relationships detected', () => {
    const context = createParseContext();
    
    // No tables defined - empty context
    const relationships = buildRelationships(context);
    
    expect(relationships).toHaveLength(0);
  });
});