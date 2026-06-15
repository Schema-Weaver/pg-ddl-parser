import { Aggregate, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateAggregateRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createAggregate);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE AGGREGATE' };
    }

    const schemaName = match[1];
    const name = match[2];
    const baseType = match[3];
    const aggParams = match[4];

    const fullAggName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    // Parse aggregate parameters
    const parameters = parseAggregateParameters(aggParams);

    const aggregate: Aggregate = {
        name: name,
        schema: schemaName || context?.currentSchema,
        baseType: baseType || 'any',
        finalFunc: parameters.finalFunc || '',
        initCond: parameters.initCond || '',
        finalFuncExtra: parameters.finalFuncExtra || false,
        sortOperator: parameters.sortOperator || '',
        combineFunc: parameters.combineFunc || '',
        serializeFunc: parameters.serializeFunc || '',
        deserializeFunc: parameters.deserializeFunc || '',
        msfunc: parameters.msfunc || '',
        minvfunc: parameters.minvfunc || '',
        mfinalfunc: parameters.mfinalfunc || '',
        minitcond: parameters.minitcond || '',
        mfinalfuncExtra: parameters.mfinalfuncExtra || false,
        mfinalfuncDirect: parameters.mfinalfuncDirect || false,
        hashable: parameters.hashable || false,
    };

    // Track dependency
    if (context) {
        context.addDependency(name, fullAggName);
    }

    return { success: true, aggregate, confidence: 0.9 };
}

function parseAggregateParameters(params: string): any {
    const result: any = {};
    
    // Parse parameters from CREATE AGGREGATE syntax
    // Format: SFUNC = func, STYPE = type, FINALFUNC = func, etc.
    
    // SFUNC (state transition function)
    const sfuncMatch = params.match(/SFUNC\s*=\s*(\w+)/i);
    if (sfuncMatch) result.sfunc = sfuncMatch[1];
    
    // STYPE (state type)
    const stypeMatch = params.match(/STYPE\s*=\s*([\w\[\]]+)/i);
    if (stypeMatch) result.stype = stypeMatch[1];
    
    // FINALFUNC
    const finalFuncMatch = params.match(/FINALFUNC\s*=\s*(\w+)/i);
    if (finalFuncMatch) result.finalFunc = finalFuncMatch[1];
    
    // INITCOND
    const initCondMatch = params.match(/INITCOND\s*=\s*'([^']*)'/i);
    if (initCondMatch) result.initCond = initCondMatch[1];
    
    // SORTOP
    const sortOpMatch = params.match(/SORTOP\s*=\s*'([^']+)'/i);
    if (sortOpMatch) result.sortOperator = sortOpMatch[1];
    
    // COMBINEFUNC
    const combineFuncMatch = params.match(/COMBINEFUNC\s*=\s*(\w+)/i);
    if (combineFuncMatch) result.combineFunc = combineFuncMatch[1];
    
    // SERIALFUNC
    const serializeFuncMatch = params.match(/SERIALFUNC\s*=\s*(\w+)/i);
    if (serializeFuncMatch) result.serializeFunc = serializeFuncMatch[1];
    
    // DESERIALFUNC
    const deserializeFuncMatch = params.match(/DESERIALFUNC\s*=\s*(\w+)/i);
    if (deserializeFuncMatch) result.deserializeFunc = deserializeFuncMatch[1];
    
    // MSFUNC
    const msfuncMatch = params.match(/MSFUNC\s*=\s*(\w+)/i);
    if (msfuncMatch) result.msfunc = msfuncMatch[1];
    
    // MINVFUNC
    const minvfuncMatch = params.match(/MINVFUNC\s*=\s*(\w+)/i);
    if (minvfuncMatch) result.minvfunc = minvfuncMatch[1];
    
    // MFINALFUNC
    const mfinalfuncMatch = params.match(/MFINALFUNC\s*=\s*(\w+)/i);
    if (mfinalfuncMatch) result.mfinalfunc = mfinalfuncMatch[1];
    
    // MINITCOND
    const minitcondMatch = params.match(/MINITCOND\s*=\s*'([^']*)'/i);
    if (minitcondMatch) result.minitcond = minitcondMatch[1];
    
    // Boolean flags
    if (/FINALFUNC\s*=\s*EXTRA/i.test(params)) result.finalFuncExtra = true;
    if (/MFINALFUNC\s*=\s*EXTRA/i.test(params)) result.mfinalfuncExtra = true;
    if (/MFINALFUNC\s*=\s*DIRECT/i.test(params)) result.mfinalfuncDirect = true;
    if (/\bHASHABLE\b/i.test(params)) result.hashable = true;
    
    return result;
}