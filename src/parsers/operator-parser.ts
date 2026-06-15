import { Operator, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateOperatorRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createOperator);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE OPERATOR' };
    }

    const name = match[1];
    const schemaName = match[2];
    const operatorParams = match[3];

    const fullOpName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    // Parse operator parameters
    const parameters = parseOperatorParameters(operatorParams);

    const operator: Operator = {
        name: name,
        schema: schemaName || context?.currentSchema,
        leftType: parameters.leftType || 'any',
        rightType: parameters.rightType || 'any',
        procedure: parameters.procedure || '',
        commutator: parameters.commutator || '',
        negator: parameters.negator || '',
        restrict: parameters.restrict || '',
        join: parameters.join || '',
        hashes: parameters.hashes || false,
        merges: parameters.merges || false,
    };

    // Track dependency
    if (context) {
        context.addDependency(name, fullOpName);
    }

    return { success: true, function: operator, confidence: 0.9 };
}

function parseOperatorParameters(params: string): any {
    const result: any = {};
    
    // Parse parameters from CREATE OPERATOR syntax
    // Usually looks like: (leftarg = type1, rightarg = type2, procedure = func, ...)
    
    if (/LEFTARG\s*=\s*(\w+)/i.test(params)) {
        const leftMatch = params.match(/LEFTARG\s*=\s*(\w+)/i);
        if (leftMatch) result.leftType = leftMatch[1];
    }
    
    if (/RIGHTARG\s*=\s*(\w+)/i.test(params)) {
        const rightMatch = params.match(/RIGHTARG\s*=\s*(\w+)/i);
        if (rightMatch) result.rightType = rightMatch[1];
    }
    
    if (/PROCEDURE\s*=\s*(\w+)/i.test(params)) {
        const procMatch = params.match(/PROCEDURE\s*=\s*(\w+)/i);
        if (procMatch) result.procedure = procMatch[1];
    }
    
    if (/COMMUTATOR\s*=\s*(\w+)/i.test(params)) {
        const commMatch = params.match(/COMMUTATOR\s*=\s*(\w+)/i);
        if (commMatch) result.commutator = commMatch[1];
    }
    
    if (/NEGATOR\s*=\s*(\w+)/i.test(params)) {
        const negMatch = params.match(/NEGATOR\s*=\s*(\w+)/i);
        if (negMatch) result.negator = negMatch[1];
    }
    
    if (/RESTRICT\s*=\s*(\w+)/i.test(params)) {
        const restMatch = params.match(/RESTRICT\s*=\s*(\w+)/i);
        if (restMatch) result.restrict = restMatch[1];
    }
    
    if (/JOIN\s*=\s*(\w+)/i.test(params)) {
        const joinMatch = params.match(/JOIN\s*=\s*(\w+)/i);
        if (joinMatch) result.join = joinMatch[1];
    }
    
    if (/HASHES/i.test(params)) {
        result.hashes = true;
    }
    
    if (/MERGES/i.test(params)) {
        result.merges = true;
    }
    
    return result;
}