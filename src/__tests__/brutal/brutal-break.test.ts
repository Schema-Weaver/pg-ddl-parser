/**
 * BRUTAL PARSER BREAK TEST
 *
 * Hostile QA — finds crashes, silent failures, and output gaps.
 * Does NOT modify parser source. Test-only.
 *
 * Run: npm run test:brutal
 * Or:  npx vitest run src/lib/sql-parser/__tests__/brutal/brutal-break.test.ts
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parsePostgresSQL,
  tokenize,
  splitStatements,
  ParsedSchema,
} from '../../index';
import type { StatementInfo } from '../../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brutalDir = __dirname;

// ── Types ──────────────────────────────────────────────────────────────────

interface BrutalTestResult {
  file: string;
  totalStatements: number;
  parsedStatements: number;
  skippedNonDDL: number;
  failedStatements: string[];
  parseErrors: Array<{ statement: string; error: string; index: number }>;
  silentFailures: Array<{ statement: string; expected: string; got: string }>;
  outputGaps: Array<{ statement: string; missingFields: string[] }>;
  relationshipGaps: Array<{ statement: string; expectedRelationship: string }>;
  warnings: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DDL_PATTERN =
  /^\s*(create|alter|drop|grant|revoke|comment)\s/i;

const SKIP_PATTERN =
  /^\s*(set\s|select\s|copy\s|insert\s|update\s|delete\s|begin\s|commit\s|rollback\s|do\s|\\\.|--)/i;

function countOutput(schema: ParsedSchema): boolean {
  return (
    schema.tables.length > 0 ||
    schema.indexes.length > 0 ||
    schema.functions.length > 0 ||
    schema.views.length > 0 ||
    schema.triggers.length > 0 ||
    schema.sequences.length > 0 ||
    schema.policies.length > 0 ||
    (schema.propertyGraphs?.length ?? 0) > 0 ||
    schema.enumTypes.length > 0 ||
    schema.domains.length > 0 ||
    schema.compositeTypes.length > 0 ||
    schema.rules.length > 0 ||
    schema.roles.length > 0 ||
    schema.extensions.length > 0 ||
    schema.schemas.length > 0
  );
}

function checkOutputGaps(stmt: string, parsed: ParsedSchema, gaps: BrutalTestResult['outputGaps']) {
  const lower = stmt.toLowerCase();

  if (lower.includes('generated always as') && parsed.tables.length > 0) {
    const table = parsed.tables[parsed.tables.length - 1];
    const hasGen = table.columns?.some(
      (c) => c.isGenerated || c.generatedExpression || c.generatedType?.includes('IDENTITY')
    );
    if (!hasGen) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['generated expression on column'] });
    }
  }

  if (lower.includes('partition by') && parsed.tables.length > 0) {
    const table = parsed.tables[parsed.tables.length - 1];
    if (!table.isPartitioned && !table.partitionType && !table.partitionKey?.length && !table.partitionOf) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['partition strategy/key on table'] });
    }
  }

  if (lower.includes('referencing') && lower.includes('trigger') && parsed.triggers.length > 0) {
    const trigger = parsed.triggers[parsed.triggers.length - 1];
    if (!trigger.referencing && !trigger.transitionTables?.length) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['REFERENCING transition tables on trigger'] });
    }
  }

  if (lower.includes(' when ') && lower.includes('trigger') && parsed.triggers.length > 0) {
    const trigger = parsed.triggers[parsed.triggers.length - 1];
    if (!trigger.condition && !trigger.filterCondition) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['WHEN condition on trigger'] });
    }
  }

  if (lower.includes('nulls not distinct') && parsed.indexes.length > 0) {
    const index = parsed.indexes[parsed.indexes.length - 1];
    // Index type may not expose nullsNotDistinct — flag if statement has it but index lacks any unique marker
    if (!index.isUnique) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['nullsNotDistinct / unique index flag'] });
    }
  }

  if (lower.includes('include') && lower.includes('index') && parsed.indexes.length > 0) {
    const index = parsed.indexes[parsed.indexes.length - 1];
    if (!index.includeColumns?.length) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['INCLUDE columns on index'] });
    }
  }

  if (lower.includes('security_invoker') && parsed.views.length > 0) {
    const view = parsed.views[parsed.views.length - 1];
    if (!view.securityInvoker && !view.withOptions?.securityInvoker) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['security_invoker on view'] });
    }
  }

  if (lower.includes('property graph') && (parsed.propertyGraphs?.length ?? 0) === 0) {
    gaps.push({ statement: stmt.slice(0, 100), missingFields: ['property graph in output'] });
  }

  if (lower.includes('period') && lower.includes('system_time') && parsed.tables.length > 0) {
    const table = parsed.tables[parsed.tables.length - 1];
    if (!table.period && !table.withSystemVersioning) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['PERIOD/system versioning on table'] });
    }
  }

  if (lower.includes('virtual') && lower.includes('generated') && parsed.tables.length > 0) {
    const table = parsed.tables[parsed.tables.length - 1];
    const col = table.columns?.find((c) => c.isGenerated || c.generatedExpression);
    if (col && col.generatedType !== 'VIRTUAL') {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['VIRTUAL generated column type'] });
    }
  }

  if (lower.includes('not enforced') && parsed.tables.length > 0) {
    const table = parsed.tables[parsed.tables.length - 1];
    const hasNotEnforced = table.checkConstraints?.some((c) => c.enforced === false)
      || table.constraints?.some((c: { enforced?: boolean }) => c.enforced === false);
    if (!hasNotEnforced) {
      gaps.push({ statement: stmt.slice(0, 100), missingFields: ['NOT ENFORCED constraint flag'] });
    }
  }

  if (lower.includes('create statistics') && parsed.stats?.statisticsCount === 0 && !parsed.stats) {
    gaps.push({ statement: stmt.slice(0, 100), missingFields: ['statistics object in output'] });
  }
}

function checkSilentFailures(
  stmt: string,
  parsed: ParsedSchema,
  silent: BrutalTestResult['silentFailures']
) {
  const lower = stmt.toLowerCase();

  const checks: Array<[string, boolean]> = [
    ['create table', parsed.tables.length > 0],
    ['create index', parsed.indexes.length > 0],
    ['create function', parsed.functions.length > 0],
    ['create procedure', parsed.functions.length > 0],
    ['create view', parsed.views.length > 0],
    ['create materialized view', parsed.views.some((v) => v.isMaterialized)],
    ['create trigger', parsed.triggers.length > 0],
    ['create type', parsed.compositeTypes.length > 0 || parsed.enumTypes.length > 0],
    ['create domain', parsed.domains.length > 0],
    ['create sequence', parsed.sequences.length > 0],
    ['create policy', parsed.policies.length > 0],
    ['create property graph', (parsed.propertyGraphs?.length ?? 0) > 0],
    ['create schema', parsed.schemas.length > 0],
    ['create rule', parsed.rules.length > 0],
    ['create role', parsed.roles.length > 0],
    ['create extension', parsed.extensions.length > 0],
  ];

  for (const [keyword, hasOutput] of checks) {
    if (lower.includes(keyword) && !hasOutput) {
      silent.push({
        statement: stmt.slice(0, 100),
        expected: `output for ${keyword}`,
        got: 'no matching objects in ParsedSchema',
      });
    }
  }
}

function checkRelationshipGaps(
  stmt: string,
  parsed: ParsedSchema,
  gaps: BrutalTestResult['relationshipGaps']
) {
  const lower = stmt.toLowerCase();

  if (lower.includes('references ') && parsed.tables.length > 0) {
    const hasFkRel = parsed.relationships.some((r) => r.type === 'FOREIGN_KEY');
    const hasColFk = parsed.tables.some((t) =>
      t.columns?.some((c) => c.isForeignKey || c.references)
    );
    if (!hasFkRel && !hasColFk) {
      gaps.push({ statement: stmt.slice(0, 100), expectedRelationship: 'FOREIGN_KEY' });
    }
  }

  if (lower.includes('partition of') && parsed.tables.length > 0) {
    const hasPartRel = parsed.relationships.some((r) => r.type === 'PARTITION_CHILD');
    const hasPartOf = parsed.tables.some((t) => t.partitionOf);
    if (!hasPartRel && !hasPartOf) {
      gaps.push({ statement: stmt.slice(0, 100), expectedRelationship: 'PARTITION_CHILD' });
    }
  }

  if (lower.includes('inherits') && parsed.tables.length > 0) {
    const hasInherits = parsed.relationships.some((r) => r.type === 'INHERITS') ||
      parsed.tables.some((t) => t.inherits?.length || t.inheritsFrom);
    if (!hasInherits) {
      gaps.push({ statement: stmt.slice(0, 100), expectedRelationship: 'INHERITS' });
    }
  }
}

function runBrutalTest(sqlFilePath: string): BrutalTestResult {
  const sql = fs.readFileSync(sqlFilePath, 'utf-8');
  const tokens = tokenize(sql);
  const statements: StatementInfo[] = splitStatements(tokens);

  const result: BrutalTestResult = {
    file: path.basename(sqlFilePath),
    totalStatements: statements.length,
    parsedStatements: 0,
    skippedNonDDL: 0,
    failedStatements: [],
    parseErrors: [],
    silentFailures: [],
    outputGaps: [],
    relationshipGaps: [],
    warnings: 0,
  };

  for (let i = 0; i < statements.length; i++) {
    const stmtInfo = statements[i];
    const stmt = stmtInfo.text.trim();

    if (!stmt || stmt.startsWith('--')) continue;

    if (SKIP_PATTERN.test(stmt) || stmtInfo.type === 'SET' || stmtInfo.type === 'UNKNOWN') {
      result.skippedNonDDL++;
      continue;
    }

    if (!DDL_PATTERN.test(stmt) && stmtInfo.type === 'UNKNOWN') {
      result.skippedNonDDL++;
      continue;
    }

    try {
      const parsed = parsePostgresSQL(stmt);
      result.warnings += parsed.warnings.length;

      if (parsed.errors.some((e) => e.level === 'ERROR')) {
        result.parseErrors.push({
          statement: stmt.slice(0, 200),
          error: parsed.errors.map((e) => e.message).join('; '),
          index: i,
        });
        continue;
      }

      const hasOutput = countOutput(parsed);

      if (hasOutput) {
        result.parsedStatements++;
        checkOutputGaps(stmt, parsed, result.outputGaps);
        checkRelationshipGaps(stmt, parsed, result.relationshipGaps);
      } else if (DDL_PATTERN.test(stmt)) {
        result.silentFailures.push({
          statement: stmt.slice(0, 100),
          expected: 'some parsed output',
          got: 'empty schema for DDL statement',
        });
      }

      // Always check silent failures for specific CREATE types even if other output exists
      checkSilentFailures(stmt, parsed, result.silentFailures);

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      result.failedStatements.push(stmt.slice(0, 100));
      result.parseErrors.push({ statement: stmt.slice(0, 200), error: msg, index: i });
    }
  }

  return result;
}

function runFullFileTest(sqlFilePath: string): { crashed: boolean; error?: string; stats: ParsedSchema['stats'] | null } {
  try {
    const sql = fs.readFileSync(sqlFilePath, 'utf-8');
    const parsed = parsePostgresSQL(sql);
    return { crashed: false, stats: parsed.stats };
  } catch (error: unknown) {
    return { crashed: true, error: error instanceof Error ? error.message : String(error), stats: null };
  }
}

function buildReport(allResults: BrutalTestResult[], fullFileResults: Array<{ file: string; crashed: boolean; error?: string }>): string {
  const totalStatements = allResults.reduce((s, r) => s + r.totalStatements, 0);
  const totalParsed = allResults.reduce((s, r) => s + r.parsedStatements, 0);
  const totalFailed = allResults.reduce((s, r) => s + r.parseErrors.length, 0);
  const totalSilent = allResults.reduce((s, r) => s + r.silentFailures.length, 0);
  const totalGaps = allResults.reduce((s, r) => s + r.outputGaps.length, 0);
  const totalRelGaps = allResults.reduce((s, r) => s + r.relationshipGaps.length, 0);
  const ddlStatements = allResults.reduce((s, r) => s + r.totalStatements - r.skippedNonDDL, 0);
  const parseRate = ddlStatements > 0 ? ((totalParsed / ddlStatements) * 100).toFixed(1) : '0.0';

  const lines: string[] = [];
  lines.push('# BRUTAL PARSER BREAK TEST — Failure Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| SQL files tested | ${allResults.length} |`);
  lines.push(`| Total statements (split) | ${totalStatements} |`);
  lines.push(`| DDL statements tested | ${ddlStatements} |`);
  lines.push(`| Successfully parsed (with output) | ${totalParsed} |`);
  lines.push(`| Parse rate (DDL with output) | ${parseRate}% |`);
  lines.push(`| Crashes / errors | ${totalFailed} |`);
  lines.push(`| Silent failures | ${totalSilent} |`);
  lines.push(`| Output gaps | ${totalGaps} |`);
  lines.push(`| Relationship gaps | ${totalRelGaps} |`);
  lines.push(`| **Total issues** | **${totalFailed + totalSilent + totalGaps + totalRelGaps}** |`);
  lines.push('');

  lines.push('## Severity Breakdown');
  lines.push('');
  lines.push(`- **CRITICAL** (throws): ${totalFailed}`);
  lines.push(`- **HIGH** (silent failure): ${totalSilent}`);
  lines.push(`- **MEDIUM** (output gap): ${totalGaps}`);
  lines.push(`- **MEDIUM** (relationship gap): ${totalRelGaps}`);
  lines.push('');

  lines.push('## Full-File Parse (mixed input)');
  lines.push('');
  for (const f of fullFileResults) {
    lines.push(f.crashed ? `- ❌ **${f.file}**: CRASH — ${f.error}` : `- ✅ **${f.file}**: no crash`);
  }
  lines.push('');

  lines.push('## PG Version Coverage Assessment');
  lines.push('');
  const versionFiles = [
    ['pg12-specific.sql', 'PG12'],
    ['pg13-specific.sql', 'PG13'],
    ['pg14-specific.sql', 'PG14'],
    ['pg15-specific.sql', 'PG15'],
    ['pg16-specific.sql', 'PG16'],
    ['pg17-specific.sql', 'PG17'],
    ['pg18-specific.sql', 'PG18'],
    ['pg19-specific.sql', 'PG19'],
  ];
  for (const [file, ver] of versionFiles) {
    const r = allResults.find((x) => x.file === file);
    if (!r) continue;
    const issues = r.parseErrors.length + r.silentFailures.length + r.outputGaps.length + r.relationshipGaps.length;
    const ddl = r.totalStatements - r.skippedNonDDL;
    const rate = ddl > 0 ? ((r.parsedStatements / ddl) * 100).toFixed(0) : '0';
    lines.push(`- **${ver}** (${file}): ${rate}% parse rate, ${issues} issues`);
  }
  lines.push('');

  lines.push('## Prioritized Fix List');
  lines.push('');
  lines.push('1. Fix any CRITICAL crashes first');
  lines.push('2. Address HIGH silent failures (DDL parsed with zero output)');
  lines.push('3. Fill MEDIUM output gaps (missing fields on otherwise-parsed objects)');
  lines.push('4. Fix relationship detection gaps');
  lines.push('');

  lines.push('## npm Publish Readiness');
  lines.push('');
  lines.push(`Real accuracy rate across PG12-19 DDL (this run): **${parseRate}%** of DDL statements produced meaningful output.`);
  lines.push('Production readiness requires >95% on pg_dump-realistic.sql and zero CRITICAL crashes.');
  lines.push('');

  for (const result of allResults) {
    const issues = result.parseErrors.length + result.silentFailures.length + result.outputGaps.length + result.relationshipGaps.length;
    if (issues === 0) continue;

    lines.push(`## ${result.file}`);
    lines.push('');
    const ddl = result.totalStatements - result.skippedNonDDL;
    lines.push(`Statements: ${result.totalStatements} | DDL tested: ${ddl} | Parsed with output: ${result.parsedStatements} | Warnings: ${result.warnings}`);
    lines.push('');

    if (result.parseErrors.length > 0) {
      lines.push('### Crashes / Errors');
      result.parseErrors.slice(0, 20).forEach((e, i) => {
        lines.push(`${i + 1}. **Error**: \`${e.error.slice(0, 120)}\``);
        lines.push(`   - Statement #${e.index}: \`${e.statement.slice(0, 150)}\``);
        lines.push('');
      });
      if (result.parseErrors.length > 20) lines.push(`... and ${result.parseErrors.length - 20} more`);
    }

    if (result.silentFailures.length > 0) {
      lines.push('### Silent Failures');
      result.silentFailures.slice(0, 20).forEach((f, i) => {
        lines.push(`${i + 1}. Expected: ${f.expected} | Got: ${f.got}`);
        lines.push(`   - SQL: \`${f.statement.slice(0, 150)}\``);
        lines.push('');
      });
      if (result.silentFailures.length > 20) lines.push(`... and ${result.silentFailures.length - 20} more`);
    }

    if (result.outputGaps.length > 0) {
      lines.push('### Output Gaps');
      result.outputGaps.slice(0, 20).forEach((g, i) => {
        lines.push(`${i + 1}. Missing: ${g.missingFields.join(', ')}`);
        lines.push(`   - SQL: \`${g.statement.slice(0, 150)}\``);
        lines.push('');
      });
      if (result.outputGaps.length > 20) lines.push(`... and ${result.outputGaps.length - 20} more`);
    }

    if (result.relationshipGaps.length > 0) {
      lines.push('### Relationship Gaps');
      result.relationshipGaps.slice(0, 20).forEach((g, i) => {
        lines.push(`${i + 1}. Expected: ${g.expectedRelationship}`);
        lines.push(`   - SQL: \`${g.statement.slice(0, 150)}\``);
        lines.push('');
      });
    }
  }

  return lines.join('\n');
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('BRUTAL PARSER BREAK TEST', () => {
  test('run all brutal fixtures and produce failure report', () => {
    const sqlFiles = fs
      .readdirSync(brutalDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    expect(sqlFiles.length).toBeGreaterThan(0);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  BRUTAL PARSER BREAK TEST — Results');
    console.log('═══════════════════════════════════════════════════════════\n');

    const allResults: BrutalTestResult[] = [];
    const fullFileResults: Array<{ file: string; crashed: boolean; error?: string }> = [];

    let totalStatements = 0;
    let totalParsed = 0;
    let totalFailed = 0;
    let totalSilentFailures = 0;
    let totalOutputGaps = 0;
    let totalRelGaps = 0;

    for (const file of sqlFiles) {
      const filePath = path.join(brutalDir, file);
      const result = runBrutalTest(filePath);
      allResults.push(result);

      const fullResult = runFullFileTest(filePath);
      fullFileResults.push({ file, crashed: fullResult.crashed, error: fullResult.error });

      const ddl = result.totalStatements - result.skippedNonDDL;
      const parseRate = ddl > 0 ? ((result.parsedStatements / ddl) * 100).toFixed(1) : '0.0';
      const issues = result.parseErrors.length + result.silentFailures.length + result.outputGaps.length + result.relationshipGaps.length;

      console.log(`\n📄 ${file}`);
      console.log(`   Statements: ${result.totalStatements} | DDL: ${ddl} | Parsed: ${result.parsedStatements} | Rate: ${parseRate}%`);
      console.log(`   Full-file crash: ${fullResult.crashed ? 'YES ❌' : 'no ✅'}`);
      console.log(`   Crashes: ${result.parseErrors.length} | Silent: ${result.silentFailures.length} | Gaps: ${result.outputGaps.length} | Rel gaps: ${result.relationshipGaps.length}`);

      if (result.parseErrors.length > 0) {
        console.log('   ❌ CRASHES:');
        result.parseErrors.slice(0, 3).forEach((e) => {
          console.log(`      [${e.index}] ${e.error.slice(0, 80)}`);
          console.log(`         SQL: ${e.statement.slice(0, 80)}...`);
        });
      }
      if (result.silentFailures.length > 0) {
        console.log('   ⚠️  SILENT FAILURES:');
        result.silentFailures.slice(0, 3).forEach((f) => {
          console.log(`      Expected: ${f.expected} | Got: ${f.got}`);
        });
      }
      if (result.outputGaps.length > 0) {
        console.log('   🔍 OUTPUT GAPS:');
        result.outputGaps.slice(0, 3).forEach((g) => {
          console.log(`      Missing: ${g.missingFields.join(', ')}`);
        });
      }

      totalStatements += result.totalStatements;
      totalParsed += result.parsedStatements;
      totalFailed += result.parseErrors.length;
      totalSilentFailures += result.silentFailures.length;
      totalOutputGaps += result.outputGaps.length;
      totalRelGaps += result.relationshipGaps.length;
    }

    const totalIssues = totalFailed + totalSilentFailures + totalOutputGaps + totalRelGaps;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total SQL Files:       ${sqlFiles.length}`);
    console.log(`  Total Statements:      ${totalStatements}`);
    console.log(`  Successfully Parsed:   ${totalParsed}`);
    console.log(`  Crashes:               ${totalFailed}`);
    console.log(`  Silent Failures:       ${totalSilentFailures}`);
    console.log(`  Output Gaps:           ${totalOutputGaps}`);
    console.log(`  Relationship Gaps:     ${totalRelGaps}`);
    console.log(`  Total Issues:          ${totalIssues}`);
    console.log('═══════════════════════════════════════════════════════════');

    const report = buildReport(allResults, fullFileResults);
    const reportPath = path.join(brutalDir, 'BRUTAL_FAILURE_REPORT.md');
    fs.writeFileSync(reportPath, report, 'utf-8');
    console.log(`\n📄 Detailed failure report: ${reportPath}`);

    // Test always passes — this is a diagnostic harness, not a gate
    expect(true).toBe(true);
  });
});
