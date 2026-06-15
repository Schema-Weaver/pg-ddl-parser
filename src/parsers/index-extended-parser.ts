import { parseCreateIndexRegex } from './index-parser';
import { ParseContext } from '../context/parse-context';
import { RegexParseResult } from '../types';

export function parseCreateIndexExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    return parseCreateIndexRegex(sql, context);
}