import { Procedure, ProcedureParameter, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateProcedureRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createFunction);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE PROCEDURE' };
    }

    const orReplace = !!match[1];
    const orAlter = !!match[2];
    const securityDefiner = /DEFINER/i.test(sql);
    const name = match[7];
    const schemaName = match[8];
    const params = match[9];
    const returnType = match[10];
    const language = match[11];
    const body = match[12];

    const fullFuncName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    // Parse parameters
    const parameters = parseFunctionParameters(params || '');

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

    const procedure: Procedure = {
        name: name,
        schema: schemaName || context?.currentSchema,
        language: language || 'sql',
        parameters,
        body: body?.replace(/^'|'$/g, ''),
        volatility: /IMMUTABLE/i.test(sql) ? 'IMMUTABLE' : /STABLE/i.test(sql) ? 'STABLE' : 'VOLATILE',
        securityDefiner,
        setOptions,
    };

    // Track dependency
    if (context) {
        context.addDependency(name, fullFuncName);
    }

    return { success: true, function: procedure, confidence: 0.9 };
}

function parseFunctionParameters(params: string): ProcedureParameter[] {
    const parameters: ProcedureParameter[] = [];
    
    if (!params.trim()) {
        return parameters;
    }

    // Simple parameter parsing - split by comma and parse each
    const parts = params.split(',').map(s => s.trim());
    
    for (const part of parts) {
        if (!part) continue;
        
        const param: ProcedureParameter = { type: '' };
        
        // Check for mode (IN, OUT, INOUT, VARIADIC)
        const modeMatch = part.match(/^(IN|OUT|INOUT|VARIADIC)\s+/i);
        if (modeMatch) {
            param.mode = modeMatch[1].toUpperCase() as 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
        }
        
        // Extract parameter name and type
        const nameTypeMatch = part.replace(/^(IN|OUT|INOUT|VARIADIC)\s+/i, '').match(/^(\w*)\s*(?:\w+)?\s*(?:default\s+[^,]+)?/i);
        if (nameTypeMatch) {
            if (nameTypeMatch[1]) {
                param.name = nameTypeMatch[1];
            }
            param.type = part.split(/\s+/).pop() || 'unknown';
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