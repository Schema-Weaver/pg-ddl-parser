import { Rule, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateRuleExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createRule);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE RULE' };
    }

    const ruleName = match[1];
    const schemaName = match[2];
    const tableName = match[3];
    const schemaName2 = match[4];
    const event = match[5];
    const instead = match[6];
    const condition = match[7];
    const action = match[8];

    const fullRuleName = context ? context.qualifyName(ruleName, schemaName) : (schemaName ? `${schemaName}.${ruleName}` : ruleName);
    const fullTableName = context ? context.qualifyName(tableName, schemaName2) : (schemaName2 ? `${schemaName2}.${tableName}` : tableName);

    // Parse action
    const actions: { type: string; query?: string; target?: string; columns?: string[]; values?: string[] }[] = [];
    
    if (/INSERT/i.test(action)) {
        actions.push({ type: 'INSERT' });
    } else if (/UPDATE/i.test(action)) {
        actions.push({ type: 'UPDATE' });
    } else if (/DELETE/i.test(action)) {
        actions.push({ type: 'DELETE' });
    } else if (/SELECT/i.test(action)) {
        actions.push({ type: 'SELECT' });
    }

    const rule: Rule = {
        name: ruleName,
        schema: schemaName,
        table: fullTableName,
        event: event.toUpperCase() as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
        instead: !!instead,
        condition,
        action: actions as any,
        isInstead: !!instead,
        whereClause: condition,
        priority: undefined,
    };

    // Track dependency
    if (context) {
        context.addDependency(ruleName, fullTableName);
    }

    return { success: true, rule, confidence: 0.95 };
}