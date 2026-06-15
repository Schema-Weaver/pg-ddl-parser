import { Database, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateDatabaseRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createDatabase);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE DATABASE' };
    }

    const name = match[1];
    const options = match[2];

    const database: Database = {
        name: name,
        owner: sql.match(/OWNER\s+(\w+)/i)?.[1],
        template: sql.match(/TEMPLATE\s+(\w+)/i)?.[1],
        encoding: sql.match(/ENCODING\s+'(\w+)'/i)?.[1],
        lcCollate: sql.match(/LC_COLLATE\s+'([^']*)'/i)?.[1],
        lcCtype: sql.match(/LC_CTYPE\s+'([^']*)'/i)?.[1],
        tablespace: sql.match(/TABLESPACE\s+(\w+)/i)?.[1],
        allowConnections: !/ALLOW_CONNECTIONS\s+=\s+false/i.test(sql),
        connectionLimit: sql.match(/CONNECTION\s+LIMIT\s+(-?\d+)/i)?.[1] ? parseInt(sql.match(/CONNECTION\s+LIMIT\s+(-?\d+)/i)![1], 10) : undefined,
        isTemplate: /IS_TEMPLATE/i.test(sql),
        comment: undefined,
    };

    return { success: true, function: database, confidence: 0.95 };
}