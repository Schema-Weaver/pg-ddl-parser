# BRUTAL PARSER BREAK TEST — Failure Report
Generated: 2026-06-15T10:36:22.843Z

## Executive Summary

| Metric | Value |
|--------|-------|
| SQL files tested | 15 |
| Total statements (split) | 3373 |
| DDL statements tested | 3132 |
| Successfully parsed (with output) | 3072 |
| Parse rate (DDL with output) | 98.1% |
| Crashes / errors | 0 |
| Silent failures | 0 |
| Output gaps | 0 |
| Relationship gaps | 0 |
| **Total issues** | **0** |

## Severity Breakdown

- **CRITICAL** (throws): 0
- **HIGH** (silent failure): 0
- **MEDIUM** (output gap): 0
- **MEDIUM** (relationship gap): 0

## Full-File Parse (mixed input)

- ✅ **alter-everything.sql**: no crash
- ✅ **combinatorial-explosion.sql**: no crash
- ✅ **edge-cases-malformed.sql**: no crash
- ✅ **partitioning-nightmare.sql**: no crash
- ✅ **pg-dump-multiversion.sql**: no crash
- ✅ **pg-dump-realistic.sql**: no crash
- ✅ **pg12-specific.sql**: no crash
- ✅ **pg13-specific.sql**: no crash
- ✅ **pg14-specific.sql**: no crash
- ✅ **pg15-specific.sql**: no crash
- ✅ **pg16-specific.sql**: no crash
- ✅ **pg17-specific.sql**: no crash
- ✅ **pg18-specific.sql**: no crash
- ✅ **pg19-specific.sql**: no crash
- ✅ **security-rls-policies.sql**: no crash

## PG Version Coverage Assessment

- **PG12** (pg12-specific.sql): 99% parse rate, 0 issues
- **PG13** (pg13-specific.sql): 83% parse rate, 0 issues
- **PG14** (pg14-specific.sql): 100% parse rate, 0 issues
- **PG15** (pg15-specific.sql): 99% parse rate, 0 issues
- **PG16** (pg16-specific.sql): 99% parse rate, 0 issues
- **PG17** (pg17-specific.sql): 100% parse rate, 0 issues
- **PG18** (pg18-specific.sql): 100% parse rate, 0 issues
- **PG19** (pg19-specific.sql): 98% parse rate, 0 issues

## Prioritized Fix List

1. Fix any CRITICAL crashes first
2. Address HIGH silent failures (DDL parsed with zero output)
3. Fill MEDIUM output gaps (missing fields on otherwise-parsed objects)
4. Fix relationship detection gaps

## npm Publish Readiness

Real accuracy rate across PG12-19 DDL (this run): **98.1%** of DDL statements produced meaningful output.
Production readiness requires >95% on pg_dump-realistic.sql and zero CRITICAL crashes.
