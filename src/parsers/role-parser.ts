import { Role, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateRoleRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createRole);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE ROLE' };
    }

    const roleName = match[2];
    const upperSql = sql.toUpperCase();

    const role: Role = {
        name: roleName,
        isSuperuser: upperSql.includes('SUPERUSER') && !upperSql.includes('NOSUPERUSER'),
        canLogin: upperSql.includes('LOGIN') && !upperSql.includes('NOLOGIN'),
        canCreateDb: upperSql.includes('CREATEDB') && !upperSql.includes('NOCREATEDB'),
        canCreateRole: upperSql.includes('CREATEROLE') && !upperSql.includes('NOCREATEROLE'),
        inherit: upperSql.includes('INHERIT') && !upperSql.includes('NOINHERIT'),
        bypassRls: upperSql.includes('BYPASSRLS') && !upperSql.includes('NOBYPASSRLS'),
    };

    if (context) {
        context.roles.set(roleName, role);
    }

    return { success: true, role, confidence: 0.95 };
}