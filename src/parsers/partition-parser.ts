import { Partition, PartitionBounds, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreatePartitionRegex(sql: string, context?: ParseContext): RegexParseResult {
    // Check for PARTITION OF (child partition)
    const partOfMatch = sql.match(/PARTITION\s+OF\s+(\w+(?:\.\w+)?)\s*(\([^)]+\))?/i);
    if (partOfMatch) {
        const parentSchema = partOfMatch[1].split('.')[0];
        const parentName = partOfMatch[1].split('.').pop() || partOfMatch[1];
        const bounds = partOfMatch[2];

        const table: Partition = {
            name: '',
            schema: context?.currentSchema,
            parentTable: context?.qualifyName(parentName, parentSchema) || parentName,
            partitionType: 'range',
            partitionKey: [],
            partitionBounds: parsePartitionBounds(bounds || ''),
            tablespace: undefined,
            comment: undefined,
            subpartitionTemplate: undefined,
        };

        return { success: true, function: table, confidence: 0.9 };
    }

    // Check for PARTITION BY (partitioned table)
    const partMatch = sql.match(/PARTITION\s+BY\s+(RANGE|LIST|HASH)\s*\(\s*([^)]+)\s*\)/i);
    if (partMatch) {
        const table: Partition = {
            name: '',
            schema: context?.currentSchema,
            parentTable: '',
            partitionType: partMatch[1].toLowerCase() as any,
            partitionKey: partMatch[2].split(',').map(s => s.trim().replace(/"/g, '')),
            partitionBounds: undefined,
            tablespace: undefined,
            comment: undefined,
            subpartitionTemplate: undefined,
        };

        return { success: true, function: table, confidence: 0.9 };
    }

    // Check for ATTACH PARTITION
    const attachMatch = sql.match(/ATTACH\s+PARTITION\s+(\w+(?:\.\w+)?)\s+FOR\s+VALUES\s*\(\s*([^)]+)\s*\)/i);
    if (attachMatch) {
        const table: Partition = {
            name: attachMatch[1],
            schema: context?.currentSchema,
            parentTable: '',
            partitionType: 'range',
            partitionKey: [],
            partitionBounds: parsePartitionBounds(attachMatch[2]),
            tablespace: undefined,
            comment: undefined,
            subpartitionTemplate: undefined,
        };

        return { success: true, function: table, confidence: 0.9 };
    }

    return { success: false, confidence: 0, error: 'Could not match partition clause' };
}

function parsePartitionBounds(bounds: string): PartitionBounds | undefined {
    if (!bounds.trim()) return undefined;

    const result: PartitionBounds = {};

    // FROM ... TO
    const fromToMatch = bounds.match(/FROM\s*\(\s*([^)]+)\s*\)\s*TO\s*\(\s*([^)]+)\s*\)/i);
    if (fromToMatch) {
        result.from = fromToMatch[1].split(',').map(s => s.trim());
        result.to = fromToMatch[2].split(',').map(s => s.trim());
        return result;
    }

    // IN
    const inMatch = bounds.match(/IN\s*\(\s*([^)]+)\s*\)/i);
    if (inMatch) {
        result.in = inMatch[1].split(',').map(s => s.trim());
        return result;
    }

    // VALUES
    const valuesMatch = bounds.match(/FOR\s+VALUES\s*\(\s*([^)]+)\s*\)/i);
    if (valuesMatch) {
        result.forValues = valuesMatch[1];
        return result;
    }

    return undefined;
}