import { Collation, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateCollationRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createCollation);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE COLLATION' };
    }

    const name = match[1];
    const schemaName = match[2];
    const params = match[3];

    const fullCollationName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    const collation: Collation = {
        name: name,
        schema: schemaName,
        provider: /PROVIDER\s+=\s+icu/i.test(params) ? 'icu' : 'libc',
        locale: sql.match(/LOCALE\s+=\s+'([^']*)'/i)?.[1],
        collate: sql.match(/COLLCATE\s+=\s+'([^']*)'/i)?.[1],
        ctype: sql.match(/CTYPE\s+=\s+'([^']*)'/i)?.[1],
        deterministic: /DETERMINISTIC\s+=\s+true/i.test(params),
        version: sql.match(/VERSION\s+=\s+'([^']*)'/i)?.[1],
    };

    // Track dependency
    if (context) {
        context.addDependency(name, fullCollationName);
    }

    return { success: true, function: collation, confidence: 0.9 };
}