import { View, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateViewExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createViewWithOptions) || sql.match(PATTERNS.createView);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE VIEW' };
    }

    const isMaterialized = /MATERIALIZED\s+VIEW/i.test(sql);
    const schemaName = match[1];
    const viewName = match[2];
    
    // Extract query (everything after AS)
    const asMatch = sql.match(/\bAS\s+([\s\S]+?)(?:\s+WITH\s+(?:LOCAL\s+|CASCADED\s+)?CHECK\s+OPTION)?(?:\s+WITH\s*\([^)]+\))?(?:\s+TABLESPACE\s+\w+)?(?:\s*;)?$/i);
    const query = asMatch ? asMatch[1].trim() : '';

    const fullViewName = context ? context.qualifyName(viewName, schemaName) : (schemaName ? `${schemaName}.${viewName}` : viewName);

    // Parse column list if provided (look for (...) after view name)
    let columns: string[] = [];
    const columnMatch = sql.match(/VIEW\s+(?:"?\w+"?\.)?"?\w+"?\s*\(([^)]+)\)/i);
    if (columnMatch) {
        columns = columnMatch[1]
            .split(',')
            .map(c => c.trim().replace(/"/g, ''));
    }

    // Parse WITH options (before AS or trailing after query)
    let withOptions: Record<string, string | number | boolean> = {};
    const withMatches = [
        sql.match(/\bWITH\s*\(\s*([^)]+)\s*\)\s+AS\b/i),
        sql.match(/\bWITH\s*\(\s*([^)]+)\s*\)\s*;?\s*$/i),
    ];
    const withMatch = withMatches.find(m => m);
    if (withMatch) {
        const options = withMatch[1].split(',').map(s => s.trim());
        for (const opt of options) {
            const [key, value] = opt.split('=').map(s => s.trim());
            if (key && value) {
                withOptions[key] = value === 'true' ? true : value === 'false' ? false : (isNaN(Number(value)) ? value : Number(value));
            }
        }
    }

    const view: View = {
        name: viewName,
        schema: schemaName || context?.currentSchema,
        isMaterialized,
        isRecursive: /RECURSIVE/i.test(sql),
        query,
        columns,
        comment: undefined,
        verificationLevel: 'HEURISTIC',
        withOptions,
        checkOption: /WITH\s+CHECK\s+OPTION/i.test(sql) ? 'CASCADED' : undefined,
        securityBarrier: withOptions.security_barrier === true || /security_barrier\s*=\s*true/i.test(withMatch?.[1] || ''),
        securityInvoker: withOptions.security_invoker === true || /security_invoker\s*=\s*true/i.test(withMatch?.[1] || ''),
        accessMethod: sql.match(/USING\s+(\w+)/i)?.[1],
        tablespace: sql.match(/TABLESPACE\s+(\w+)/i)?.[1],
    };

    // Track dependency
    if (context) {
        context.addDependency(viewName, fullViewName);
        context.views.set(fullViewName, view);
    }

    return { success: true, view, confidence: 0.95 };
}
