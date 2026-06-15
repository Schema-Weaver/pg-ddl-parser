import { PostgresFunction, FunctionParameter, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateFunctionRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createFunction);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE FUNCTION' };
    }

    const schemaName = match[1];
    const funcName = match[2];
    const paramsStr = match[3];
    const returnType = match[4];

    const fullName = context ? context.qualifyName(funcName, schemaName) : (schemaName ? `${schemaName}.${funcName}` : funcName);

    // Extract language
    const langMatch = sql.match(/LANGUAGE\s+(\w+)/i);
    const language = langMatch ? langMatch[1] : 'sql';

    // Extract volatility
    let volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE' | undefined;
    if (/\bIMMUTABLE\b/i.test(sql)) volatility = 'IMMUTABLE';
    else if (/\bSTABLE\b/i.test(sql)) volatility = 'STABLE';
    else if (/\bVOLATILE\b/i.test(sql)) volatility = 'VOLATILE';

    // Extract parallel safety
    let parallel: 'SAFE' | 'RESTRICTED' | 'UNSAFE' | undefined;
    const parallelMatch = sql.match(/\bPARALLEL\s+(SAFE|RESTRICTED|UNSAFE)\b/i);
    if (parallelMatch) {
        parallel = parallelMatch[1].toUpperCase() as 'SAFE' | 'RESTRICTED' | 'UNSAFE';
    }

    // Extract SECURITY DEFINER/INVOKER
    const securityDefiner = /\bSECURITY\s+DEFINER\b/i.test(sql);
    const securityInvoker = /\bSECURITY\s+INVOKER\b/i.test(sql);

    // Extract COST
    let cost: number | undefined;
    const costMatch = sql.match(/\bCOST\s+(\d+)/i);
    if (costMatch) {
        cost = parseInt(costMatch[1], 10);
    }

    // Extract ROWS
    let rows: number | undefined;
    const rowsMatch = sql.match(/\bROWS\s+(\d+)/i);
    if (rowsMatch) {
        rows = parseInt(rowsMatch[1], 10);
    }

    // Extract SET options
    const setOptions: { category: string; name: string; value: string }[] = [];
    const setRegex = /\bSET\s+(\w+)\s*=\s*'([^']+)'/gi;
    let setMatch;
    while ((setMatch = setRegex.exec(sql)) !== null) {
        setOptions.push({
            category: 'runtime',
            name: setMatch[1],
            value: setMatch[2]
        });
    }

    // Detect RETURNS SETOF
    const setReturning = /\bRETURNS\s+SETOF\b/i.test(sql);

    // Extract SQL body (PG14+: RETURN expr or BEGIN ATOMIC ... END)
    let sqlBody: string | undefined;
    const returnMatch = sql.match(/\bRETURN\s+([^;]+?)(?:\s*;?\s*$)/i);
    if (returnMatch && !sql.includes('$$')) {
        sqlBody = returnMatch[1].trim();
    }
    const atomicMatch = sql.match(/\bBEGIN\s+ATOMIC\s+([\s\S]+?)\s+END\b/i);
    if (atomicMatch) {
        sqlBody = 'BEGIN ATOMIC ' + atomicMatch[1].trim() + ' END';
    }

    // Extract function body (dollar-quoted: $$ ... $$ or $tag$ ... $tag$)
    let body: string | undefined;
    const bodyMatch = sql.match(/\$([^$]*)\$([\s\S]*?)\$\1\$/);
    if (bodyMatch) {
        body = bodyMatch[2].trim();
    }

    // Parse parameters
    const parameters: FunctionParameter[] = [];
    if (paramsStr) {
        const paramParts = splitParams(paramsStr);
        for (const part of paramParts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const param = parseParamStr(trimmed);
            if (param) parameters.push(param);
        }
    }

    const func: PostgresFunction = {
        name: fullName,
        schema: schemaName || (context ? context.currentSchema : undefined),
        language,
        returnType,
        isProcedure: /CREATE\s+(?:OR\s+REPLACE\s+)?PROCEDURE/i.test(sql),
        body,
        volatility,
        parameters: parameters,
        arguments: parameters,
        parallel,
        cost,
        rows,
        setReturning,
        setOptions: setOptions.length > 0 ? setOptions : undefined,
        sqlBody,
        securityDefiner,
    };

    return { success: true, function: func, confidence: 0.75 };
}

/** Split function parameters respecting nested parens (e.g. DEFAULT values) */
function splitParams(str: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
        if (ch === '(') { depth++; current += ch; }
        else if (ch === ')') { depth--; current += ch; }
        else if (ch === ',' && depth === 0) { parts.push(current); current = ''; }
        else { current += ch; }
    }
    if (current.trim()) parts.push(current);
    return parts;
}

/** Parse a single parameter string like "IN name type DEFAULT value" or "name IN type DEFAULT value" */
function parseParamStr(str: string): FunctionParameter | null {
    const tokens = str.trim().split(/\s+/);
    if (tokens.length === 0) return null;

    let mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC' | undefined;
    let name: string | undefined;
    let type: string;
    let idx = 0;

    // Check for mode as first token: "IN name type"
    const first = tokens[0].toUpperCase();
    if (['IN', 'OUT', 'INOUT', 'VARIADIC'].includes(first)) {
        mode = first as any;
        idx++;
    }

    // Find DEFAULT position
    const defaultIdx = tokens.findIndex((t, i) => i >= idx && t.toUpperCase() === 'DEFAULT');

    // Find mode keyword later in tokens: "name IN type"
    if (!mode) {
        const modeIdx = tokens.findIndex((t, i) => i >= idx && ['IN', 'OUT', 'INOUT', 'VARIADIC'].includes(t.toUpperCase()));
        if (modeIdx > idx) {
            name = tokens.slice(idx, modeIdx).join(' ');
            mode = tokens[modeIdx].toUpperCase() as any;
            const typeEnd = defaultIdx > 0 ? defaultIdx : tokens.length;
            type = tokens.slice(modeIdx + 1, typeEnd).join(' ');
        }
    }

    if (!mode) {
        // Default mode is IN
        mode = 'IN';
    }

    if (!name) {
        // Either "name type" or just "type"
        if (defaultIdx > idx + 1 || (defaultIdx === -1 && tokens.length > idx + 1)) {
            name = tokens[idx];
            const typeEnd = defaultIdx > 0 ? defaultIdx : tokens.length;
            type = tokens.slice(idx + 1, typeEnd).join(' ');
        } else {
            const typeEnd = defaultIdx > 0 ? defaultIdx : tokens.length;
            type = tokens.slice(idx, typeEnd).join(' ');
        }
    }

    let defaultVal: string | undefined;
    if (defaultIdx >= 0) {
        defaultVal = tokens.slice(defaultIdx + 1).join(' ');
    }

    return { name, type, mode, default: defaultVal };
}