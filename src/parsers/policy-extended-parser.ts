import { Policy, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';

function extractBalancedParentheses(str: string, startIndex: number): string {
    let depth = 0;
    let end = -1;
    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '(') {
            depth++;
        } else if (str[i] === ')') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end > startIndex) {
        return str.slice(startIndex + 1, end).trim();
    }
    return '';
}

export function parseCreatePolicyExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const clean = (s?: string) => s ? s.trim().replace(/^["']|["']$/g, '') : '';

    const match = sql.match(/CREATE\s+POLICY\s+(.+?)\s+ON\s+(.+?)(?:\s+AS\s+|\s+FOR\s+|\s+TO\s+|\s+USING\s+|\s+WITH\s+CHECK\s+|$|;)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE POLICY name and table' };
    }

    const policyName = clean(match[1]);
    const rawTable = clean(match[2]);
    const parts = rawTable.split('.');
    const schemaName = parts.length > 1 ? parts[0] : undefined;
    const tableName = parts.length > 1 ? parts[1] : parts[0];

    const fullTableName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);

    // Parse permissive
    let permissiveStr = 'PERMISSIVE';
    const permissiveMatch = sql.match(/\bAS\s+(PERMISSIVE|RESTRICTIVE)\b/i);
    if (permissiveMatch) {
        permissiveStr = permissiveMatch[1].toUpperCase();
    }

    // Parse command (cmd)
    let command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'ALL';
    const cmdMatch = sql.match(/\bFOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\b/i);
    if (cmdMatch) {
        command = cmdMatch[1].toUpperCase() as any;
    }

    // Parse roles
    let rolesArray: string[] = ['public'];
    const rolesMatch = sql.match(/\bTO\s+(.+?)(?:\s+USING\s+|\s+WITH\s+CHECK\s+|$|;)/i);
    if (rolesMatch) {
        // filter out keywords if they get matched in case of missing spaces or boundaries
        const rolesStr = rolesMatch[1].split(/\b(USING|WITH)\b/i)[0].trim();
        rolesArray = rolesStr.split(',').map(r => r.trim().replace(/^["']|["']$/g, '')).filter(r => r.length > 0);
    }

    // Parse USING expression
    let using: string | undefined;
    const usingMatchIdx = sql.search(/\bUSING\s*\(/i);
    if (usingMatchIdx !== -1) {
        const openParenIndex = sql.indexOf('(', usingMatchIdx);
        if (openParenIndex !== -1) {
            using = extractBalancedParentheses(sql, openParenIndex);
        }
    }

    // Parse WITH CHECK expression
    let withCheck: string | undefined;
    const withCheckMatchIdx = sql.search(/\bWITH\s+CHECK\s*\(/i);
    if (withCheckMatchIdx !== -1) {
        const openParenIndex = sql.indexOf('(', withCheckMatchIdx);
        if (openParenIndex !== -1) {
            withCheck = extractBalancedParentheses(sql, openParenIndex);
        }
    }

    // Parse bypass RLS
    const bypassRls = /BYPASS\s+RLS/i.test(sql);

    // Parse check option
    const checkOption = /CHECK\s+OPTION/i.test(sql) ? 'CASCADED' : undefined;

    const policy: Policy = {
        name: policyName,
        schema: schemaName || (context ? context.currentSchema : undefined),
        table: tableName,
        permissive: permissiveStr as any,
        roles: rolesArray,
        command,
        cmd: command,
        using,
        usingExpression: using,
        withCheck,
        checkExpression: withCheck,
        bypassRls,
        checkOption: checkOption as any,
    };

    // Track dependency and register policy
    if (context) {
        context.policies.set(policyName, policy);
        context.addDependency(policyName, fullTableName);
    }

    return { success: true, policy, confidence: 0.95 };
}