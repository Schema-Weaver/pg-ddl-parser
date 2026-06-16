import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  banner: {
    js: `/*!
 * pg-ddl-parser - Enterprise PostgreSQL Parser v4.0
 * 
 * LICENSE NOTICE:
 * This software is licensed under the Business Source License 1.1 (BSL).
 * 
 * Free for non-production purposes (development, testing, evaluation).
 * Production use or use in competitive products requires a separate paid
 * commercial license from Schema Weaver.
 * 
 * Licensing Contact: vivek@vivekmind.com
 * Full License: See LICENSE file in the root of the repository or package.
 */`,
  },
});
