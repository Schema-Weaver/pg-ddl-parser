import { describe, it, expect } from 'vitest';
import { createParseContext } from '../context/parse-context';
import { detectPartitions } from '../relationships/partition-detector';
import { Table } from '../types/tables';

describe('Partition Detector', () => {
  it('should detect child partition relationships', () => {
    const context = createParseContext();
    
    // Mock partitioned parent table
    const parentTable: Table = {
      name: 'orders',
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
      partitionKey: ['order_date'],
      partitionOf: undefined,
      partitionBounds: undefined,
      foreignKeys: [],
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
    
    // Mock child partition table
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
      partitionOf: 'orders', // Reference to parent
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
    
    context.tables.set('orders', parentTable);
    context.tables.set('orders_2023', childTable);
    
    const relationships = detectPartitions(context);
    
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('PARTITION_CHILD');
    expect(relationships[0].source.table).toBe('orders');
    expect(relationships[0].target.table).toBe('orders_2023');
    expect(relationships[0].cardinality).toBe('ONE_TO_MANY');
  });
});
