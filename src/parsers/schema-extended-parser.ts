import { Schema, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateSchemaExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createSchema);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE SCHEMA' };
    }

    const ifNotExists = !!match[1];
    const schemaName = match[2];
    const authorization = match[3];

    const schema: Schema = {
        name: schemaName,
        authorization: authorization || undefined,
        charset: undefined,
        collation: undefined,
        comment: undefined,
    };

    // Parse AUTHORIZATION
    const authMatch = sql.match(/AUTHORIZATION\s+(\w+)/i);
    if (authMatch) {
        schema.authorization = authMatch[1];
    }

    // Parse default character set
    const charsetMatch = sql.match(/DEFAULT\s+CHARACTER\s+SET\s+(\w+)/i);
    if (charsetMatch) {
        schema.charset = charsetMatch[1];
    }

    // Parse default collation
    const collationMatch = sql.match(/DEFAULT\s+COLLATION\s+(\w+)/i);
    if (collationMatch) {
        schema.collation = collationMatch[1];
    }

    return { success: true, function: schema, confidence: 0.95 };
}