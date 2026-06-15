import { describe, it, expect } from 'vitest';
import { createParseContext } from '../context/parse-context';
import { detectForeignKeys } from '../relationships/fk-detector';
import { Table } from '../types/tables';

describe('FK Detector', () => {
  it('should detect foreign key relationships in tables', () => {
    const context = createParseContext();
    
    // Create a table with a foreign key
    const table1: Table = {
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
      foreignKeys: [
        {
          name: 'fk_user_id',
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
        name: 'pk_users',
        columns: ['id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    context.tables.set('users', table1);
    
    const relationships = detectForeignKeys(context);
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('FOREIGN_KEY');
    expect(relationships[0].source.table).toBe('users');
    expect(relationships[0].target.table).toBe('users');
    expect(relationships[0].source.column).toBe('user_id');
    expect(relationships[0].target.column).toBe('id');
  });
  
  it('should detect foreign keys to different tables', () => {
    const context = createParseContext();
    
    // Create source table
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
    
    // Create target table
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
    
    context.tables.set('users', usersTable);
    context.tables.set('orders', ordersTable);
    
    const relationships = detectForeignKeys(context);
    expect(relationships).toHaveLength(1);
    expect(relationships[0].type).toBe('FOREIGN_KEY');
    expect(relationships[0].source.table).toBe('orders');
    expect(relationships[0].target.table).toBe('users');
    expect(relationships[0].source.column).toBe('user_id');
    expect(relationships[0].target.column).toBe('id');
  });
  
  it('should handle multi-column foreign keys', () => {
    const context = createParseContext();
    
    // Create source table
    const joinTable: Table = {
      name: 'user_roles',
      schema: 'public',
      columns: [
        {
          name: 'user_id',
          type: 'uuid',
          typeCategory: 'UUID',
          nullable: false,
        },
        {
          name: 'role_id', 
          type: 'integer',
          typeCategory: 'NUMERIC',
          nullable: false,
        }
      ],
      isPartitioned: false,
      foreignKeys: [
        {
          name: 'fk_user_role',
          columns: ['user_id', 'role_id'],
          targetTable: 'roles',
          targetColumns: ['user_id', 'role_id'],
          onDelete: 'CASCADE',
          onUpdate: 'RESTRICT',
        }
      ],
      checkConstraints: [],
      uniqueConstraints: [],
      isTemporary: false,
      isUnlogged: false,
      primaryKey: undefined,
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    // Create target table
    const rolesTable: Table = {
      name: 'roles',
      schema: 'public',
      columns: [
        {
          name: 'user_id',
          type: 'uuid',
          typeCategory: 'UUID',
          nullable: false,
        },
        {
          name: 'role_id',
          type: 'integer',
          typeCategory: 'NUMERIC',
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
        name: 'pk_roles',
        columns: ['user_id', 'role_id']
      },
      inheritsFrom: undefined,
      temporalConstraints: [],
      confidence: 1.0,
    };
    
    context.tables.set('user_roles', joinTable);
    context.tables.set('roles', rolesTable);
    
    const relationships = detectForeignKeys(context);
    expect(relationships).toHaveLength(2); // Two relationships for two columns
    
    // Verify first relationship
    expect(relationships[0].source.table).toBe('user_roles');
    expect(relationships[0].target.table).toBe('roles');
    expect(relationships[0].source.column).toBe('user_id');
    expect(relationships[0].target.column).toBe('user_id');
    
    // Verify second relationship
    expect(relationships[1].source.table).toBe('user_roles');
    expect(relationships[1].target.table).toBe('roles');
    expect(relationships[1].source.column).toBe('role_id');
    expect(relationships[1].target.column).toBe('role_id');
  });
});