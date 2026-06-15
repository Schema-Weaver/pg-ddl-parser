# SQL Parser v4 — Failure Analysis Report (PG12-19)

**Test Run**: 2026-06-14  
**Total Tests**: 300  
**Passing**: 150 (50%)  
**Failing**: 150 (50%)

---

## Failures by Object Type

| Object Type | Tests | Passed | Failed | Pass Rate |
|-------------|-------|--------|--------|-----------|
| Tables | 25 | 1 | 24 | 4% |
| Indexes | 20 | 8 | 12 | 40% |
| Functions/Procedures | 35 | 7 | 28 | 20% |
| Triggers | 16 | 7 | 9 | 44% |
| Types (enums/domains/composites) | 20 | 1 | 19 | 5% |
| Views | 22 | 3 | 19 | 14% |
| Partitioning | 13 | 0 | 13 | 0% |
| Security/RLS | 22 | 12 | 10 | 55% |
| Schemas/Extensions | 13 | 11 | 2 | 85% |
| Sequences | 16 | 8 | 8 | 50% |
| Temporal/PERIOD | 13 | 0 | 13 | 0% |
| ALTER Advanced | 25 | 23 | 2 | 92% |

---

## Failures by PG Version Feature

### PG12 Features (Critical Gaps)
| Feature | Status | Description |
|---------|--------|-------------|
| Generated columns (STORED) | FAILED | `generatedType` not captured, `isGenerated` missing |
| Identity columns | FAILED | `defaultValue` does not contain IDENTITY info |
| COVERING indexes (INCLUDE) | FAILED | `includeColumns` not populated |
| PARTITION BY | FAILED | `partitionOf`, `partitionBounds` not captured |
| WITH CHECK OPTION views | FAILED | `checkOption` not captured |
| RECURSIVE views | FAILED | `isRecursive` not set |

### PG13 Features
| Feature | Status | Description |
|---------|--------|-------------|
| BRIN deduplication | FAILED | `deduplicate_items` not in `with` |
| Triggers on partitioned tables | PARTIAL | Basic trigger detected, partition context missing |

### PG14 Features
| Feature | Status | Description |
|---------|--------|-------------|
| SQL body functions (RETURN expr) | FAILED | `language` undefined, `sqlBody` not captured |
| Multirange types | FAILED | Range types not parsed |
| jsonb subscript | PARTIAL | Expressions captured but not validated |

### PG15 Features
| Feature | Status | Description |
|---------|--------|-------------|
| NULLS NOT DISTINCT | FAILED | Unique index flag not captured |
| security_invoker views | FAILED | `securityInvoker` not set |
| Sequence AS type | PARTIAL | `dataType` not always captured |

### PG16 Features
| Feature | Status | Description |
|---------|--------|-------------|
| REGROLE/REGNAMESPACE defaults | FAILED | Type captured but assertion on value fails |

### PG17 Features
| Feature | Status | Description |
|---------|--------|-------------|
| MERGE/SPLIT PARTITIONS | FAILED | Partition operations not captured |
| SET EXPRESSION | FAILED | Generated column expression change not captured |

### PG18 Features
| Feature | Status | Description |
|---------|--------|-------------|
| PERIOD SYSTEM_TIME | FAILED | `period` object not populated |
| WITHOUT OVERLAPS | FAILED | `withoutOverlaps` flag not set |
| NOT ENFORCED | FAILED | `enforced` property missing on constraints |
| VIRTUAL generated | FAILED | `generatedType: 'VIRTUAL'` not captured |
| SYSTEM VERSIONING | FAILED | `withSystemVersioning` not set |

### PG19 Features
| Feature | Status | Description |
|---------|--------|-------------|
| CREATE PROPERTY GRAPH | FAILED | `propertyGraphs` array empty or missing |

---

## Root Cause Analysis

### 1. Generated Columns (HIGH PRIORITY)
**Parser affected**: `table-parser.ts`, `column-parser.ts`  
**Issue**: PG12's `GENERATED ALWAYS AS (expr) STORED` syntax not parsed  
**Impact**: 15+ failures across tables, temporal tests

### 2. Identity Columns (HIGH PRIORITY)
**Parser affected**: `table-parser.ts`  
**Issue**: `GENERATED {ALWAYS|BY DEFAULT} AS IDENTITY` not captured  
**Impact**: 5+ failures

### 3. Partition Tables (HIGH PRIORITY)
**Parser affected**: `partition-parser.ts`  
**Issue**: `PARTITION OF` tables not linked to parent, bounds not captured  
**Impact**: All partition tests fail

### 4. Temporal Features (MEDIUM)
**Parser affected**: `temporal-parser.ts` (missing?)  
**Issue**: PERIOD, SYSTEM_VERSIONING, WITHOUT OVERLAPS not implemented  
**Impact**: All PG18-19 temporal tests fail

### 5. Functions (MEDIUM)
**Parser affected**: `function-parser.ts`, `function-extended-parser.ts`  
**Issue**: `language`, `volatility`, `parallel`, `securityDefiner` not populated  
**Impact**: 28 failures in function tests

### 6. View Attributes (MEDIUM)
**Parser affected**: `view-parser.ts`  
**Issue**: `checkOption`, `isRecursive`, `securityInvoker`, `isMaterialized` not set  
**Impact**: 19 failures

### 7. Index WITH options (LOW)
**Parser affected**: `index-parser.ts`  
**Issue**: Storage parameters not consistently captured  
**Impact**: 10+ failures

### 8. Trigger REFERENCING (LOW)
**Parser affected**: `trigger-parser.ts`  
**Issue**: `referencing` transition tables not captured  
**Impact**: 5 failures

---

## Files Needing Most Fixes (Ranked)

1. **`table-parser.ts`** — Generated columns, identity, storage parameters, EXCLUDE constraints
2. **`partition-parser.ts`** — PARTITION OF parsing, bounds, multi-level
3. **`temporal-parser.ts`** — PERIOD, SYSTEM_VERSIONING, WITHOUT OVERLAPS
4. **`function-parser.ts`** — Language, volatility, parameters, SQL body
5. **`view-parser.ts`** — CHECK OPTION, RECURSIVE, security options, materialized
6. **`index-parser.ts`** — INCLUDE columns, WITH options, NULLS NOT DISTINCT
7. **`trigger-parser.ts`** — REFERENCING, WHEN condition, constraint triggers
8. **`type-parser.ts`** — Composite types, range types, domains
9. **`property-graph-parser.ts`** — CREATE PROPERTY GRAPH

---

## Estimated Fix Effort

| Category | Effort | Tests Fixed |
|----------|--------|-------------|
| Generated columns | Medium | 15+ tests |
| Identity columns | Small | 5+ tests |
| Partition tables | Large | 13+ tests |
| Temporal features | Large | 13+ tests |
| Functions | Medium | 28+ tests |
| Views | Medium | 19+ tests |
| Index options | Small | 12+ tests |
| Triggers | Small | 9+ tests |
| Types | Medium | 19+ tests |
| Property graphs | Medium | 3+ tests |

**Total Effort Estimate**: Medium-Large (40-60 hours)

---

## Critical Blockers for Migration Engine

1. **Partition tables** — Cannot diff partitioned schemas without this
2. **Generated columns** — Migration will try to recreate them as regular columns
3. **Temporal tables** — PG18 is production release, must be supported
4. **Identity vs SEQUENCE** — Cannot distinguish objects for diff

---

## Test Coverage Summary

```
=== PARSER FAILURE ANALYSIS (PG12-19) ===
Total tests: 300
Passing: 150
Failing: 150
Failure rate: 50%

PG Version Readiness:
  PG12: needs major work (4% pass on new features)
  PG13: needs fixes (40% pass)
  PG14: needs fixes (20% pass on new features)
  PG15: needs fixes (50% pass on new features)
  PG16: needs fixes (partial support)
  PG17: needs fixes (partial support)
  PG18: needs major work (0% pass on temporal)
  PG19: needs major work (0% pass on property graphs)
```
