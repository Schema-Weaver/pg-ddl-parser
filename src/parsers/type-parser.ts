import { CompositeType, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateTypeRegex(sql: string, context?: ParseContext): RegexParseResult {
    // Skip if this is an ENUM type (handled by parseCreateEnumRegex)
    if (/AS\s+ENUM\s*\(/i.test(sql)) {
        return { success: false, confidence: 0, error: 'ENUM type - use parseCreateEnumRegex' };
    }

    // PG14+: MULTIRANGE type
    const multirangeMatch = sql.match(/CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s+MULTIRANGE\s*\(\s*(?:SUBTYPE\s*=\s*)?(\w+)\s*\)/i);
    if (multirangeMatch) {
        const schemaName = multirangeMatch[1];
        const typeName = multirangeMatch[2];
        const subtype = multirangeMatch[3];
        const compositeType: CompositeType = {
            name: typeName,
            schema: schemaName || (context ? context.currentSchema : undefined),
            attributes: [{ name: 'subtype', type: subtype }],
            kind: 'multirange',
            subtype,
        };
        return { success: true, compositeType, confidence: 0.9 };
    }

    // Check for composite type
    const match = sql.match(/CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s*\(/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE TYPE' };
    }

    const schemaName = match[1];
    const typeName = match[2];
    
    // Find the AS ( ... ) section with balanced parentheses
    const startIdx = sql.indexOf('(', match.index! + match[0].length - 1);
    if (startIdx === -1) {
        return { success: false, confidence: 0, error: 'Could not find opening parenthesis' };
    }

    let parenCount = 1;
    let endIdx = -1;
    for (let i = startIdx + 1; i < sql.length; i++) {
        if (sql[i] === '(') parenCount++;
        else if (sql[i] === ')') {
            parenCount--;
            if (parenCount === 0) {
                endIdx = i;
                break;
            }
        }
    }

    if (endIdx === -1) {
        return { success: false, confidence: 0, error: 'Could not find closing parenthesis' };
    }

    const attributesStr = sql.slice(startIdx + 1, endIdx).trim();

    // Parse attributes
    const attributes: { name: string; type: string }[] = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < attributesStr.length; i++) {
        const char = attributesStr[i];
        if (char === '(') depth++;
        else if (char === ')') depth--;

        if (char === ',' && depth === 0) {
            const parts = current.trim().split(/\s+/);
            if (parts.length > 0 && parts[0]) {
                attributes.push({
                    name: parts[0].replace(/"/g, ''),
                    type: parts.slice(1).join(' ') || 'unknown'
                });
            }
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        const parts = current.trim().split(/\s+/);
        if (parts.length > 0 && parts[0]) {
            attributes.push({
                name: parts[0].replace(/"/g, ''),
                type: parts.slice(1).join(' ') || 'unknown'
            });
        }
    }

    const compositeType: CompositeType = {
        name: typeName,
        schema: schemaName || (context ? context.currentSchema : undefined),
        attributes,
        fields: attributes,
        columns: attributes,
    };

    return { success: true, compositeType, confidence: 0.85 };
}