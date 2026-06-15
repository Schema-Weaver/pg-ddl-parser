import { Trigger, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateTriggerRegex(sql: string, context: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createTrigger);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE TRIGGER' };
    }

    const triggerName = match[1];
    const timing = match[2].toUpperCase().replace(/\s+/g, ' ') as any;
    const eventsStr = match[3].toUpperCase();
    const tableSchema = match[4];
    const tableName = match[5];

    const fullTableName = context.qualifyName(tableName, tableSchema);

    // Track table dependency
    context.addDependency(triggerName, fullTableName);

    // Extract individual events
    const events: string[] = [];
    if (eventsStr.includes('INSERT')) events.push('INSERT');
    if (eventsStr.includes('UPDATE')) events.push('UPDATE');
    if (eventsStr.includes('DELETE')) events.push('DELETE');
    if (eventsStr.includes('TRUNCATE')) events.push('TRUNCATE');

    // Extract function name
    const execMatch = sql.match(PATTERNS.executeFunction);
    const funcName = execMatch?.[2];
    const funcSchema = execMatch?.[1];

    if (funcName) {
        const fullFuncName = context.qualifyName(funcName, funcSchema);
        context.addDependency(triggerName, fullFuncName);
    }

    // Extract WHEN condition
    let condition: string | undefined;
    const whenMatch = sql.match(/\bWHEN\s*\((.+)\)\s*EXECUTE/i);
    if (whenMatch) {
        condition = whenMatch[1].trim();
    }

    // Extract REFERENCING clause (arbitrary order support)
    let referencing: { newTable?: string; oldTable?: string } | undefined;
    const referencingMatch = sql.match(/\bREFERENCING\s+([\s\S]+?)(?=\bFOR\b|\bEXECUTE\b|\bWHEN\b|$)/i);
    if (referencingMatch) {
        const refClause = referencingMatch[1];
        const oldMatch = refClause.match(/\bOLD\s+TABLE\s+(?:AS\s+)?(\w+)/i);
        const newMatch = refClause.match(/\bNEW\s+TABLE\s+(?:AS\s+)?(\w+)/i);
        if (oldMatch || newMatch) {
            referencing = {};
            if (oldMatch) referencing.oldTable = oldMatch[1];
            if (newMatch) referencing.newTable = newMatch[1];
        }
    }

    // Extract function arguments
    let arguments_: string[] | undefined;
    const argsMatch = sql.match(/EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([^)]*)\)/i);
    if (argsMatch && argsMatch[3]) {
        arguments_ = argsMatch[3].split(',').map(a => a.trim()).filter(a => a);
    }

    // Check for constraint trigger
    const isConstraint = /\bCONSTRAINT\s+TRIGGER\b/i.test(sql);

    // Check for DEFERRABLE
    const deferrable = /\bDEFERRABLE\b/i.test(sql);
    const initially = /\bINITIALLY\s+(DEFERRED|IMMEDIATE)\b/i.exec(sql)?.[1]?.toUpperCase();
    const initiallyDeferred = initially === 'DEFERRED';

    const trigger: Trigger = {
        name: triggerName,
        table: tableName,
        timing,
        events,
        event: events[0] || 'UPDATE',
        level: /\bFOR\s+EACH\s+ROW\b/i.test(sql) ? 'ROW' : 'STATEMENT',
        functionName: funcName,
        functionSchema: funcSchema,
        function: funcName,
        condition,
        referencing,
        arguments: arguments_,
        isConstraint,
        deferrable,
        initially: initially as 'DEFERRED' | 'IMMEDIATE' | undefined,
        initiallyDeferred,
    };

    context.triggers.set(triggerName, trigger);

    return { success: true, trigger, confidence: 0.85 };
}