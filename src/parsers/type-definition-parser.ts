import { CompositeType, Domain, EnumType, RangeType, BaseType, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateTypeDefinitionRegex(sql: string, context?: ParseContext): RegexParseResult {
    // Check for ENUM type
    const enumMatch = sql.match(/CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+ENUM\s*\(\s*([^)]+)\s*\)/i);
    if (enumMatch) {
        const name = enumMatch[1];
        const schemaName = enumMatch[2];
        const values = enumMatch[3].split(',').map(v => v.trim().replace(/'/g, ''));

        const enumType: EnumType = {
            name: name,
            schema: schemaName || context?.currentSchema,
            values,
        };

        return { success: true, function: enumType, confidence: 0.95 };
    }

    // Check for composite type
    const compositeMatch = sql.match(/CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+\(\s*([^)]+)\s*\)/i);
    if (compositeMatch) {
        const name = compositeMatch[1];
        const schemaName = compositeMatch[2];
        const attributesStr = compositeMatch[3];

        const attributes: { name: string; type: string; default?: string }[] = [];
        const attrParts = splitByComma(attributesStr);

        for (const attr of attrParts) {
            const attrMatch = attr.trim().match(/^(\w+)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
            if (attrMatch) {
                attributes.push({
                    name: attrMatch[1],
                    type: attrMatch[2],
                });
            }
        }

        const compositeType: CompositeType = {
            name: name,
            schema: schemaName || context?.currentSchema,
            attributes,
        };

        return { success: true, function: compositeType, confidence: 0.95 };
    }

    // Check for multirange type (PG14+)
    const multirangeMatch = sql.match(/CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s+MULTIRANGE\s*\(\s*(?:SUBTYPE\s*=\s*)?(\w+)\s*\)/i);
    if (multirangeMatch) {
        const schemaName = multirangeMatch[1];
        const typeName = multirangeMatch[2];
        const subtype = multirangeMatch[3];

        const compositeType: CompositeType = {
            name: typeName,
            schema: schemaName || context?.currentSchema,
            attributes: [{ name: 'subtype', type: subtype }],
            kind: 'multirange',
            subtype,
        };

        return { success: true, compositeType, confidence: 0.95 };
    }

    // Check for range type
    const rangeMatch = sql.match(/CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+RANGE\s*\(\s*([^)]+)\s*\)/i);
    if (rangeMatch) {
        const name = rangeMatch[1];
        const schemaName = rangeMatch[2];
        const rangeParams = rangeMatch[3];

        const rangeType: RangeType = {
            name: name,
            schema: schemaName || context?.currentSchema,
            subtype: rangeParams.includes('subtype') ? 'unknown' : 'unknown',
            subtypeOpclass: undefined,
            collation: undefined,
            canonical: undefined,
            subdiff: undefined,
        };

        return { success: true, function: rangeType, confidence: 0.9 };
    }

    // Check for domain
    const domainMatch = sql.match(/CREATE\s+DOMAIN\s+(\w+(?:\.\w+)?)\s+AS\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+CONSTRAINT\s+(\w+))?(?:\s+[^;]*)?/i);
    if (domainMatch) {
        const name = domainMatch[1];
        const schemaName = domainMatch[2];
        const baseType = domainMatch[3];
        const constraintName = domainMatch[4];

        const domain: Domain = {
            name: name,
            schema: schemaName || context?.currentSchema,
            baseType,
            notNull: /NOT\s+NULL/i.test(sql),
            default: undefined,
            constraints: [],
            collation: undefined,
        };

        return { success: true, function: domain, confidence: 0.9 };
    }

    // Check for base type
    if (/CREATE\s+TYPE\s+\w+(?:\.\w+)?\s+AS\s+/.test(sql)) {
        const nameMatch = sql.match(/CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+/i);
        if (nameMatch) {
            const name = nameMatch[1];
            const schemaName = nameMatch[2];

            const baseType: BaseType = {
                name: name,
                schema: schemaName || context?.currentSchema,
                input: '',
                output: '',
                receive: undefined,
                send: undefined,
                typmodIn: undefined,
                typmodOut: undefined,
                analyze: undefined,
                internallength: -1,
                externallength: undefined,
                inputcategory: 'I',
                delimiter: ',',
                element: undefined,
                default: undefined,
                align: 'int4',
                storage: 'plain',
                category: 'U',
                preferred: false,
                deprecated: false,
                elementtype: undefined,
                arrayElemType: undefined,
                arrayBoundInfo: undefined,
            };

            return { success: true, function: baseType, confidence: 0.9 };
        }
    }

    return { success: false, confidence: 0, error: 'Could not match type definition' };
}

function splitByComma(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of str) {
        if (char === '(') depth++;
        else if (char === ')') depth--;
        else if (char === ',' && depth === 0) {
            result.push(current.trim());
            current = '';
            continue;
        }
        current += char;
    }

    if (current.trim()) {
        result.push(current.trim());
    }

    return result;
}