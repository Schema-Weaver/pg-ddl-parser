import { parsePostgresSQL } from '../../index';
import { describe, it, expect } from 'vitest';

describe('Rule Parser', () => {
  it('should parse CREATE RULE statement', () => {
    const sql = `
      CREATE RULE deny_delete AS ON DELETE TO employees
      DO INSTEAD NOTHING;
    `;

    const result = parsePostgresSQL(sql);
    
    // Although rules aren't part of the core schema model, they should be parsed without error
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should handle CREATE RULE with WHERE clause', () => {
    const sql = `
      CREATE RULE notify_deleted AS ON DELETE TO products
      WHEN OLD.stock_count > 0
      DO ALSO SELECT notify_stock_depleted('products', OLD.id);
    `;

    const result = parsePostgresSQL(sql);
    
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});