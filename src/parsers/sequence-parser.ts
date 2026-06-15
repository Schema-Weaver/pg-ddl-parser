import { Sequence, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateSequenceRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createSequence);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE SEQUENCE' };
    }

    const schemaName = match[1];
    const seqName = match[2];
    const fullName = context ? context.qualifyName(seqName, schemaName) : (schemaName ? `${schemaName}.${seqName}` : seqName);

    const sequence: Sequence = {
        name: fullName,
        schema: schemaName || (context ? context.currentSchema : undefined),
    };

    return { success: true, sequence, confidence: 0.95 };
}