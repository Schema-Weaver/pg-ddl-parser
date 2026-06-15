import { Trigger, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateTriggerExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createTrigger);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE TRIGGER' };
    }

    const triggerName = match[1];
    const schemaName = match[2];
    const timing = match[3];
    const events = match[4];
    const tableName = match[5];
    const schemaName2 = match[6];
    const fromTable = match[7];

    const fullTriggerName = context ? context.qualifyName(triggerName, schemaName) : (schemaName ? `${schemaName}.${triggerName}` : triggerName);
    const fullTableName = context ? context.qualifyName(tableName, schemaName2) : (schemaName2 ? `${schemaName2}.${tableName}` : tableName);

    // Parse timing
    let triggerTiming: 'BEFORE' | 'AFTER' | 'INSTEAD OF' = 'BEFORE';
    if (/AFTER/i.test(timing)) {
        triggerTiming = 'AFTER';
    } else if (/INSTEAD\s+OF/i.test(timing)) {
        triggerTiming = 'INSTEAD OF';
    }

    // Parse events
    const eventsArray = events.split('|').map(e => e.trim().toUpperCase());

    // Parse level
    const level = /FOR\s+EACH\s+ROW/i.test(sql) ? 'ROW' : 'STATEMENT';

    // Parse function name
    const funcMatch = sql.match(/EXECUTE\s+FUNCTION\s+(\w+(?:\.\w+)?)\s*\(\s*([^)]*)\s*\)/i);
    const functionName = funcMatch?.[1];
    const functionSchema = funcMatch?.[2];

    // Parse WHEN condition
    const condition = sql.match(/WHEN\s*\(\s*([^)]+)\s*\)/i)?.[1];

    // Parse transition tables (PG10+)
    const transitionTables: { name: string; table: string }[] = [];
    const transitionMatches = sql.matchAll(/REFERENCING\s+(OLD|NEW)\s+TABLE\s+AS\s+(\w+)/gi);
    for (const m of transitionMatches) {
        transitionTables.push({
            name: m[1].toLowerCase(),
            table: m[2],
        });
    }

    // Parse referencing clause (PG15+)
    const referencing: { oldTable?: string; newTable?: string } = {};
    const refOldMatch = sql.match(/OLD\s+TABLE\s+AS\s+(\w+)/i);
    const refNewMatch = sql.match(/NEW\s+TABLE\s+AS\s+(\w+)/i);
    if (refOldMatch) referencing.oldTable = refOldMatch[1];
    if (refNewMatch) referencing.newTable = refNewMatch[1];

    // Parse order (PG12+)
    let order: { name: string; position: number } | undefined = undefined;
    const orderMatch = sql.match(/ORDER\s+(\d+)/i);
    if (orderMatch) {
        order = {
            name: triggerName,
            position: parseInt(orderMatch[1], 10),
        };
    }

    // Parse deferrable (PG12+)
    const deferrable = /DEFERRABLE/i.test(sql);
    const initiallyDeferred = /INITIALLY\s+DEFERRED/i.test(sql);

    // Parse filter condition (PG17+)
    const filterCondition = sql.match(/FILTER\s+\(\s*WHERE\s+([^)]+)\s*\)/i)?.[1];

    const trigger: Trigger = {
        name: triggerName,
        schema: schemaName,
        table: fullTableName,
        timing: triggerTiming,
        events: eventsArray,
        level,
        functionName,
        functionSchema,
        condition,
        transitionTables,
        referencing,
        order,
        deferrable,
        initiallyDeferred,
        filterCondition,
    };

    // Track dependency
    if (context) {
        context.addDependency(triggerName, fullTableName);
    }

    return { success: true, trigger, confidence: 0.95 };
}