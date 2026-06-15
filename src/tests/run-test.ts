/**
 * Quick Test Runner for Complex Schema
 * Run with: npx tsx src/lib/sql-parser/tests/run-test.ts
 */

import { runTest } from './complex-schema-v2.test';

console.log('Starting Complex Schema Test...\n');
const result = runTest();

// Exit with error code if any tests failed
const failedCount = result.total - result.passed;
process.exit(failedCount > 0 ? 1 : 0);
