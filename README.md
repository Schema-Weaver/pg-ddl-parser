# pg-ddl-parser

[![npm version](https://img.shields.io/npm/v/pg-ddl-parser.svg)](https://www.npmjs.com/package/pg-ddl-parser)
[![license](https://img.shields.io/badge/license-BSL--1.1-red.svg)](https://github.com/Schema-Weaver/pg-ddl-parser/blob/main/LICENSE)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/pg-ddl-parser)

> [!WARNING]
> **Commercial Use License Required**
> 
> This package is licensed under the **Business Source License 1.1 (BSL)**. It is free for local development, testing, and evaluation purposes, but **requires a separate paid commercial license for production use**.
> 
> For commercial licensing options and inquiries, please contact: **vivek@vivekmind.com**

**Zero-dependency PostgreSQL DDL parser** that converts `CREATE`, `ALTER`, and `DROP` SQL statements into a fully typed `ParsedSchema` object model. Supports PostgreSQL 12 through 19 syntax including partitioning, temporal tables, property graphs, row-level security, and 60+ statement types. Runs in the browser and Node.js.

---

## Installation

```bash
npm install pg-ddl-parser
```

## Quick Start

```typescript
import { parsePostgresSQL } from 'pg-ddl-parser';

const sql = `
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_users_email ON users(email);
`;

const schema = parsePostgresSQL(sql);

console.log(schema.tables[0].name);       // 'users'
console.log(schema.tables[0].columns);     // [{ name: 'id', type: 'uuid', ... }, ...]
console.log(schema.indexes[0].name);       // 'idx_users_email'
console.log(schema.relationships);         // Foreign key relationships
console.log(schema.confidence);            // 0.0–1.0 parse confidence
```

## Supported PostgreSQL Versions

| Version | Status | Notable Syntax |
|---------|--------|----------------|
| PG 12   | ✅ Full | Generated columns, covering indexes |
| PG 13   | ✅ Full | Parallel vacuum, incremental sort |
| PG 14   | ✅ Full | `BEGIN ATOMIC` functions, multirange types |
| PG 15   | ✅ Full | `NULLS NOT DISTINCT`, security invoker views |
| PG 16   | ✅ Full | `ANY_VALUE`, system-use column privileges |
| PG 17   | ✅ Full | SQL/JSON, `MERGE` improvements |
| PG 18   | ✅ Full | Temporal tables, `PERIOD`, `SYSTEM VERSIONING` |
| PG 19   | ✅ Full | SQL/PGQ property graphs, virtual generated columns |

## Supported Statement Types

### CREATE Statements
- `CREATE TABLE` — columns, constraints, partitioning, inheritance, temporal, typed tables
- `CREATE VIEW` / `CREATE MATERIALIZED VIEW` — recursive, security barrier/invoker, WITH options
- `CREATE INDEX` — btree/hash/gin/gist/spgist/brin, partial, covering, NULLS NOT DISTINCT
- `CREATE FUNCTION` / `CREATE PROCEDURE` — PL/pgSQL, SQL, parameters, security definer
- `CREATE TRIGGER` — BEFORE/AFTER/INSTEAD OF, transition tables, constraint triggers
- `CREATE TYPE` — ENUM, composite, multirange, range
- `CREATE DOMAIN` — base type, CHECK, NOT NULL, default
- `CREATE SEQUENCE` — all options including OWNED BY
- `CREATE POLICY` — permissive/restrictive, USING/WITH CHECK
- `CREATE EXTENSION` / `CREATE SCHEMA` / `CREATE ROLE`
- `CREATE RULE` / `CREATE AGGREGATE` / `CREATE OPERATOR`
- `CREATE PROPERTY GRAPH` — SQL/PGQ vertex and edge tables (PG19)
- `CREATE COLLATION` / `CREATE STATISTICS` / `CREATE DATABASE`

### ALTER Statements
- `ALTER TABLE` — 50+ sub-commands: ADD/DROP/ALTER COLUMN, constraints, partitions, RLS, SET SCHEMA, MERGE/SPLIT PARTITIONS (PG17+)

### DROP Statements
- 35+ `DROP` variants: TABLE, VIEW, INDEX, FUNCTION, TYPE, DOMAIN, SEQUENCE, SCHEMA, EXTENSION, TRIGGER, POLICY, RULE, ROLE, AGGREGATE, OPERATOR, COLLATION, PROPERTY GRAPH, MATERIALIZED VIEW, and more

## API Reference

### `parsePostgresSQL(sql: string, options?: Partial<ParseOptions>): ParsedSchema`

Parses a PostgreSQL DDL string and returns a structured schema model.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `sql` | `string` | Raw PostgreSQL DDL SQL string |
| `options` | `Partial<ParseOptions>` | Optional parsing configuration |

#### ParseOptions

```typescript
interface ParseOptions {
  maxStatements?: number;   // Max statements to parse (default: 10000)
  defaultSchema?: string;   // Default schema name (default: 'public')
}
```

#### ParsedSchema

```typescript
interface ParsedSchema {
  tables: Table[];
  relationships: Relationship[];
  enums: Map<string, string[]>;
  enumTypes: EnumType[];
  views: View[];
  triggers: Trigger[];
  indexes: Index[];
  sequences: Sequence[];
  functions: PostgresFunction[];
  policies: Policy[];
  extensions: Extension[];
  schemas: string[];
  domains: Domain[];
  compositeTypes: CompositeType[];
  roles: Role[];
  rules: Rule[];
  aggregates?: Aggregate[];
  propertyGraphs?: PropertyGraph[];
  stats: PostgresStats;
  errors: ParserError[];
  warnings: ParserError[];
  parseTime?: number;
  confidence: number;       // 0.0–1.0 overall parse confidence
}
```

### Relationship Detection

The parser automatically detects relationships between objects:

| Type | Description |
|------|-------------|
| `FOREIGN_KEY` | Explicit `REFERENCES` constraints |
| `PARTITION_CHILD` / `PARTITION_PARENT` | Partition hierarchies |
| `INHERITANCE` | Table inheritance via `INHERITS` |
| `VIEW_DEPENDENCY` | View → table references |
| `TRIGGER_TARGET` / `TRIGGER_FUNCTION` | Trigger bindings |
| `HAS_SEQUENCE` | Sequence ownership |
| `PROPERTY_GRAPH_VERTEX` / `PROPERTY_GRAPH_EDGE` | Graph → table mappings |
| `TEMPORAL_FK` | PERIOD-based foreign keys |

### Additional Exports

```typescript
import {
  parsePostgresSQL,     // Main parser function
  tokenize,             // Tokenizer (Phase 1)
  splitStatements,      // Statement splitter (Phase 2)
  createParseContext,   // Parse context factory
  SAMPLE_SQL,           // Sample SQL for testing
} from 'pg-ddl-parser';

// All types are also exported
import type {
  ParsedSchema,
  Table,
  Column,
  View,
  Index,
  Relationship,
  // ... and many more
} from 'pg-ddl-parser';
```

## Architecture

The parser uses a multi-phase pipeline:

1. **Tokenizer** — Character-by-character state machine producing typed tokens
2. **Statement Splitter** — Splits token stream into individual SQL statements
3. **Multi-Strategy Parser** — AST-first parsing with regex fallback for error recovery
4. **Relationship Detector** — Builds the relationship graph between objects
5. **Output Builder** — Assembles the final `ParsedSchema`

This dual-strategy approach means the parser gracefully degrades on malformed SQL — it will always return partial results rather than throwing errors.

## Features

- **Zero Runtime Dependencies** — Pure TypeScript, no external packages
- **Browser + Node.js** — Works everywhere JavaScript runs
- **Dual Format** — Ships both CommonJS and ES Modules
- **Full TypeScript Support** — Complete type definitions included
- **Graceful Degradation** — Partial output on malformed SQL, never crashes
- **Version-Aware** — Handles PG12–PG19 specific syntax
- **Confidence Scoring** — Each parse result includes a confidence score (0.0–1.0)

## License

Business Source License 1.1 (BSL) — see [LICENSE](./LICENSE)

Free for non-production use, local development, and testing. Requires a commercial license for production use.

---

Built by [Schema Weaver](https://schemaweaver.vivekmind.com) — the visual PostgreSQL IDE.
