import { Table, Column, NamedConstraint, TableLevelPrimaryKey, TableLevelForeignKey, TemporalConstraint, PropertyGraphTable, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';
import { parseConstraintDefinitions } from './constraints-parser';

export function parseCreateTableExtendedRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createTable);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE TABLE' };
    }

    const temporary = match[1];
    const ifNotExists = !!match[2];
    const tableName = match[3];
    const schemaName = match[4];

    const fullTableName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);

    // Determine table type
    const isTemporary = /TEMP(?:ORARY)?/i.test(sql);
    const isUnlogged = /UNLOGGED/i.test(sql);

    const table: Table = {
        name: tableName,
        schema: schemaName || context?.currentSchema,
        columns: [],
        isPartitioned: /PARTITION\s+BY/i.test(sql),
        partitionType: undefined,
        partitionKey: undefined,
        partitionOf: undefined,
        partitionBounds: undefined,
        inheritsFrom: undefined,
        isTemporary,
        isUnlogged,
        checkConstraints: [],
        uniqueConstraints: [],
        foreignKeys: [],
        confidence: 0.8,
        with: {},
        rlsEnabled: /ROW\s+LEVEL\s+SECURITY/i.test(sql),
    };

    // Extract WITH options
    const withMatch = sql.match(/WITH\s*\(\s*([^)]+)\s*\)/i);
    if (withMatch) {
        const options = withMatch[1].split(',').map(s => s.trim());
        for (const opt of options) {
            const [key, value] = opt.split('=').map(s => s.trim());
            if (key && value) {
                table.with[key] = isNaN(Number(value)) ? value : Number(value);
            }
        }
    }

    // Extract access method
    const accessMethodMatch = sql.match(/USING\s+(\w+)/i);
    if (accessMethodMatch) {
        table.accessMethod = accessMethodMatch[1];
    }

    // Extract tablespace
    const tablespaceMatch = sql.match(/TABLESPACE\s+(\w+)/i);
    if (tablespaceMatch) {
        table.tablespace = tablespaceMatch[1];
    }

    // Check for property graph indicators
    if (/\bVERTEX\b/i.test(sql)) {
        table.isVertex = true;
    }
    if (/\bEDGE\b/i.test(sql)) {
        table.isEdge = true;
    }

    // Extract columns and constraints
    const columnsStart = sql.indexOf('(');
    if (columnsStart > 0) {
        const columnsResult = extractColumnDefinitions(sql.slice(columnsStart), context);
        table.columns = columnsResult.columns;
        table.checkConstraints = columnsResult.checkConstraints;
        table.uniqueConstraints = columnsResult.uniqueConstraints;
        table.constraints = (columnsResult as any).tableConstraints;
        if (columnsResult.primaryKey) {
            table.primaryKey = columnsResult.primaryKey;
        }
        table.foreignKeys.push(...columnsResult.foreignKeys);
    }

    // Check for PARTITION OF
    const partOfMatch = sql.match(/PARTITION\s+OF\s+(\w+(?:\.\w+)?)\s*(\([^)]+\))?/i);
    if (partOfMatch) {
        const parentSchema = partOfMatch[1].split('.')[0];
        const parentName = partOfMatch[1].split('.').pop() || partOfMatch[1];
        const bounds = partOfMatch[2];

        table.partitionOf = context?.qualifyName(parentName, parentSchema) || parentName;
        
        if (bounds) {
            table.partitionBounds = parsePartitionBounds(bounds);
        }
    }

    // Check for INHERITS
    const inheritsMatch = sql.match(/INHERITS\s*\(\s*([\w\s,]+)\s*\)/i);
    if (inheritsMatch) {
        table.inheritsFrom = inheritsMatch[1].split(',').map(s => s.trim()).join(', ');
    }

    // Check for OF clause (typed tables)
    const ofTypeMatch = sql.match(/OF\s+(\w+(?:\.\w+)?)/i);
    if (ofTypeMatch) {
        // OF clause indicates a typed table
    }

    // Register in context
    if (context) {
        context.tables.set(fullTableName, table);
        context.defineSymbol(tableName, 'table', table, schemaName, 'HEURISTIC');
    }

    table.verificationLevel = 'HEURISTIC';
    return { success: true, table, confidence: 0.85 };
}

function extractColumnDefinitions(sql: string, context?: ParseContext): {
    columns: Column[];
    checkConstraints: NamedConstraint[];
    uniqueConstraints: NamedConstraint[];
    primaryKey?: TableLevelPrimaryKey;
    foreignKeys: TableLevelForeignKey[];
    tableConstraints: any[];
} {
    const result = {
        columns: [] as Column[],
        checkConstraints: [] as NamedConstraint[],
        uniqueConstraints: [] as NamedConstraint[],
        foreignKeys: [] as TableLevelForeignKey[],
        tableConstraints: [] as any[],
        primaryKey: undefined as TableLevelPrimaryKey | undefined,
    };

    // Find the closing parenthesis
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];

        if (!inString && (char === "'" || char === '"')) {
            inString = true;
            stringChar = char;
        } else if (inString && char === stringChar) {
            inString = false;
        } else if (!inString) {
            if (char === '(') depth++;
            else if (char === ')') {
                depth--;
                if (depth === 0) {
                    const content = sql.slice(1, i);
                    result.columns = parseColumnDefinitions(content, context);
                    
                    const parsedConstraints = parseConstraintDefinitions(content, context);
                    result.checkConstraints = parsedConstraints.constraints;
                    result.uniqueConstraints = parsedConstraints.uniqueConstraints;
                    result.foreignKeys = parsedConstraints.foreignKeys;
                    result.primaryKey = parsedConstraints.primaryKey;
                    result.tableConstraints = parsedConstraints.tableConstraints;
                    break;
                }
            }
        }
    }

    return result;
}

function parseColumnDefinitions(content: string, context?: ParseContext): Column[] {
    const columns: Column[] = [];
    const constraints: { name?: string; type: string; expression?: string }[] = [];

    // Split by comma, but handle nested parentheses
    const parts = splitByComma(content);

    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Check if this is a column definition or a constraint
        if (isColumnDefinition(trimmed)) {
            const column = parseColumnDefinition(trimmed);
            if (column) {
                columns.push(column);
            }
        } else {
            // This is a constraint
            if (/PRIMARY\s+KEY/i.test(trimmed)) {
                constraints.push({ type: 'PRIMARY KEY', expression: trimmed });
            } else if (/FOREIGN\s+KEY/i.test(trimmed)) {
                constraints.push({ type: 'FOREIGN KEY', expression: trimmed });
            } else if (/CHECK/i.test(trimmed)) {
                constraints.push({ type: 'CHECK', expression: trimmed });
            } else if (/UNIQUE/i.test(trimmed)) {
                constraints.push({ type: 'UNIQUE', expression: trimmed });
            }
        }
    }

    return columns;
}

function splitByComma(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (const char of str) {
        if (!inString && (char === "'" || char === '"')) {
            inString = true;
            stringChar = char;
        } else if (inString && char === stringChar) {
            inString = false;
        }

        if (!inString) {
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (char === ',' && depth === 0) {
                result.push(current.trim());
                current = '';
                continue;
            }
        }

        current += char;
    }

    if (current.trim()) {
        result.push(current.trim());
    }

    return result;
}

function isColumnDefinition(str: string): boolean {
    // Check if this looks like a column definition
    const keywords = ['PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE', 'CONSTRAINT', 'EXCLUDE', 'INDEX'];
    for (const kw of keywords) {
        if (new RegExp(`\\b${kw}\\b`, 'i').test(str)) {
            return false;
        }
    }
    return true;
}

function parseColumnDefinition(str: string): Column | undefined {
    // Parse column name and type
    const match = str.match(/^(\w+)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*\([^)]+\))?)/i);
    if (!match) return undefined;

    const name = match[1];
    const type = match[2];

    const column: Column = {
        name,
        type,
        typeCategory: 'other',
        nullable: !/NOT\s+NULL/i.test(str),
        isPrimaryKey: /PRIMARY\s+KEY/i.test(str),
        isForeignKey: /FOREIGN\s+KEY/i.test(str),
        isUnique: /UNIQUE/i.test(str),
        isGenerated: /GENERATED/i.test(str),
        defaultValue: undefined,
        checkConstraint: undefined,
        references: undefined,
    };

    // Extract default value (but not if it's a GENERATED column default)
    if (!column.isGenerated) {
        const defaultMatch = str.match(/DEFAULT\s+([^,)\n]+)/i);
        if (defaultMatch) {
            column.defaultValue = defaultMatch[1].trim();
        }
    }

    // Extract generated column info (STORED/VIRTUAL)
    const genMatch = str.match(/GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)\s+(STORED|VIRTUAL)/i);
    if (genMatch) {
        column.isGenerated = true;
        column.generatedExpression = genMatch[1];
        column.generatedType = genMatch[2].toUpperCase() as 'STORED' | 'VIRTUAL';
    }

    // Extract identity column info
    const identityAlwaysMatch = str.match(/GENERATED\s+ALWAYS\s+AS\s+IDENTITY(?:\s*\(([^)]+)\))?/i);
    const identityByDefaultMatch = str.match(/GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY(?:\s*\(([^)]+)\))?/i);
    
    if (identityAlwaysMatch || identityByDefaultMatch) {
        const isAlways = !!identityAlwaysMatch;
        const sequenceOpts = (identityAlwaysMatch || identityByDefaultMatch)?.[1] || '';
        column.isGenerated = true;
        column.generatedType = isAlways ? 'ALWAYS_IDENTITY' : 'BY_DEFAULT_IDENTITY';
        column.defaultValue = `GENERATED ${isAlways ? 'ALWAYS' : 'BY DEFAULT'} AS IDENTITY`;
        
        if (sequenceOpts) {
            const startMatch = sequenceOpts.match(/START\s+(?:WITH\s+)?(\d+)/i);
            const incMatch = sequenceOpts.match(/INCREMENT\s+(?:BY\s+)?(\d+)/i);
            const minMatch = sequenceOpts.match(/MINVALUE\s+(\d+)/i);
            const maxMatch = sequenceOpts.match(/MAXVALUE\s+(\d+)/i);
            const cacheMatch = sequenceOpts.match(/CACHE\s+(\d+)/i);
            const cycleMatch = /\bCYCLE\b/i.test(sequenceOpts);
            
            column.identityOptions = {
                always: isAlways,
                startWith: startMatch ? parseInt(startMatch[1]) : undefined,
                incrementBy: incMatch ? parseInt(incMatch[1]) : undefined,
                minValue: minMatch ? parseInt(minMatch[1]) : undefined,
                maxValue: maxMatch ? parseInt(maxMatch[1]) : undefined,
                cache: cacheMatch ? parseInt(cacheMatch[1]) : undefined,
                cycle: cycleMatch,
            };
        }
    }

    // Extract check constraint
    const checkMatch = str.match(/CHECK\s*\(\s*([^)]+)\s*\)/i);
    if (checkMatch) {
        column.checkConstraint = checkMatch[1];
    }

    // Extract references
    const refMatch = str.match(/REFERENCES\s+(\w+(?:\.\w+)?)\s*\(\s*([\w\s,]+)\s*\)/i);
    if (refMatch) {
        column.references = {
            table: refMatch[1],
            column: refMatch[2].split(',').map(s => s.trim()),
        };
    }

    return column;
}

function parsePartitionBounds(bounds: string): { from?: string[]; to?: string[]; in?: string[] } | undefined {
    if (!bounds.trim()) return undefined;

    const result: { from?: string[]; to?: string[]; in?: string[] } = {};

    // FROM ... TO
    const fromToMatch = bounds.match(/FROM\s*\(\s*([^)]+)\s*\)\s*TO\s*\(\s*([^)]+)\s*\)/i);
    if (fromToMatch) {
        result.from = fromToMatch[1].split(',').map(s => s.trim());
        result.to = fromToMatch[2].split(',').map(s => s.trim());
        return result;
    }

    // IN
    const inMatch = bounds.match(/IN\s*\(\s*([^)]+)\s*\)/i);
    if (inMatch) {
        result.in = inMatch[1].split(',').map(s => s.trim());
        return result;
    }

    return undefined;
}