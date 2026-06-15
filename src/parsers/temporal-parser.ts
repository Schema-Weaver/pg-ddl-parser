import { TemporalTable, TemporalPeriod, TemporalSystemVersioning, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateTemporalRegex(sql: string, context?: ParseContext): RegexParseResult {
    // Check for PERIOD constraint
    const periodMatch = sql.match(/PERIOD\s+(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i);
    if (periodMatch) {
        const period: TemporalPeriod = {
            name: periodMatch[1],
            startColumn: periodMatch[2],
            endColumn: periodMatch[3],
        };
        
        return { success: true, function: period, confidence: 0.9 };
    }

    // Check for SYSTEM VERSIONING
    const systemVersioningMatch = sql.match(/SYSTEM_VERSIONING\s*=\s*(ON|OFF)/i);
    if (systemVersioningMatch) {
        const systemVersioning: TemporalSystemVersioning = {
            enabled: systemVersioningMatch[1].toUpperCase() === 'ON',
            historyTable: undefined,
            dataConsistencyCheck: undefined,
            retentionPeriod: undefined,
        };
        
        // Extract history table if present
        const historyTableMatch = sql.match(/HISTORY_TABLE\s*=\s*(\w+(?:\.\w+)?)/i);
        if (historyTableMatch) {
            systemVersioning.historyTable = historyTableMatch[1];
        }
        
        // Extract data consistency check if present
        const dataConsistencyMatch = sql.match(/DATA_CONSISTENCY_CHECK\s*=\s*(ON|OFF)/i);
        if (dataConsistencyMatch) {
            systemVersioning.dataConsistencyCheck = dataConsistencyMatch[1].toUpperCase() === 'ON';
        }
        
        // Extract retention period if present
        const retentionMatch = sql.match(/RETENTION_PERIOD\s*=\s*(\d+\s*\w+)/i);
        if (retentionMatch) {
            systemVersioning.retentionPeriod = retentionMatch[1];
        }
        
        return { success: true, function: systemVersioning, confidence: 0.9 };
    }

    // Check for temporal table (WITH SYSTEM VERSIONING)
    if (/WITH\s+SYSTEM\s+VERSIONING/i.test(sql)) {
        const table: TemporalTable = {
            name: '',
            schema: context?.currentSchema,
            period: undefined,
            systemVersioning: undefined,
        };
        
        const periodMatch = sql.match(/PERIOD\s+(?:FOR\s+)?(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i);
        if (periodMatch) {
            table.period = {
                name: periodMatch[1],
                startColumn: periodMatch[2],
                endColumn: periodMatch[3],
            };
        }
        
        const systemVersioningMatch = sql.match(/SYSTEM_VERSIONING\s*=\s*(ON)/i);
        if (systemVersioningMatch) {
            table.systemVersioning = {
                enabled: true,
                historyTable: undefined,
                dataConsistencyCheck: undefined,
                retentionPeriod: undefined,
            };
        }
        
        return { success: true, function: table, confidence: 0.9 };
    }

    return { success: false, confidence: 0, error: 'Could not match temporal clause' };
}