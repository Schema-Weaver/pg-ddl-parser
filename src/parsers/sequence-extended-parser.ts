import { Sequence, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateSequenceExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createSequence);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE SEQUENCE' };
    }

    const temporary = !!match[1];
    const schemaName = match[2];
    const sequenceName = match[3];

    const fullSequenceName = context ? context.qualifyName(sequenceName, schemaName) : (schemaName ? `${schemaName}.${sequenceName}` : sequenceName);

    const sequence: Sequence = {
        name: sequenceName,
        schema: schemaName || context?.currentSchema,
        dataType: undefined,
        start: undefined,
        increment: undefined,
        minValue: undefined,
        maxValue: undefined,
        cycle: /CYCLE/i.test(sql) && !/NO\s+CYCLE/i.test(sql),
        cache: undefined,
        order: /ORDER/i.test(sql) && !/NO\s+ORDER/i.test(sql),
        ownedBy: undefined,
        comment: undefined,
    };

    // Extract data type
    const dataTypeMatch = sql.match(/AS\s+(SMALLINT|INTEGER|BIGINT)/i);
    if (dataTypeMatch) {
        sequence.dataType = dataTypeMatch[1];
    }

    // Extract START WITH
    const startMatch = sql.match(/START\s+(WITH\s+)?(-?\d+)/i);
    if (startMatch) {
        sequence.start = parseInt(startMatch[2], 10);
    }

    // Extract INCREMENT BY
    const incrementMatch = sql.match(/INCREMENT\s+(BY\s+)?(-?\d+)/i);
    if (incrementMatch) {
        sequence.increment = parseInt(incrementMatch[2], 10);
    }

    // Extract MINVALUE
    const minMatch = sql.match(/MINVALUE\s+(-?\d+)/i);
    if (minMatch) {
        sequence.minValue = parseInt(minMatch[1], 10);
    }

    // Extract MAXVALUE
    const maxMatch = sql.match(/MAXVALUE\s+(-?\d+)/i);
    if (maxMatch) {
        sequence.maxValue = parseInt(maxMatch[1], 10);
    }

    // Extract CACHE
    const cacheMatch = sql.match(/CACHE\s+(\d+)/i);
    if (cacheMatch) {
        sequence.cache = parseInt(cacheMatch[1], 10);
    }

    // Extract OWNED BY
    const ownedByMatch = sql.match(/OWNED\s+BY\s+(\w+(?:\.\w+)?)/i);
    if (ownedByMatch) {
        sequence.ownedBy = ownedByMatch[1];
    }

    // Track in context
    if (context) {
        context.sequences.set(fullSequenceName, sequence);
    }

    return { success: true, sequence, confidence: 0.95 };
}