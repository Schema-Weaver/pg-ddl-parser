import { RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { parseCreatePolicyExtendedRegex } from './policy-extended-parser';

export function parseCreatePolicyRegex(sql: string, context: ParseContext): RegexParseResult {
    return parseCreatePolicyExtendedRegex(sql, context);
}