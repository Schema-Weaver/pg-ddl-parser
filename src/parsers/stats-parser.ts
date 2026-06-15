import { Statistics, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateStatisticsRegex(sql: string, context?: ParseContext): RegexParseResult {
    // Check for CREATE STATISTICS
    const match = sql.match(/CREATE\s+STATISTICS\s+(\w+(?:\.\w+)?)\s*(?:\(\s*([^)]+)\s*\))?\s+ON\s+([^;]+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE STATISTICS' };
    }

    const name = match[1];
    const schemaName = match[2];
    const kinds = match[3];
    const columns = match[4];

    const fullStatsName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    // Parse kinds
    const kind = kinds?.toUpperCase() || 'ndistinct';

    // Parse columns
    const columnList = columns.split(',').map(c => c.trim().replace(/"/g, ''));

    // Parse dependencies
    const dependencies = sql.match(/DEPENDS\s+ON\s+([^;]+)/i)?.[1]?.split(',').map(s => s.trim()) || [];

    // Parse expressions
    const expression = sql.match(/FROM\s+([^;]+)/i)?.[1];

    const stats: Statistics = {
        name: name,
        schema: schemaName,
        columns: columnList,
        kind: kind,
        target: sql.match(/TARGET\s+(\d+)/i)?.[1] ? parseInt(sql.match(/TARGET\s+(\d+)/i)![1], 10) : undefined,
        expression,
        dependencies,
        mostCommonVals: /MCV/i.test(sql),
        mostCommonFreqs: /MCF/i.test(sql),
        histogramBounds: /HISTOGRAM/i.test(sql),
        correlation: /CORRELATION/i.test(sql),
    };

    // Track dependency
    if (context) {
        context.addDependency(name, fullStatsName);
    }

    return { success: true, function: stats, confidence: 0.9 };
}