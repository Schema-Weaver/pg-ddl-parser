import { describe, it, expect } from 'vitest';
import { parsePostgresSQL } from '../../index';
import type { EnumType, Domain, CompositeType } from '../../types';

describe('Edge Cases: Types (PG12-19)', () => {
    describe('Composite types', () => {
        it('should parse composite type with columns', () => {
            const sql = `
                CREATE TYPE address_type AS (
                    street TEXT,
                    city TEXT,
                    postal_code VARCHAR(10),
                    country TEXT
                );
            `;
            const result = parsePostgresSQL(sql);
            const composite = result.compositeTypes.find(t => t.name === 'address_type');
            
            expect(composite).toBeDefined();
            expect(composite?.attributes).toHaveLength(4);
            expect(composite?.attributes[0].name).toBe('street');
            expect(composite?.attributes[1].type).toBe('TEXT');
        });

        it('should parse nested composite types', () => {
            const sql = `
                CREATE TYPE geo_point AS (lat NUMERIC, lng NUMERIC);
                CREATE TYPE location AS (
                    name TEXT,
                    coordinates geo_point
                );
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.compositeTypes).toHaveLength(2);
            const location = result.compositeTypes.find(t => t.name === 'location');
            expect(location?.attributes.find(a => a.name === 'coordinates')?.type).toBe('geo_point');
        });
    });

    describe('Enum types', () => {
        it('should parse enum with multiple values', () => {
            const sql = `
                CREATE TYPE status_type AS ENUM (
                    'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
                );
            `;
            const result = parsePostgresSQL(sql);
            const enumType = result.enumTypes.find(e => e.name === 'status_type');
            
            expect(enumType).toBeDefined();
            expect(enumType?.values).toHaveLength(6);
            expect(enumType?.values).toContain('pending');
            expect(enumType?.values).toContain('delivered');
        });

        it('should parse enum with 50+ values', () => {
            const values = Array.from({ length: 55 }, (_, i) => `'value_${i}'`).join(', ');
            const sql = `CREATE TYPE large_enum AS ENUM (${values});`;
            const result = parsePostgresSQL(sql);
            const enumType = result.enumTypes.find(e => e.name === 'large_enum');
            
            expect(enumType).toBeDefined();
            expect(enumType?.values).toHaveLength(55);
        });

        it('should parse enum with special characters', () => {
            const sql = `
                CREATE TYPE special_enum AS ENUM (
                    'value-with-dash', 'value_with_underscore', 'value.with.dot', 'value with space'
                );
            `;
            const result = parsePostgresSQL(sql);
            const enumType = result.enumTypes.find(e => e.name === 'special_enum');
            
            expect(enumType?.values).toContain('value-with-dash');
            expect(enumType?.values).toContain('value_with_underscore');
        });
    });

    describe('ALTER TYPE for enums', () => {
        it('should parse ALTER TYPE ADD VALUE', () => {
            const sql = `
                CREATE TYPE color AS ENUM ('red', 'green', 'blue');
                ALTER TYPE color ADD VALUE 'yellow';
                ALTER TYPE color ADD VALUE 'orange' BEFORE 'yellow';
                ALTER TYPE color ADD VALUE 'purple' AFTER 'blue';
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.enums).toBeDefined();
        });

        it('should parse ALTER TYPE RENAME VALUE', () => {
            const sql = `
                CREATE TYPE priority AS ENUM ('low', 'medium', 'high');
                ALTER TYPE priority RENAME VALUE 'medium' TO 'normal';
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.enums).toBeDefined();
        });

        it('should parse ALTER TYPE SET SCHEMA', () => {
            const sql = `
                CREATE TYPE my_type AS ENUM ('a', 'b');
                ALTER TYPE my_type SET SCHEMA new_schema;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.enums).toBeDefined();
        });
    });

    describe('Range types', () => {
        it('should parse CREATE TYPE AS RANGE', () => {
            const sql = `
                CREATE TYPE date_range AS RANGE (
                    subtype = date,
                    subtype_diff = date_diff,
                    collation = 'en_US'
                );
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.compositeTypes).toBeDefined();
        });
    });

    describe('[PG14] Multirange types', () => {
        it('should parse CREATE TYPE AS MULTIRANGE', () => {
            const sql = `
                CREATE TYPE numrange AS RANGE (subtype = NUMERIC);
                CREATE TYPE num_multirange AS MULTIRANGE (subtype = NUMERIC);
            `;
            const result = parsePostgresSQL(sql);
            
            const mr = result.compositeTypes.find(t => t.name === 'num_multirange');
            expect(mr?.kind).toBe('multirange');
            expect(mr?.subtype).toBe('NUMERIC');
        });

        it('should parse CREATE TYPE AS MULTIRANGE with SUBTYPE = daterange', () => {
            const sql = `CREATE TYPE daterange_mr AS MULTIRANGE (SUBTYPE = daterange);`;
            const result = parsePostgresSQL(sql);
            const mr = result.compositeTypes.find(t => t.name === 'daterange_mr');
            expect(mr?.kind).toBe('multirange');
            expect(mr?.subtype).toBe('daterange');
        });
    });

    describe('Domain types', () => {
        it('should parse domain with CHECK constraint', () => {
            const sql = `
                CREATE DOMAIN email_domain TEXT
                CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
            `;
            const result = parsePostgresSQL(sql);
            const domain = result.domains.find(d => d.name === 'email_domain');
            
            expect(domain).toBeDefined();
            expect(domain?.baseType).toBe('TEXT');
            expect(domain?.checkExpression).toBeDefined();
        });

        it('should parse domain with DEFAULT and NOT NULL', () => {
            const sql = `
                CREATE DOMAIN positive_int INTEGER
                DEFAULT 0
                NOT NULL
                CHECK (VALUE >= 0);
            `;
            const result = parsePostgresSQL(sql);
            const domain = result.domains.find(d => d.name === 'positive_int');
            
            expect(domain?.notNull).toBe(true);
            expect(domain?.default).toBe('0');
        });

        it('should parse domain with COLLATE', () => {
            const sql = `
                CREATE DOMAIN case_insensitive TEXT
                COLLATE "C"
                CHECK (VALUE <> '');
            `;
            const result = parsePostgresSQL(sql);
            const domain = result.domains.find(d => d.name === 'case_insensitive');
            
            expect(domain?.collation).toBe('C');
        });
    });

    describe('ALTER DOMAIN', () => {
        it('should parse ALTER DOMAIN operations', () => {
            const sql = `
                CREATE DOMAIN test_domain INTEGER;
                ALTER DOMAIN test_domain ADD CONSTRAINT positive CHECK (VALUE > 0);
                ALTER DOMAIN test_domain DROP CONSTRAINT positive;
                ALTER DOMAIN test_domain SET DEFAULT 0;
                ALTER DOMAIN test_domain DROP DEFAULT;
                ALTER DOMAIN test_domain SET NOT NULL;
                ALTER DOMAIN test_domain DROP NOT NULL;
                ALTER DOMAIN test_domain RENAME CONSTRAINT positive TO check_positive;
                ALTER DOMAIN test_domain VALIDATE CONSTRAINT positive;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.domains).toBeDefined();
        });
    });

    describe('[PG16] REGROLE/REGNAMESPACE as domain base', () => {
        it('should parse domain based on REGROLE', () => {
            const sql = `
                CREATE DOMAIN role_name AS REGROLE;
            `;
            const result = parsePostgresSQL(sql);
            const domain = result.domains.find(d => d.name === 'role_name');
            
            expect(domain?.baseType).toBe('REGROLE');
        });
    });

    describe('ALTER TYPE for composite types', () => {
        it('should parse ALTER TYPE ADD/DROP ATTRIBUTE', () => {
            const sql = `
                CREATE TYPE person AS (name TEXT, age INTEGER);
                ALTER TYPE person ADD ATTRIBUTE email TEXT;
                ALTER TYPE person DROP ATTRIBUTE age;
                ALTER TYPE person ALTER ATTRIBUTE name SET DATA TYPE VARCHAR(100);
                ALTER TYPE person ALTER ATTRIBUTE email SET DEFAULT 'unknown@example.com';
                ALTER TYPE person ALTER ATTRIBUTE email DROP DEFAULT;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.compositeTypes).toBeDefined();
        });
    });

    describe('DROP TYPE', () => {
        it('should parse DROP TYPE CASCADE', () => {
            const sql = `
                CREATE TYPE temp_type AS ENUM ('a', 'b');
                DROP TYPE IF EXISTS temp_type CASCADE;
            `;
            const result = parsePostgresSQL(sql);
            
            expect(result.enums).toBeDefined();
        });
    });

    describe('[PG12] Generated columns referencing composite types', () => {
        it('should parse generated column using composite type field', () => {
            const sql = `
                CREATE TYPE full_address AS (street TEXT, city TEXT);
                CREATE TABLE locations (
                    id SERIAL PRIMARY KEY,
                    address full_address,
                    city_only TEXT GENERATED ALWAYS AS ((address).city) STORED
                );
            `;
            const result = parsePostgresSQL(sql);
            
            const table = result.tables.find(t => t.name === 'locations');
            const cityCol = table?.columns.find(c => c.name === 'city_only');
            expect(cityCol?.isGenerated).toBe(true);
        });
    });
});
