import { RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

/**
 * Parse CREATE RULE statements
 * 
 * Note: Rules are quite complex and rarely used in modern applications. 
 * This implements basic rule parsing to support PG19 compatibility.
 */
export function parseCreateRuleRegex(sql: string, context: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createRule);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE RULE' };
    }

    // Extract rule info
    const ruleName = match[1];
    const event = match[2].toUpperCase();
    const schemaName = match[3];  
    const tableName = match[4];
    const condition = match[5];
    const action = match[6] ? match[6].trim() : undefined;
    
    // Construct full qualified name
    const fullTableName = context.qualifyName(tableName, schemaName);

    // Rule handling is primarily for context purposes, not schema modeling
    // This would be stored to track dependency but not affect schema structure
    
    return { 
        success: true, 
        confidence: 0.8,
        rule: {
            name: ruleName,
            schema: schemaName || context.currentSchema,
            table: fullTableName,
            event,
            condition,
            action
        } 
    };
}