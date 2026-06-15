import { Domain, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateDomainRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createDomain);
    if (match) {
        const schemaName = match[1];
        const domainName = match[2];
        const baseType = match[3];
        const fullName = context ? context.qualifyName(domainName, schemaName) : (schemaName ? `${schemaName}.${domainName}` : domainName);

        const domain: Domain = {
            name: domainName,
            schema: schemaName || (context ? context.currentSchema : undefined),
            baseType: baseType.trim(),
            notNull: /\bNOT\s+NULL\b/i.test(sql),
        };

        // Extract CHECK constraint - handle nested parens
        const checkMatch = sql.match(/CHECK\s*\((.+)\)\s*(?:;|$)/i);
        if (checkMatch) {
            domain.checkExpression = checkMatch[1].trim();
        }

        // Extract DEFAULT - capture until next keyword or end
        const defaultMatch = sql.match(/\bDEFAULT\s+([^,\s)(]+(?:\([^)]*\))?)/i);
        if (defaultMatch) {
            domain.default = defaultMatch[1].trim();
        }

        // Extract COLLATE
        const collateMatch = sql.match(/\bCOLLATE\s+"?(\w+)"?/i);
        if (collateMatch) {
            domain.collation = collateMatch[1];
        }

        if (context) {
            context.domains.set(fullName, domain);
        }

        return { success: true, domain, confidence: 0.9 };
    }

    // Try a simpler pattern if normal match fails
    const simpleMatch = sql.match(/CREATE\s+DOMAIN\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+(?:AS\s+)?([A-Za-z][A-Za-z0-9_()\[\],\s]*?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|CHECK|COLLATE)[\s\S]*)?$/i);
    if (!simpleMatch) {
        return { success: false, confidence: 0, error: 'Could not match CREATE DOMAIN' };
    }

    const schemaName = simpleMatch[1];
    const domainName = simpleMatch[2];
    const baseType = simpleMatch[3].trim();
    const fullName = context ? context.qualifyName(domainName, schemaName) : (schemaName ? `${schemaName}.${domainName}` : domainName);

    const domain: Domain = {
        name: domainName,
        schema: schemaName || (context ? context.currentSchema : undefined),
        baseType,
        notNull: /\bNOT\s+NULL\b/i.test(sql),
    };

    // Extract COLLATE
    const collateMatch = sql.match(/\bCOLLATE\s+"?(\w+)"?/i);
    if (collateMatch) {
        domain.collation = collateMatch[1];
    }

    if (context) {
        context.domains.set(fullName, domain);
    }

    return {
        success: true,
        domain,
        confidence: 0.8
    };
}