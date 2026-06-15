import { MaterializedView, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateMaterializedViewRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createMaterializedView);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE MATERIALIZED VIEW' };
    }

    const ifNotExists = !!match[1];
    const viewName = match[2];
    const schemaName = match[3];
    const columnList = match[4];
    const query = match[5];

    const fullViewName = context ? context.qualifyName(viewName, schemaName) : (schemaName ? `${schemaName}.${viewName}` : viewName);

    // Parse column list if provided
    let columns: string[] = [];
    if (columnList) {
        columns = columnList
            .slice(1, -1)
            .split(',')
            .map(c => c.trim().replace(/"/g, ''));
    }

    const view: MaterializedView = {
        name: viewName,
        schema: schemaName || context?.currentSchema,
        query,
        columns,
        isUnique: /UNIQUE/i.test(sql),
        withNoData: /WITH\s+NO\s+DATA/i.test(sql),
        tablespace: sql.match(/TABLESPACE\s+(\w+)/i)?.[1],
        verificationLevel: 'HEURISTIC',
    };

    // Track dependency
    if (context) {
        context.addDependency(viewName, fullViewName);
    }

    return { success: true, view, confidence: 0.9 };
}