import { PostgresFunction, FunctionParameter, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateFunctionExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createFunction);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE FUNCTION' };
    }

    const orReplace = !!match[1];
    const orAlter = !!match[2];
    const isProcedure = /PROCEDURE/i.test(sql);
    const name = match[7];
    const schemaName = match[8];
    const params = match[9];
    const returnType = match[10];
    const language = match[11];
    const body = match[12];

    const fullFuncName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    // Parse parameters
    const parameters = parseFunctionParameters(params || '');

    // Parse volatility
    let volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE' | undefined;
    if (/IMMUTABLE/i.test(sql)) {
        volatility = 'IMMUTABLE';
    } else if (/STABLE/i.test(sql)) {
        volatility = 'STABLE';
    } else {
        volatility = 'VOLATILE';
    }

    // Parse SET options
    const setOptions: { category: string; name: string; value: string }[] = [];
    const setMatches = sql.matchAll(/SET\s+(\w+)\s*=\s*([^;]+)/gi);
    for (const m of setMatches) {
        setOptions.push({
            category: 'option',
            name: m[1],
            value: m[2],
        });
    }

    // Parse cost
    const cost = sql.match(/COST\s+(\d+)/i)?.[1] ? parseInt(sql.match(/COST\s+(\d+)/i)![1], 10) : undefined;

    // Parse rows
    const rows = sql.match(/ROWS\s+(\d+)/i)?.[1] ? parseInt(sql.match(/ROWS\s+(\d+)/i)![1], 10) : undefined;

    // Parse parallel
    let parallel: 'SAFE' | 'RESTRICTED' | 'UNSAFE' | undefined;
    const parallelMatch = sql.match(/PARALLEL\s+(SAFE|RESTRICTED|UNSAFE)/i);
    if (parallelMatch) {
        parallel = parallelMatch[1] as any;
    }

    // Parse strict
    const strict = /STRICT/i.test(sql);

    // Parse returns null on null input
    const returnsNullOnNullInput = /RETURNS\s+NULL\s+ON\s+NULL\s+INPUT/i.test(sql);

    // Parse set returning
    const setReturning = /SETOF/i.test(returnType || '');

    const functionDef: PostgresFunction = {
        name: name,
        schema: schemaName || context?.currentSchema,
        language: language || 'sql',
        returnType: returnType,
        isProcedure,
        parameters,
        body: body?.replace(/^'|'$/g, ''),
        volatility: volatility,
        securityDefiner: /DEFINER/i.test(sql),
        setOptions,
        cost,
        rows,
        parallel,
        returnsNullOnNullInput,
        strict,
        setReturning,
        transforms: [],
        windowFunc: false,
        aggregate: false,
        variadic: undefined,
        options: [],
        implements: undefined,
        externalName: undefined,
        sqlBody: body?.replace(/^'|'$/g, ''),
    };

    // Track dependency
    if (context) {
        context.addDependency(name, fullFuncName);
    }

    return { success: true, function: functionDef, confidence: 0.95 };
}

function parseFunctionParameters(params: string): FunctionParameter[] {
    const parameters: FunctionParameter[] = [];
    
    if (!params.trim()) {
        return parameters;
    }

    // Split by comma, handling nested parentheses
    const parts = splitByComma(params);
    
    for (const part of parts) {
        if (!part.trim()) continue;
        
        const param: FunctionParameter = { type: '' };
        
        // Check for mode (IN, OUT, INOUT, VARIADIC)
        const modeMatch = part.match(/^(IN|OUT|INOUT|VARIADIC)\s+/i);
        if (modeMatch) {
            param.mode = modeMatch[1].toUpperCase() as 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
        }
        
        // Extract parameter name and type
        const cleaned = part.replace(/^(IN|OUT|INOUT|VARIADIC)\s+/i, '').trim();
        
        // Handle named parameters
        const namedMatch = cleaned.match(/^(\w+)\s*:\s*([^:]+)/);
        if (namedMatch) {
            param.name = namedMatch[1];
            param.type = namedMatch[2].trim();
        } else {
            // Positional parameter
            const typeMatch = cleaned.match(/^(\w+)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (typeMatch) {
                param.name = typeMatch[1];
                param.type = typeMatch[2];
            } else {
                // Just type (anonymous parameter)
                param.type = cleaned.split(/\s+/)[0] || 'unknown';
            }
        }
        
        // Check for default value
        const defaultMatch = part.match(/default\s+([^,]+)/i);
        if (defaultMatch) {
            param.default = defaultMatch[1].trim();
        }
        
        parameters.push(param);
    }
    
    return parameters;
}

function splitByComma(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (const char of str) {
        if (!inString && (char === "'" || char === '"')) {
            inString = true;
            stringChar = char;
        } else if (inString && char === stringChar) {
            inString = false;
        }

        if (!inString) {
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (char === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
                continue;
            }
        }

        current += char;
    }

    if (current.trim()) {
        result.push(current.trim());
    }

    return result;
}