import { RegexParseResult } from '../types';

export function parseCreateSchemaRegex(sql: string): RegexParseResult {
    const match = sql.match(/CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?(.+?)(?:\s+AUTHORIZATION\s+.+)?\s*;/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE SCHEMA' };
    }

    return { success: true, schema: match[1], confidence: 1.0 };
}