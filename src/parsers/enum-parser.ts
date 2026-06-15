import { EnumType, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateEnumRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createEnum);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE TYPE ... ENUM' };
    }

    const schemaName = match[1];
    const enumName = match[2];
    const valuesStr = match[3];

    // Handle context if available, else fallback
    const fullName = context ? context.qualifyName(enumName, schemaName) : (schemaName ? `${schemaName}.${enumName}` : enumName);

    // Parse values
    const values = valuesStr
        .split(',')
        .map(v => v.trim().replace(/^'|'$/g, ''))
        .filter(v => v);

    const enumType: EnumType = {
        name: enumName,
        schema: schemaName || (context ? context.currentSchema : undefined),
        values,
    };

    return { success: true, enum: enumType, confidence: 0.95 };
}