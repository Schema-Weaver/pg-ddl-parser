import { Extension, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateExtensionRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createExtension);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE EXTENSION' };
    }

    const schemaMatch = sql.match(/SCHEMA\s+(?:"?(\w+)"?)/i);
    const schemaName = schemaMatch ? schemaMatch[1] : (context ? context.currentSchema : 'public');

    const versionMatch = sql.match(/VERSION\s+'([^']+)'/i);
    const version = versionMatch ? versionMatch[1] : undefined;

    const extension: Extension = {
        name: match[1],
        schema: schemaName,
        version,
    };

    return { success: true, extension, confidence: 1.0 };
}