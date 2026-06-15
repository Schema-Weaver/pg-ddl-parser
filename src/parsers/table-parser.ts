import { Table, Column, NamedConstraint, TableLevelPrimaryKey, TableLevelForeignKey, TemporalConstraint, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS, categorizeDataType } from './patterns';
import { parseConstraintDefinitions } from './constraints-parser';

export function parseCreateTableRegex(sql: string, context: ParseContext): RegexParseResult {
    // Check for partition child first
    const partOfMatch = sql.match(PATTERNS.partitionOf);
    if (partOfMatch) {
        return parsePartitionOfTable(sql, partOfMatch, context);
    }

    // CREATE TABLE AS SELECT (CTAS)
    const ctasMatch = sql.match(PATTERNS.createTableAs);
    if (ctasMatch) {
        const schemaName = ctasMatch[1];
        const tableName = ctasMatch[2];
        const fullName = context.qualifyName(tableName, schemaName);
        const asIdx = sql.search(/\bAS\b/i);
        let asQuery = asIdx >= 0 ? sql.slice(asIdx + 2).trim().replace(/;$/, '') : '';
        asQuery = asQuery.replace(/\s+WITH\s+(?:NO\s+)?DATA\s*$/i, '').trim();

        const table: Table = {
            name: tableName,
            schema: schemaName || context.currentSchema,
            columns: [],
            isPartitioned: false,
            isTemporary: /TEMP(?:ORARY)?/i.test(sql),
            isUnlogged: /UNLOGGED/i.test(sql),
            checkConstraints: [],
            uniqueConstraints: [],
            foreignKeys: [],
            confidence: 0.85,
            createAs: true,
            asQuery,
        };

        context.tables.set(fullName, table);
        context.defineSymbol(tableName, 'table', table, schemaName, 'HEURISTIC');
        table.verificationLevel = 'HEURISTIC';
        return { success: true, table, confidence: 0.85 };
    }

    // Regular table
    const tableMatch = sql.match(PATTERNS.createTable);
    if (!tableMatch) {
        return { success: false, confidence: 0, error: 'Could not match CREATE TABLE' };
    }

    const schemaName = tableMatch[1];
    const tableName = tableMatch[2];
    const fullName = context.qualifyName(tableName, schemaName);

    const table: Table = {
        name: tableName,
        schema: schemaName || context.currentSchema,
        columns: [],
        isPartitioned: false,
        isTemporary: /TEMP(?:ORARY)?/i.test(sql),
        isUnlogged: /UNLOGGED/i.test(sql),
        checkConstraints: [],
        uniqueConstraints: [],
        foreignKeys: [],
        confidence: 0.8,
    };

    // Check for PARTITION BY
    const partitionMatch = sql.match(PATTERNS.partitionBy);
    if (partitionMatch) {
        table.isPartitioned = true;
        table.partitionType = partitionMatch[1].toLowerCase() as any;
        table.partitionKey = partitionMatch[2].split(',').map(s => s.trim().replace(/"/g, ''));
    }

    // PG19: Check for property graph indicators (vertex/edge tables)
    if (/\bVERTEX\b/i.test(sql)) {
        table.isVertex = true;
    }
    if (/\bEDGE\b/i.test(sql)) {
        table.isEdge = true;
    }

    // Extract column definitions
    const columnsStart = sql.indexOf('(');
    if (columnsStart > 0) {
        const columns = extractColumnDefinitions(sql.slice(columnsStart), context);
        table.columns = columns;

        const constraintsResult = parseConstraintDefinitions(sql.slice(columnsStart), context);
        table.foreignKeys = constraintsResult.foreignKeys;
        table.checkConstraints = constraintsResult.constraints;
        table.uniqueConstraints = constraintsResult.uniqueConstraints;
        table.constraints = constraintsResult.tableConstraints;
        if (constraintsResult.primaryKey) {
            table.primaryKey = constraintsResult.primaryKey;
        }
    }

    // Parse PERIOD FOR or PERIOD SYSTEM_TIME clause (outside parentheses)
    const periodMatch = sql.match(/PERIOD\s+SYSTEM_TIME\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i);
    if (periodMatch) {
        table.period = {
            name: 'SYSTEM_TIME',
            startColumn: periodMatch[1],
            endColumn: periodMatch[2]
        };
    } else {
        const periodForMatch = sql.match(/PERIOD\s+(?:FOR\s+)?(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i);
        if (periodForMatch) {
            table.period = {
                name: periodForMatch[1],
                startColumn: periodForMatch[2],
                endColumn: periodForMatch[3]
            };
        }
    }

    // Check for WITH SYSTEM VERSIONING
    if (/\bWITH\s+SYSTEM\s+VERSIONING\b/i.test(sql)) {
        table.withSystemVersioning = true;
    }

    // Check for INHERITS
    const inheritsMatch = sql.match(/INHERITS\s*\(\s*([\w\s,\.]+)\s*\)/i);
    if (inheritsMatch) {
        table.inheritsFrom = inheritsMatch[1].split(',').map(s => s.trim().replace(/"/g, '')).join(', ');
    }

    // ON COMMIT clause for temporary tables
    const onCommitMatch = sql.match(/ON\s+COMMIT\s+(PRESERVE\s+ROWS|DELETE\s+ROWS|DROP)/i);
    if (onCommitMatch) {
        const action = onCommitMatch[1].toUpperCase().replace(/\s+/g, '_');
        table.onCommit = action as Table['onCommit'];
    }

    // Register in context
    context.tables.set(fullName, table);
    context.defineSymbol(tableName, 'table', table, schemaName, 'HEURISTIC');

    table.verificationLevel = 'HEURISTIC';
    return { success: true, table, confidence: 0.8 };
}

function parsePartitionOfTable(
    sql: string,
    match: RegExpMatchArray,
    context: ParseContext
): RegexParseResult {
    const childSchema = match[1];
    const childName = match[2];
    const parentSchema = match[3];
    const parentName = match[4];

    const boundsMatch = sql.match(/FOR\s+VALUES\s+([\s\S]+?)(?:$|;)/i);
    const bounds = boundsMatch ? boundsMatch[1].trim() : '';

    const childFullName = context.qualifyName(childName, childSchema);
    const parentFullName = context.qualifyName(parentName, parentSchema);

    const table: Table = {
        name: childName,
        schema: childSchema || context.currentSchema,
        columns: [], // Inherit from parent
        isPartitioned: false,
        partitionOf: parentName,
        isTemporary: false,
        isUnlogged: false,
        checkConstraints: [],
        uniqueConstraints: [],
        foreignKeys: [],
        confidence: 0.9,
        verificationLevel: 'HEURISTIC',
    };

    // Check if the partition itself is partitioned (multi-level partitioning)
    const partitionMatch = sql.match(PATTERNS.partitionBy);
    if (partitionMatch) {
        table.isPartitioned = true;
        table.partitionType = partitionMatch[1].toLowerCase() as any;
        table.partitionKey = partitionMatch[2].split(',').map(s => s.trim().replace(/"/g, ''));
    }

    // Parse bounds
    if (bounds) {
        if (bounds.toUpperCase().startsWith('FROM')) {
            const fromToMatch = bounds.match(/FROM\s*\(([^)]+)\)\s*TO\s*\(([^)]+)\)/i);
            if (fromToMatch) {
                table.partitionBounds = {
                    from: fromToMatch[1].trim(),
                    to: fromToMatch[2].trim(),
                };
            }
        } else if (bounds.toUpperCase().startsWith('IN')) {
            const inMatch = bounds.match(/IN\s*\(([^)]+)\)/i);
            if (inMatch) {
                table.partitionBounds = {
                    in: inMatch[1].split(',').map(s => s.trim()),
                };
            }
        }
    }

    // Track dependency on parent
    context.addDependency(childFullName, parentFullName);
    context.tables.set(childFullName, table);
    context.defineSymbol(childName, 'table', table, childSchema, 'HEURISTIC');

    return { success: true, table, confidence: 0.9 };
}

function extractColumnDefinitions(sql: string, context: ParseContext): Column[] {
    const columns: Column[] = [];

    // Find the balanced parentheses content
    let depth = 0;
    let start = -1;
    let end = -1;

    for (let i = 0; i < sql.length; i++) {
        if (sql[i] === '(') {
            if (depth === 0) start = i + 1;
            depth++;
        } else if (sql[i] === ')') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }

    if (start < 0 || end < 0) return columns;

    const content = sql.slice(start, end);

    // Split by commas (respecting parentheses)
    const parts: string[] = [];
    let current = '';
    depth = 0;

    for (const char of content) {
        if (char === '(') depth++;
        else if (char === ')') depth--;

        if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());

    // Parse each part
    for (const part of parts) {
        // Skip table-level constraints and PERIOD clauses
        if (/^\s*(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT|PERIOD)/i.test(part)) {
            continue;
        }

        const column = parseColumnDefinition(part, context);
        if (column) {
            columns.push(column);
        }
    }

    return columns;
}

function parseColumnDefinition(def: string, context: ParseContext): Column | null {
    // Match: column_name TYPE [constraints...]
    // Handle COLLATE separately
    const collateMatch = def.match(/\bCOLLATE\s+"?(\w+)"?/i);
    const collation = collateMatch ? collateMatch[1] : undefined;
    
    // Remove COLLATE from definition before parsing type
    const defWithoutCollate = def.replace(/\bCOLLATE\s+"?\w+"?/i, '').trim();
    
    const match = defWithoutCollate.match(/^\s*"?(\w+)"?\s+([A-Za-z][A-Za-z0-9_(),.[\]\s]+?)(?:\s+((?:PRIMARY|NOT|NULL|UNIQUE|CHECK|DEFAULT|REFERENCES|GENERATED|CONSTRAINT).*))?$/i);

    if (!match) return null;

    const name = match[1];
    let type = match[2].trim();
    const constraints = match[3] || '';

    // Handle array types
    if (type.match(/\[\s*\]$/)) {
        type = type.replace(/\[\s*\]$/, '[]');
    }

    const column: Column = {
        name,
        type,
        typeCategory: categorizeDataType(type),
        nullable: true,
        isPrimaryKey: false,
        isForeignKey: false,
        isUnique: false,
        isGenerated: false,
        collation,
    };

    // Parse constraints
    if (PATTERNS.primaryKey.test(constraints)) {
        column.isPrimaryKey = true;
        column.nullable = false;
    }

    if (PATTERNS.notNull.test(constraints)) {
        column.nullable = false;
    }

    if (PATTERNS.unique.test(constraints)) {
        column.isUnique = true;
    }

    // Generated column (PG 18: STORED or VIRTUAL)
    // Need to handle nested parentheses like UPPER(status)
    const genMatch = constraints.match(/GENERATED\s+ALWAYS\s+AS\s*\(/i);
    if (genMatch && !constraints.match(/GENERATED\s+ALWAYS\s+AS\s+IDENTITY/i)) {
        // Find the matching closing paren for the expression
        const startIdx = genMatch.index! + genMatch[0].length - 1;
        let parenCount = 0;
        let endIdx = startIdx;
        for (let i = startIdx; i < constraints.length; i++) {
            if (constraints[i] === '(') parenCount++;
            else if (constraints[i] === ')') {
                parenCount--;
                if (parenCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }
        const expression = constraints.slice(startIdx + 1, endIdx);
        const remainder = constraints.slice(endIdx + 1).trim();
        const typeMatch = remainder.match(/^(STORED|VIRTUAL)/i);
        if (typeMatch) {
            column.isGenerated = true;
            column.generatedExpression = expression.trim();
            column.generatedType = typeMatch[1].toUpperCase() as 'STORED' | 'VIRTUAL';
        }
    }

    // Identity columns (PG12+)
    const identityAlwaysMatch = constraints.match(PATTERNS.identityAlways);
    const identityByDefaultMatch = constraints.match(PATTERNS.identityByDefault);
    
    if (identityAlwaysMatch || identityByDefaultMatch) {
        const isAlways = !!identityAlwaysMatch;
        const sequenceOpts = (identityAlwaysMatch || identityByDefaultMatch)?.[1] || '';
        column.isGenerated = true;
        column.generatedType = isAlways ? 'ALWAYS_IDENTITY' : 'BY_DEFAULT_IDENTITY';
        column.defaultValue = `GENERATED ${isAlways ? 'ALWAYS' : 'BY DEFAULT'} AS IDENTITY`;
        
        // Parse sequence options if present
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

    // Default value
    const defaultMatch = constraints.match(PATTERNS.default);
    if (defaultMatch) {
        column.defaultValue = defaultMatch[1].trim();
    }

    // Foreign key reference
    const refMatch = constraints.match(PATTERNS.references);
    if (refMatch) {
        column.isForeignKey = true;
        const refSchema = refMatch[1];
        const refTable = refMatch[2];
        const refColumn = refMatch[3];
        const refTableFull = refSchema ? `${refSchema}.${refTable}` : refTable;

        column.references = {
            schema: refSchema,
            table: refTableFull,
            column: refColumn,
            onDelete: refMatch[4]?.replace(/\s+/g, ' '),
            onUpdate: refMatch[5]?.replace(/\s+/g, ' '),
        };

        // Track dependency
        context.addForwardReference('current', refTableFull);
    }

    // PG18: Named NOT NULL constraint inline (e.g., "name CONSTRAINT notnull NOT NULL")
    const namedNotNullMatch = constraints.match(/\s+CONSTRAINT\s+(\w+)\s+NOT\s+NULL\s*/i);
    if (namedNotNullMatch) {
        const constraintName = namedNotNullMatch[1];
        column.notNullConstraint = {
            name: constraintName,
        };
    }

    // Check constraint
    const checkMatch = constraints.match(PATTERNS.check);
    if (checkMatch) {
        column.checkConstraint = checkMatch[1];
    }

    return column;
}

export function parseAlterTableRegex(sql: string, context?: ParseContext): RegexParseResult {
    // 1. Check for ALTER TABLE ... ADD CONSTRAINT
    const addConstraintMatch = sql.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ADD\s+(?:CONSTRAINT\s+"?(\w+)"?\s+)?(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)\s*([\s\S]+)$/i);
    if (addConstraintMatch) {
        const schemaName = addConstraintMatch[1];
        const tableName = addConstraintMatch[2];
        const constraintName = addConstraintMatch[3];
        const constraintType = addConstraintMatch[4].toUpperCase();
        const constraintBody = addConstraintMatch[5].trim().replace(/;$/, '');

        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                const dummySql = `${constraintType} ${constraintBody}`;
                const res = parseConstraintDefinitions(dummySql, context);
                if (res.primaryKey) {
                    table.primaryKey = res.primaryKey;
                }
                if (res.foreignKeys.length > 0) {
                    table.foreignKeys.push(...res.foreignKeys);
                }
                if (res.constraints.length > 0) {
                    table.checkConstraints.push(...res.constraints);
                }
                if (res.uniqueConstraints.length > 0) {
                    table.uniqueConstraints.push(...res.uniqueConstraints);
                }
                if (res.tableConstraints.length > 0) {
                    table.constraints = table.constraints || [];
                    if (constraintName) {
                        for (const tc of res.tableConstraints) {
                            tc.name = constraintName;
                        }
                    }
                    table.constraints.push(...res.tableConstraints);
                }
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // ADD COLUMN
    const addColumnMatch = sql.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ADD\s+(?:COLUMN\s+)?(?:IF\s+NOT\s+EXISTS\s+)?([\s\S]+)/i);
    if (addColumnMatch) {
        const schemaName = addColumnMatch[1];
        const tableName = addColumnMatch[2];
        const colDef = addColumnMatch[3].trim().replace(/;$/, '');
        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                const column = parseColumnDefinition(colDef, context);
                if (column) {
                    if (!table.columns.some(c => c.name === column.name)) {
                        table.columns.push(column);
                    }
                }
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // DROP COLUMN
    const dropColumnMatch = sql.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+DROP\s+(?:COLUMN\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?)/i);
    if (dropColumnMatch) {
        const schemaName = dropColumnMatch[1];
        const tableName = dropColumnMatch[2];
        const columnName = dropColumnMatch[3];
        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                table.columns = table.columns.filter(c => c.name !== columnName);
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // ALTER COLUMN TYPE
    const alterColumnTypeMatch = sql.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ALTER\s+(?:COLUMN\s+)?(?:"?(\w+)"?)\s+TYPE\s+([A-Za-z][A-Za-z0-9_(),.[\]\s]+?)(?:\s+USING\s+([\s\S]+))?$/i);
    if (alterColumnTypeMatch) {
        const schemaName = alterColumnTypeMatch[1];
        const tableName = alterColumnTypeMatch[2];
        const columnName = alterColumnTypeMatch[3];
        let type = alterColumnTypeMatch[4].trim();
        type = type.replace(/;$/, '').trim();
        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                const col = table.columns.find(c => c.name === columnName);
                if (col) {
                    col.type = type;
                    col.typeCategory = categorizeDataType(type);
                }
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // ALTER COLUMN SET DEFAULT
    const setDefMatch = sql.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ALTER\s+(?:COLUMN\s+)?(?:"?(\w+)"?)\s+SET\s+DEFAULT\s+([\s\S]+)/i);
    if (setDefMatch) {
        const schemaName = setDefMatch[1];
        const tableName = setDefMatch[2];
        const columnName = setDefMatch[3];
        const defVal = setDefMatch[4].trim().replace(/;$/, '');
        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                const col = table.columns.find(c => c.name === columnName);
                if (col) {
                    col.defaultValue = defVal;
                }
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // ALTER COLUMN DROP DEFAULT
    const dropDefMatch = sql.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ALTER\s+(?:COLUMN\s+)?(?:"?(\w+)"?)\s+DROP\s+DEFAULT/i);
    if (dropDefMatch) {
        const schemaName = dropDefMatch[1];
        const tableName = dropDefMatch[2];
        const columnName = dropDefMatch[3];
        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                const col = table.columns.find(c => c.name === columnName);
                if (col) {
                    col.defaultValue = undefined;
                }
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // ALTER COLUMN SET/DROP NOT NULL
    const nullMatch = sql.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ALTER\s+(?:COLUMN\s+)?(?:"?(\w+)"?)\s+(SET|DROP)\s+NOT\s+NULL/i);
    if (nullMatch) {
        const schemaName = nullMatch[1];
        const tableName = nullMatch[2];
        const columnName = nullMatch[3];
        const isSet = nullMatch[4].toUpperCase() === 'SET';
        if (context) {
            const fullName = context.qualifyName(tableName, schemaName);
            const table = context.tables.get(fullName);
            if (table) {
                const col = table.columns.find(c => c.name === columnName);
                if (col) {
                    col.nullable = !isSet;
                }
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // DISABLE ROW LEVEL SECURITY
    const disableRLSMatch = sql.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    if (disableRLSMatch) {
        const schemaName = disableRLSMatch[1];
        const tableName = disableRLSMatch[2];
        const fullName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);
        if (context) {
            const table = context.tables.get(fullName);
            if (table) {
                table.rlsEnabled = false;
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // FORCE ROW LEVEL SECURITY
    const forceRLSMatch = sql.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
    if (forceRLSMatch) {
        const schemaName = forceRLSMatch[1];
        const tableName = forceRLSMatch[2];
        const fullName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);
        if (context) {
            const table = context.tables.get(fullName);
            if (table) {
                table.rlsEnabled = true;
            }
        }
        return { success: true, confidence: 0.9 };
    }

    // Check for enable RLS first (existing support)
    const match = sql.match(PATTERNS.enableRls);
    if (match) {
        const schemaName = match[1];
        const tableName = match[2];
        const fullName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);
        if (context) {
            const table = context.tables.get(fullName);
            if (table) {
                table.rlsEnabled = true;
            }
        }

        return { success: true, confidence: 0.9 };
    }

    // PG18: WITHOUT OVERLAPS constraint
    const withoutOverlapsMatch = sql.match(PATTERNS.withoutOverlapsConstraint);
    if (withoutOverlapsMatch) {
        const constraintName = withoutOverlapsMatch[1];
        const columnsStr = withoutOverlapsMatch[2];
        const columns = columnsStr.split(',').map(c => c.trim().replace(/"/g, ''));

        // This is parsed but not yet stored in the table model
        // The constraint would be added to table.uniqueConstraints with withoutOverlaps: true
        return { success: true, confidence: 0.85 };
    }

    // PG18: NOT ENFORCED constraint
    const notEnforcedCheckMatch = sql.match(PATTERNS.notEnforcedConstraint);
    if (notEnforcedCheckMatch) {
        const constraintName = notEnforcedCheckMatch[1];
        // NOT ENFORCED check constraint
        return { success: true, confidence: 0.85 };
    }

    const notEnforcedFKMatch = sql.match(PATTERNS.notEnforcedFK);
    if (notEnforcedFKMatch) {
        // NOT ENFORCED foreign key
        return { success: true, confidence: 0.85 };
    }

    // PG18: PERIOD temporal primary key
    const periodPKMatch = sql.match(PATTERNS.periodPrimaryKey);
    if (periodPKMatch) {
        const pkColumns = periodPKMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
        const periodColumn = periodPKMatch[2].trim().replace(/"/g, '');
        return { success: true, confidence: 0.9 };
    }

    // PG18: ALTER TABLE ADD CONSTRAINT with NOT VALID
    const alterTableAddConstraintMatch = sql.match(PATTERNS.alterTableAddConstraint);
    if (alterTableAddConstraintMatch) {
        const schemaName = alterTableAddConstraintMatch[1];
        const tableName = alterTableAddConstraintMatch[2];
        const constraintName = alterTableAddConstraintMatch[3];
        const constraintType = alterTableAddConstraintMatch[4];

        return { success: true, confidence: 0.85 };
    }

    // PG18: ALTER TABLE VALIDATE CONSTRAINT
    const alterTableValidateMatch = sql.match(PATTERNS.alterTableValidateConstraint);
    if (alterTableValidateMatch) {
        console.log('[PG18] ALTER TABLE VALIDATE CONSTRAINT'); // TODO: extract constraint name

        return { success: true, confidence: 0.85 };
    }

    // PG18: ALTER TABLE NO INHERIT
    const alterTableNoInheritMatch = sql.match(PATTERNS.alterTableNoInherit);
    if (alterTableNoInheritMatch) {
        console.log('[PG18] ALTER TABLE NO INHERIT'); // TODO: extract constraint name

        return { success: true, confidence: 0.85 };
    }

    // PG18: ALTER TABLE INHERIT
    const alterTableInheritMatch = sql.match(PATTERNS.alterTableInherit);
    if (alterTableInheritMatch) {
        console.log('[PG18] ALTER TABLE INHERIT'); // TODO: extract constraint name

        return { success: true, confidence: 0.85 };
    }

    // PG18: ALTER TABLE ... SET EXPRESSION (generated column)
    const alterTableSetExpressionMatch = sql.match(PATTERNS.alterTableSetExpression);
    if (alterTableSetExpressionMatch) {
        const schemaName = alterTableSetExpressionMatch[1];
        const tableName = alterTableSetExpressionMatch[2];
        const columnName = alterTableSetExpressionMatch[3];
        const fullName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);
        return { success: true, confidence: 0.85 };
    }

    // PG19: CREATE/DROP PROPERTY GRAPH
    const createGraphMatch = sql.match(PATTERNS.createPropertyGraph);
    if (createGraphMatch) {
        const graphName = createGraphMatch[1];
        return { success: true, confidence: 0.85 };
    }

    const dropGraphMatch = sql.match(PATTERNS.dropPropertyGraph);
    if (dropGraphMatch) {
        const graphName = dropGraphMatch[1];
        return { success: true, confidence: 0.85 };
    }

    // PG19: GRAPH_TABLE query
    const graphTableMatch = sql.match(PATTERNS.graphTableQuery);
    if (graphTableMatch) {
        // GRAPH_TABLE queries are for AI/editor context, not schema model
        return { success: true, confidence: 0.9 };
    }

    // PG18: CREATE FOREIGN TABLE LIKE
    const foreignTableLikeMatch = sql.match(PATTERNS.createForeignTableLike);
    if (foreignTableLikeMatch) {
        const foreignSchema = foreignTableLikeMatch[1];
        const foreignTableName = foreignTableLikeMatch[2];
        const sourceSchema = foreignTableLikeMatch[3];
        const sourceTableName = foreignTableLikeMatch[4];
        return { success: true, confidence: 0.85 };
    }

    // PG19: REPACK
    const repackMatch = sql.match(PATTERNS.repackTable);
    if (repackMatch) {
        console.log('[PG19] REPACK TABLE'); // TODO: extract table name

        return { success: true, confidence: 0.85 };
    }

    // WAIT FOR LSN
    const waitForLsnMatch = sql.match(PATTERNS.waitForLsn);
    if (waitForLsnMatch) {
        console.log('[PG18] WAIT FOR LSN'); // TODO: extract LSN value

        return { success: true, confidence: 0.85 };
    }

    return { success: false, confidence: 0, error: 'Could not match supported ALTER TABLE commands' };
}