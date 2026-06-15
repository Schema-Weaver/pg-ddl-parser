import { Role, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseCreateRoleExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createRole);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE ROLE' };
    }

    const name = match[1];
    const password = match[2];
    const options = match[3];

    const role: Role = {
        name: name,
        password: password || undefined,
        login: /LOGIN/i.test(sql),
        inherit: /INHERIT/i.test(sql),
        superuser: /SUPERUSER/i.test(sql),
        createdb: /CREATEDB/i.test(sql),
        createrole: /CREATEROLE/i.test(sql),
        replication: /REPLICATION/i.test(sql),
        bypassrls: /BYPASSRLS/i.test(sql),
        connectionLimit: sql.match(/CONNECTION\s+LIMIT\s+(-?\d+)/i)?.[1] ? parseInt(sql.match(/CONNECTION\s+LIMIT\s+(-?\d+)/i)![1], 10) : undefined,
        validUntil: sql.match(/VALID\s+UNTIL\s+'([^']*)'/i)?.[1],
        inRole: [],
        role: [],
        admin: [],
        settings: [],
        memberOptions: [],
    };

    // Parse IN ROLE
    const inRoleMatch = sql.match(/IN\s+ROLE\s+(\w+(?:\s*,\s*\w+)*)/i);
    if (inRoleMatch) {
        role.inRole = inRoleMatch[1].split(',').map(r => r.trim());
    }

    // Parse ROLE
    const roleMatch = sql.match(/ROLE\s+(\w+(?:\s*,\s*\w+)*)/i);
    if (roleMatch) {
        role.role = roleMatch[1].split(',').map(r => r.trim());
    }

    // Parse ADMIN
    const adminMatch = sql.match(/ADMIN\s+(\w+(?:\s*,\s*\w+)*)/i);
    if (adminMatch) {
        role.admin = adminMatch[1].split(',').map(r => r.trim());
    }

    // Parse SETTINGS
    const settings: { role: string; database?: string; variable: string; value: string }[] = [];
    const settingMatches = sql.matchAll(/SETTING\s+(\w+)\s*=\s*([^;]+)/gi);
    for (const m of settingMatches) {
        settings.push({
            role: name,
            variable: m[1],
            value: m[2],
        });
    }
    role.settings = settings;

    // Parse MEMBER OPTIONS
    const memberOptions: { role: string; admin?: boolean; inherit?: boolean; set?: boolean }[] = [];
    const memberMatches = sql.matchAll(/WITH\s+(ADMIN|INHERIT|SET)\s+OPTION/i);
    for (const m of memberMatches) {
        memberOptions.push({
            role: name,
            [m[1].toLowerCase()]: true,
        });
    }
    role.memberOptions = memberOptions;

    return { success: true, function: role, confidence: 0.95 };
}