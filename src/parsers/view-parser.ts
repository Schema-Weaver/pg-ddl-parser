import { View, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateViewRegex(sql: string, context: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createView);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE VIEW' };
    }

    const isMaterialized = !!match[1];
    const schemaName = match[2];
    const viewName = match[3];

    // Extract check option
    let checkOption: 'CASCADED' | 'LOCAL' | undefined;
    const checkMatch = sql.match(/WITH\s+(LOCAL|CASCADED)?\s*CHECK\s+OPTION/i);
    if (checkMatch) {
        if (checkMatch[1]) {
            checkOption = checkMatch[1].toUpperCase() as 'CASCADED' | 'LOCAL';
        } else {
            checkOption = 'CASCADED';
        }
    }

    // Extract security options
    const securityBarrier = /SECURITY\s+BARrier\s*=\s*true/i.test(sql);
    const securityInvoker = /SECURITY\s+INVOKER/i.test(sql) || /SECURITY\s*=\s*INVOKER/i.test(sql);

    const view: View = {
        name: viewName,
        schema: schemaName || context.currentSchema,
        isMaterialized,
        isRecursive: /RECURSIVE/i.test(sql),
        query: sql.slice((match.index ?? 0) + match[0].length),
        checkOption,
        securityBarrier: securityBarrier || undefined,
        securityInvoker: securityInvoker || undefined,
        verificationLevel: 'HEURISTIC',
    };

    return { success: true, view, confidence: 0.9 };
}