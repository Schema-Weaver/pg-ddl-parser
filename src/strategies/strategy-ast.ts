/**
 * Strategy A: Regex Parser (Replacement for pgsql-ast-parser)
 *
 * Comprehensive regex-based parser that replaces pgsql-ast-parser dependency.
 * Handles all types of PostgreSQL DDL statements that pgsql-ast-parser fails to parse.
 */

import {
    Token,
    Table,
    Column,
    Index,
    IndexColumn,
    View,
    ViewColumn,
    Trigger,
    PostgresFunction,
    Policy,
    EnumType,
    Sequence,
    Extension,
    DataTypeCategory,
    StatementInfo,
    ForeignKeyReference,
    NamedConstraint,
    RegexParseResult,
    CompositeType,
    Domain,
    Role,
    PropertyGraph
} from '../types';
import { ParseContext } from '../context/parse-context';
import { parseConstraintDefinitions } from '../parsers/constraints-parser';
import { parseCreatePropertyGraphRegex } from '../parsers/property-graph-parser';

// =============================================================================
// Data Type Categorization
// =============================================================================

function categorizeDataType(typeName: string): DataTypeCategory {
    const t = typeName.toLowerCase();

    if (/^(int|integer|bigint|smallint|serial|bigserial|smallserial|numeric|decimal|real|float|double|money)/.test(t)) {
        return 'numeric';
    }
    if (/^(text|varchar|char|character|citext|name)/.test(t)) {
        return 'text';
    }
    if (/^(bool|boolean)/.test(t)) {
        return 'boolean';
    }
    if (/^(date|time|timestamp|timestamptz|timetz|interval)/.test(t)) {
        return 'datetime';
    }
    if (t === 'uuid') {
        return 'uuid';
    }
    if (/^(json|jsonb|json_scalar|json_table)/.test(t)) {
        return 'json';
    }
    if (t.endsWith('[]')) {
        return 'array';
    }
    if (t === 'bytea') {
        return 'binary';
    }
    if (t === 'hstore') {
        return 'hstore';
    }
    if (/range$/.test(t)) {
        return 'range';
    }
    if (/multirange$/.test(t)) {
        return 'range';
    }
    if (/^(inet|cidr|macaddr|macaddr8)/.test(t)) {
        return 'network';
    }
    if (/^(geometry|geography|point|line|lseg|box|path|polygon|circle)/.test(t)) {
        return 'geometry';
    }
    if (/^(tsvector|tsquery)/.test(t)) {
        return 'text';
    }
    if (/^(xml)/.test(t)) {
        return 'text';
    }

    return 'other';
}

// =============================================================================
// Type Extraction Helpers
// =============================================================================

function extractTypeName(dataType: any): string {
    if (!dataType) return 'unknown';
    if (typeof dataType === 'string') return dataType;

    if (dataType.kind === 'array') {
        return `${extractTypeName(dataType.arrayOf)}[]`;
    }

    if (dataType.name) {
        let typeName = dataType.name;
        if (dataType.config?.length) {
            typeName += `(${dataType.config.join(', ')})`;
        }
        return typeName;
    }

    return 'unknown';
}

function extractDefaultValue(defaultExpr: any): string | undefined {
    if (!defaultExpr) return undefined;

    if (defaultExpr.type === 'call') {
        const funcName = defaultExpr.function?.name || 'function';
        return `${funcName}()`;
    }

    if (['string', 'integer', 'numeric'].includes(defaultExpr.type)) {
        return String(defaultExpr.value);
    }

    if (defaultExpr.type === 'boolean') {
        return defaultExpr.value ? 'true' : 'false';
    }

    if (defaultExpr.type === 'keyword') {
        return defaultExpr.keyword;
    }

    return 'default';
}

// =============================================================================
// SQL Parsing Helper Functions
// =============================================================================

/**
 * Safely extracts text from a match group if present
 */
function safeExtract(matchGroup: string | undefined): string {
    return matchGroup ? matchGroup.trim() : '';
}

/**
 * Helper to extract column definitions from CREATE TABLE statement
 */
function extractColumnDefinitionsFromSql(sql: string, context: ParseContext): Column[] {
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

    // Split by commas (respecting parentheses in DEFAULT values)
    const parts: string[] = [];
    let current = '';
    let parenCount = 0;
    let bracketCount = 0;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (char === '(') parenCount++;
        else if (char === ')') parenCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
        
        if (char === ',' && parenCount === 0 && bracketCount === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    if (current.trim()) {
        parts.push(current.trim());
    }

    // Parse each part as a column definition
    for (const part of parts) {
        // Skip table-level constraints and PERIOD clauses
        if (/^\s*(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY|CONSTRAINT|PERIOD)/i.test(part)) {
            continue;
        }

        const column = parseColumnDefinitionInTable(part, context);
        if (column) {
            columns.push(column);
        }
    }

    return columns;
}

/**
 * Parse a single column definition inside a table creation
 */
function parseColumnDefinitionInTable(def: string, context: ParseContext): Column | null {
    // Handle COLLATE separately
    const collateMatch = def.match(/\bCOLLATE\s+"?(\w+)"?/i);
    const collation = collateMatch ? collateMatch[1] : undefined;
    
    // Remove COLLATE from definition before parsing type
    const defWithoutCollate = def.replace(/\bCOLLATE\s+"?\w+"?/i, '').trim();

    // Match: column_name TYPE [constraints...]
    const match = defWithoutCollate.match(/^\s*"?(\w+)"?\s+([A-Za-z][A-Za-z0-9_(),.[\]\s]+?)(?:\s+((?:PRIMARY|NOT|NULL|UNIQUE|CHECK|DEFAULT|REFERENCES|GENERATED|CONSTRAINT).*))?$/i);

    if (!match) {
        return null;
    }

    const name = match[1];
    let type = match[2].trim();
    const constraints = match[3] || '';

    // Normalize type: remove internal spaces (e.g., "DECIMAL (12, 2)" -> "DECIMAL(12,2)")
    type = type.replace(/\s+/g, '');

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
    if (/(PRIMARY\s+KEY|NOT\s+NULL|UNIQUE|CHECK|DEFAULT|REFERENCES|GENERATED|CONSTRAINT)/i.test(constraints)) {
        if (/(PRIMARY\s+KEY)/i.test(constraints)) {
            column.isPrimaryKey = true;
            column.nullable = false;
        }

        if (/(NOT\s+NULL)/i.test(constraints)) {
            column.nullable = false;
        }

        if (/(UNIQUE)/i.test(constraints)) {
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
        const identityAlwaysMatch = constraints.match(/GENERATED\s+ALWAYS\s+AS\s+IDENTITY(?:\s*\(([^)]+)\))?/i);
        const identityByDefaultMatch = constraints.match(/GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY(?:\s*\(([^)]+)\))?/i);
        
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

        // Default value (but NOT for generated columns)
        if (!column.isGenerated) {
            const defaultMatch = constraints.match(/DEFAULT\s+([^,)]+)/i);
            if (defaultMatch) {
                column.defaultValue = defaultMatch[1].trim();
            }
        }

        // Foreign key reference
        const refMatch = constraints.match(/REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(\s*"?(\w+)"?\s*\)(?:\s+ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?/i);
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
                onDelete: refMatch[4]?.replace(/\s+/g, ' ') || undefined,
                onUpdate: refMatch[5]?.replace(/\s+/g, ' ') || undefined,
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
        const checkMatch = constraints.match(/CHECK\s*\((.+?)\)/i);
        if (checkMatch) {
            column.checkConstraint = checkMatch[1];
        }
    }

    return column;
}

// =============================================================================
// AST Statement Parsing
// =============================================================================

export interface AstParseResult {
    success: boolean;
    tables?: Table[];
    indexes?: Index[];
    views?: View[];
    triggers?: Trigger[];
    functions?: PostgresFunction[];
    policies?: Policy[];
    enums?: EnumType[];
    sequences?: Sequence[];
    extensions?: Extension[];
    compositeTypes?: CompositeType[];
    domains?: Domain[];
    roles?: Role[];
    propertyGraphs?: PropertyGraph[];
    schemas?: string[];
    error?: string;
}

/**
 * Try to parse a single statement using comprehensive regex patterns
 */
export function tryAstParse(
    statement: StatementInfo,
    context: ParseContext
): AstParseResult {
    try {
        // Clean the statement text
        const cleanedSql = statement.text
            .replace(/--.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .trim();

        if (!cleanedSql) {
            return { success: true };
        }

        const result: AstParseResult = { success: true };

        // Call the appropriate parser based on statement type
        switch (statement.type) {
            case 'CREATE_TABLE':
            case 'CREATE_TABLE_PARTITION':
                parseCreateTableDirect(cleanedSql, context, result);
                if (!result.tables || result.tables.length === 0) {
                    result.success = false;
                    result.error = 'Direct table parsing matched no tables';
                }
                break;
            
            case 'CREATE_VIEW':
            case 'CREATE_MATERIALIZED_VIEW':
                parseCreateViewDirect(cleanedSql, context, result);
                if (!result.views || result.views.length === 0) {
                    result.success = false;
                    result.error = 'Direct view parsing matched no views';
                }
                break;
                
            case 'CREATE_INDEX':
                parseCreateIndexDirect(cleanedSql, context, result);
                if (!result.indexes || result.indexes.length === 0) {
                    result.success = false;
                    result.error = 'Direct index parsing matched no indexes';
                }
                break;
                
            case 'CREATE_FUNCTION':
            case 'CREATE_PROCEDURE':
                parseCreateFunctionDirect(cleanedSql, context, result);
                if (!result.functions || result.functions.length === 0) {
                    result.success = false;
                    result.error = 'Direct function parsing matched no functions';
                }
                break;
                
            case 'CREATE_TRIGGER':
                parseCreateTriggerDirect(cleanedSql, context, result);
                if (!result.triggers || result.triggers.length === 0) {
                    result.success = false;
                    result.error = 'Direct trigger parsing matched no triggers';
                }
                break;
                
            case 'CREATE_ENUM':
                parseCreateEnumDirect(cleanedSql, context, result);
                if (!result.enums || result.enums.length === 0) {
                    result.success = false;
                    result.error = 'Direct enum parsing matched no enums';
                }
                break;
                
            case 'CREATE_TYPE':
                parseCreateTypeDirect(cleanedSql, context, result);
                if (!result.compositeTypes || result.compositeTypes.length === 0) {
                    result.success = false;
                    result.error = 'Direct type parsing matched no composite types';
                }
                break;
                
            case 'CREATE_EXTENSION':
                parseCreateExtensionDirect(cleanedSql, context, result);
                if (!result.extensions || result.extensions.length === 0) {
                    result.success = false;
                    result.error = 'Direct extension parsing matched no extensions';
                }
                break;
                
            case 'CREATE_SCHEMA':
                parseCreateSchemaDirect(cleanedSql, context, result);
                if (!result.schemas || result.schemas.length === 0) {
                    result.success = false;
                    result.error = 'Direct schema parsing matched no schemas';
                }
                break;
                
            case 'CREATE_SEQUENCE':
                parseCreateSequenceDirect(cleanedSql, context, result);
                if (!result.sequences || result.sequences.length === 0) {
                    result.success = false;
                    result.error = 'Direct sequence parsing matched no sequences';
                }
                break;
                
            case 'CREATE_DOMAIN':
                parseCreateDomainDirect(cleanedSql, context, result);
                if (!result.domains || result.domains.length === 0) {
                    result.success = false;
                    result.error = 'Direct domain parsing matched no domains';
                }
                break;
                
            case 'CREATE_ROLE':
                parseCreateRoleDirect(cleanedSql, context, result);
                if (!result.roles || result.roles.length === 0) {
                    result.success = false;
                    result.error = 'Direct role parsing matched no roles';
                }
                break;
                
            case 'ALTER_TABLE':
                parseAlterTableDirect(cleanedSql, context, result);
                break;
                
            case 'CREATE_POLICY':
                parseCreatePolicyDirect(cleanedSql, context, result);
                if (!result.policies || result.policies.length === 0) {
                    result.success = false;
                    result.error = 'Direct policy parsing matched no policies';
                }
                break;

            case 'CREATE_PROPERTY_GRAPH':
                parseCreatePropertyGraphDirect(cleanedSql, context, result);
                if (!result.propertyGraphs || result.propertyGraphs.length === 0) {
                    result.success = false;
                    result.error = 'Direct property graph parsing matched no property graphs';
                }
                break;
                
            default:
                // Return failure for unsupported statement types
                return { success: false, error: `Unsupported statement type: ${statement.type}` };
        }

        return result;
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'AST parse failed',
        };
    }
}

// =============================================================================
// Individual Statement Parsers
// =============================================================================

/**
 * Parse CREATE TABLE statement directly using comprehensive regex
 */
function parseCreateTableDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    // CREATE TABLE AS SELECT (CTAS)
    const ctasMatch = sql.match(/^CREATE\s+(?:TEMP(?:ORARY)?\s+)?(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\b/i);
    if (ctasMatch) {
        const schemaName = safeExtract(ctasMatch[1]);
        const tableName = safeExtract(ctasMatch[2]);
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
            confidence: 0.9,
            verificationLevel: 'DEFINITIVE',
            createAs: true,
            asQuery,
        };

        result.tables = result.tables || [];
        result.tables.push(table);
        context.tables.set(fullName, table);
        context.defineSymbol(tableName, 'table', table, schemaName, 'DEFINITIVE');
        return;
    }

    // Match: CREATE TABLE [IF NOT EXISTS] [schema.]name (...) [OPTIONS]
    const headerMatch = sql.match(/^CREATE\s+(?:TEMP(?:ORARY)?\s+)?(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s+TEMP(?:ORARY)?)?\s*\(/i);
    if (!headerMatch) {
        return;
    }

    const schemaName = safeExtract(headerMatch[1]);
    const tableName = safeExtract(headerMatch[2]);
    
    // Find balanced parentheses for column definitions
    const openIdx = sql.indexOf('(', headerMatch.index! + headerMatch[0].length - 1);
    if (openIdx < 0) return;

    let depth = 0;
    let closeIdx = -1;
    for (let i = openIdx; i < sql.length; i++) {
        if (sql[i] === '(') depth++;
        else if (sql[i] === ')') {
            depth--;
            if (depth === 0) {
                closeIdx = i;
                break;
            }
        }
    }
    if (closeIdx < 0) return;

    const fullName = context.qualifyName(tableName, schemaName);

    // Build basic table with default values
    // Note: name is the unqualified table name, schema is the schema name
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
        confidence: 0.9,
        verificationLevel: 'DEFINITIVE',
    };

    // Check for PARTITION BY
    const partitionMatch = sql.match(/PARTITION\s+BY\s+(RANGE|LIST|HASH)\s*\(\s*([^)]+)\s*\)/i);
    if (partitionMatch) {
        table.isPartitioned = true;
        table.partitionType = partitionMatch[1].toLowerCase() as any;
        table.partitionKey = partitionMatch[2].split(',').map(s => s.trim().replace(/"/g, ''));
    }

    // Check for PARTITION OF
    const partitionOfMatch = sql.match(/PARTITION\s+OF\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i);
    if (partitionOfMatch) {
        table.partitionOf = partitionOfMatch[2];
    }

    // Parse column definitions from the SQL section
    const columnsList = extractColumnDefinitionsFromSql(sql, context);
    table.columns = columnsList;

    const constraintsResult = parseConstraintDefinitions(sql, context);
    table.foreignKeys = constraintsResult.foreignKeys;
    table.checkConstraints = constraintsResult.constraints;
    table.uniqueConstraints = constraintsResult.uniqueConstraints;
    table.constraints = constraintsResult.tableConstraints;
    if (constraintsResult.primaryKey) {
        table.primaryKey = constraintsResult.primaryKey;
    }

    // Parse PERIOD FOR clause
    const periodForMatch = sql.match(/PERIOD\s+(?:FOR\s+)?(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i);
    if (periodForMatch) {
        table.period = {
            name: periodForMatch[1],
            startColumn: periodForMatch[2],
            endColumn: periodForMatch[3]
        };
    }

    // Parse PERIOD SYSTEM_TIME clause
    const periodSystemTimeMatch = sql.match(/PERIOD\s+SYSTEM_TIME\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/i);
    if (periodSystemTimeMatch) {
        table.period = {
            name: 'SYSTEM_TIME',
            startColumn: periodSystemTimeMatch[1],
            endColumn: periodSystemTimeMatch[2]
        };
    }

    // Check for WITH SYSTEM VERSIONING
    if (/\bWITH\s+SYSTEM\s+VERSIONING\b/i.test(sql)) {
        table.withSystemVersioning = true;
    }

    // Check for INHERITS
    const inheritsMatch = sql.match(/INHERITS\s*\(\s*([\w\s,\.]+)\s*\)/i);
    if (inheritsMatch) {
        const parents = inheritsMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
        table.inherits = parents;
        table.inheritsFrom = parents.join(', ');
    }

    // Check for WITHOUT OVERLAPS (table level)
    if (/\bWITHOUT\s+OVERLAPS\b/i.test(sql)) {
        table.withoutOverlaps = true;
    }

    // ON COMMIT clause for temporary tables
    const onCommitMatch = sql.match(/ON\s+COMMIT\s+(PRESERVE\s+ROWS|DELETE\s+ROWS|DROP)/i);
    if (onCommitMatch) {
        table.onCommit = onCommitMatch[1].toUpperCase().replace(/\s+/g, '_') as Table['onCommit'];
    }

    // Check for LIKE table
    const likeMatch = sql.match(/LIKE\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i);
    if (likeMatch) {
        table.likeTable = likeMatch[2];
    }

    // Extract WITH options
    const withMatch = sql.match(/WITH\s*\(\s*([^)]+)\s*\)/i);
    if (withMatch) {
        table.with = {};
        const options = withMatch[1].split(',').map(s => s.trim());
        for (const opt of options) {
            const [key, value] = opt.split('=').map(s => s.trim());
            if (key && value) {
                table.with[key] = isNaN(Number(value)) ? value : Number(value);
            }
        }
    }

    // Add to results
    result.tables = result.tables || [];
    result.tables.push(table);

    // Register in context
    context.tables.set(fullName, table);
    context.defineSymbol(tableName, 'table', table, schemaName, 'DEFINITIVE');
}

/**
 * Extract security_barrier / security_invoker from WITH (...) before AS
 */
function extractViewSecurityOptions(sql: string): { securityBarrier?: boolean; securityInvoker?: boolean } {
    const patterns = [
        /\bWITH\s*\(\s*([^)]+)\s*\)\s+AS\b/i,
        /\bWITH\s*\(\s*([^)]+)\s*\)\s*;?\s*$/i,
    ];
    for (const pattern of patterns) {
        const withMatch = sql.match(pattern);
        if (!withMatch) continue;
        const opts = withMatch[1];
        return {
            securityBarrier: /security_barrier\s*=\s*true/i.test(opts) ? true
                : /security_barrier\s*=\s*false/i.test(opts) ? false : undefined,
            securityInvoker: /security_invoker\s*=\s*true/i.test(opts) ? true
                : /security_invoker\s*=\s*false/i.test(opts) ? false : undefined,
        };
    }
    return {};
}

/**
 * Parse CREATE VIEW statement
 */
function parseCreateViewDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/^CREATE\s+(?:(?:OR\s+REPLACE\s+)?(?:RECURSIVE\s+|TEMPORARY\s+|TEMP\s+)*(?:MATERIALIZED\s+)?VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s*\(([^)]+)\))?(?:\s+WITH\s*\([^)]+\))?\s+AS\s+([\s\S]+?)(?:\s+WITH\s+CHECK\s+OPTION)?(?:\s+WITH\s+\([^)]+\))?(?:\s+TABLESPACE\s+\w+)?(?:\s*;)?$/i);
    
    if (!match) {
        return;
    }

    const schemaName = safeExtract(match[1]);
    const viewName = safeExtract(match[2]);
    const columnsStr = safeExtract(match[3]);
    let query = safeExtract(match[4]);
    
    // Clean up query - remove trailing check option and other clauses
    query = query.replace(/\s+WITH\s+(LOCAL|CASCADED)?\s*CHECK\s+OPTION\s*$/i, '').trim();

    const fullName = context.qualifyName(viewName, schemaName);

    // Extract check option
    let checkOption: 'CASCADED' | 'LOCAL' | undefined;
    if (/WITH\s+(?:LOCAL|CASCADED)?\s*CHECK\s+OPTION/i.test(sql)) {
        if (/LOCAL/i.test(sql)) checkOption = 'LOCAL';
        else checkOption = 'CASCADED';
    }

    const securityOpts = extractViewSecurityOptions(sql);

    // Parse column list if present - handle multi-line with proper whitespace
    const columns: string[] = [];
    if (columnsStr) {
        columns.push(...columnsStr.split(',').map(c => c.trim().replace(/"/g, '')));
    }

    const view: View = {
        name: viewName,
        schema: schemaName || context.currentSchema,
        isMaterialized: /MATERIALIZED\s+VIEW/i.test(sql),
        isRecursive: /RECURSIVE/i.test(sql),
        query,
        columns,
        checkOption,
        securityBarrier: securityOpts.securityBarrier,
        securityInvoker: securityOpts.securityInvoker,
        verificationLevel: 'DEFINITIVE',
    };

    // Add to results
    result.views = result.views || [];
    result.views.push(view);
    
    // Register in context
    context.views.set(fullName, view);
    context.defineSymbol(viewName, 'view', view, schemaName, 'DEFINITIVE');
}

/**
 * Parse CREATE INDEX statement
 */
function parseCreateIndexDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ON\s+(?:ONLY\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s+USING\s+(\w+))?\s*\(([\s\S]+?)\)(?:\s+(?:WHERE|INCLUDE|WITH))/i);
    
    if (!match) {
        return;
    }

    const isUnique = !!match[1];
    const schemaName = safeExtract(match[2]);
    const indexName = safeExtract(match[3]);
    const tableSchema = safeExtract(match[4]);
    const tableName = safeExtract(match[5]);
    const indexType = safeExtract(match[6]).toLowerCase() || 'btree';
    const columnsStr = safeExtract(match[7]);

    const fullIndexName = context.qualifyName(indexName, schemaName);
    const fullTableName = context.qualifyName(tableName, tableSchema);

    // Parse columns
    const parsedColumns: IndexColumn[] = [];
    if (columnsStr) {
        const parts = columnsStr.split(',');
        for (const part of parts) {
            const colTrim = part.trim();
            const colMatch = colTrim.match(/^(?:"?(\w+)"?)(?:\s+(ASC|DESC))?(?:\s+(FIRST|LAST))?(?:\s+COLLATE\s+(\w+))?/i);
            if (colMatch) {
                const name = colMatch[1];
                const direction = colMatch[2]?.toUpperCase() as any;
                parsedColumns.push({
                    column: name,
                    order: direction,
                    direction,
                });
            } else {
                const name = colTrim.replace(/"/g, '').split(/\s+/)[0];
                parsedColumns.push({
                    column: name,
                });
            }
        }
    }

    const index: Index = {
        name: indexName,
        table: tableName,
        columns: parsedColumns,
        type: indexType as any,
        method: indexType,
        isUnique,
        isPartial: /WHERE/i.test(sql),
        includeColumns: [],
    };

    // Add to results
    result.indexes = result.indexes || [];
    result.indexes.push(index);
    
    // Track dependency
    context.addDependency(fullIndexName, fullTableName);
}

function splitParams(str: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
        if (ch === '(') { depth++; current += ch; }
        else if (ch === ')') { depth--; current += ch; }
        else if (ch === ',' && depth === 0) { parts.push(current); current = ''; }
        else { current += ch; }
    }
    if (current.trim()) parts.push(current);
    return parts;
}

function parseParamStr(str: string): any | null {
    const tokens = str.trim().split(/\s+/);
    if (tokens.length === 0) return null;

    let mode: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC' | undefined;
    let name: string | undefined;
    let type: string;
    let idx = 0;

    // Check for mode as first token: "IN name type"
    const first = tokens[0].toUpperCase();
    if (['IN', 'OUT', 'INOUT', 'VARIADIC'].includes(first)) {
        mode = first as any;
        idx++;
    }

    // Find DEFAULT position
    const defaultIdx = tokens.findIndex((t, i) => i >= idx && t.toUpperCase() === 'DEFAULT');

    // Find mode keyword later in tokens: "name IN type"
    if (!mode) {
        const modeIdx = tokens.findIndex((t, i) => i >= idx && ['IN', 'OUT', 'INOUT', 'VARIADIC'].includes(t.toUpperCase()));
        if (modeIdx > idx) {
            name = tokens.slice(idx, modeIdx).join(' ');
            mode = tokens[modeIdx].toUpperCase() as any;
            const typeEnd = defaultIdx > 0 ? defaultIdx : tokens.length;
            type = tokens.slice(modeIdx + 1, typeEnd).join(' ');
        }
    }

    if (!mode) {
        // Default mode is IN
        mode = 'IN';
    }

    if (!name) {
        // Either "name type" or just "type"
        if (defaultIdx > idx + 1 || (defaultIdx === -1 && tokens.length > idx + 1)) {
            name = tokens[idx];
            const typeEnd = defaultIdx > 0 ? defaultIdx : tokens.length;
            type = tokens.slice(idx + 1, typeEnd).join(' ');
        } else {
            const typeEnd = defaultIdx > 0 ? defaultIdx : tokens.length;
            type = tokens.slice(idx, typeEnd).join(' ');
        }
    }

    let defaultVal: string | undefined;
    if (defaultIdx >= 0) {
        defaultVal = tokens.slice(defaultIdx + 1).join(' ');
    }

    return { name, type, mode, default: defaultVal };
}

/**
 * Parse CREATE FUNCTION statement
 */
function parseCreateFunctionDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(FUNCTION|PROCEDURE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s*\((.*?)\)/i);
    
    if (!match) {
        return;
    }

    const schemaName = safeExtract(match[2]);
    const funcName = safeExtract(match[3]);
    const parametersStr = safeExtract(match[4]);
    
    // Extract return type separately with proper boundary
    const returnMatch = sql.match(/RETURNS\s+(SETOF\s+)?(?:TABLE\s*\([^)]+\)|[A-Za-z][A-Za-z0-9_[\](),.]*?)(?=\s+(?:LANGUAGE|IMMUTABLE|STABLE|VOLATILE|SECURITY|AS\s|RETURN\s|;|\s*$))/i);
    let returnType = returnMatch ? returnMatch[0].replace(/^RETURNS\s+/i, '').trim() : undefined;

    const fullName = context.qualifyName(funcName, schemaName);

    // Extract language
    const langMatch = sql.match(/LANGUAGE\s+(\w+)/i);
    const language = langMatch ? langMatch[1] : 'sql';

    // Extract volatility
    let volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE' | undefined;
    if (/\bIMMUTABLE\b/i.test(sql)) volatility = 'IMMUTABLE';
    else if (/\bSTABLE\b/i.test(sql)) volatility = 'STABLE';
    else if (/\bVOLATILE\b/i.test(sql)) volatility = 'VOLATILE';

    // Extract parallel safety
    let parallel: 'SAFE' | 'RESTRICTED' | 'UNSAFE' | undefined;
    const parallelMatch = sql.match(/\bPARALLEL\s+(SAFE|RESTRICTED|UNSAFE)\b/i);
    if (parallelMatch) {
        parallel = parallelMatch[1].toUpperCase() as 'SAFE' | 'RESTRICTED' | 'UNSAFE';
    }

    // Extract SECURITY DEFINER
    const securityDefiner = /\bSECURITY\s+DEFINER\b/i.test(sql);

    // Extract COST
    let cost: number | undefined;
    const costMatch = sql.match(/\bCOST\s+(\d+)/i);
    if (costMatch) {
        cost = parseInt(costMatch[1], 10);
    }

    // Extract ROWS
    let rows: number | undefined;
    const rowsMatch = sql.match(/\bROWS\s+(\d+)/i);
    if (rowsMatch) {
        rows = parseInt(rowsMatch[1], 10);
    }

    // Extract SET options
    const setOptions: { category: string; name: string; value: string }[] = [];
    const setRegex = /\bSET\s+(\w+)\s*=\s*'([^']+)'/gi;
    let setMatch;
    while ((setMatch = setRegex.exec(sql)) !== null) {
        setOptions.push({
            category: 'runtime',
            name: setMatch[1],
            value: setMatch[2]
        });
    }

    // Detect RETURNS SETOF or RETURNS TABLE
    const setReturning = /\bRETURNS\s+(?:SETOF|TABLE)\b/i.test(sql);

    // Extract SQL body (PG14+: RETURN expr or BEGIN ATOMIC ... END)
    let sqlBody: string | undefined;
    const sqlBodyMatch = sql.match(/\bRETURN\s+([^;]+?)(?:\s*;?\s*$)/i);
    if (sqlBodyMatch && !sql.includes('$$')) {
        sqlBody = sqlBodyMatch[1].trim();
    }
    const atomicMatch = sql.match(/\bBEGIN\s+ATOMIC\s+([\s\S]+?)\s+END\b/i);
    if (atomicMatch) {
        sqlBody = 'BEGIN ATOMIC ' + atomicMatch[1].trim() + ' END';
    }

    // Extract function body (dollar-quoted: $$ ... $$ or $tag$ ... $tag$)
    let body: string | undefined;
    const bodyMatch = sql.match(/\$([^$]*)\$([\s\S]*?)\$\1\$/);
    if (bodyMatch) {
        body = bodyMatch[2].trim();
    }

    // Parse parameters
    const parameters: any[] = [];
    if (parametersStr) {
        const paramParts = splitParams(parametersStr);
        for (const part of paramParts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const param = parseParamStr(trimmed);
            if (param) parameters.push(param);
        }
    }

    const func: PostgresFunction = {
        name: funcName,
        schema: schemaName || context.currentSchema,
        language,
        returnType,
        isProcedure: match[1].toUpperCase() === 'PROCEDURE',
        body,
        volatility,
        parameters,
        arguments: parameters,
        securityDefiner: securityDefiner || undefined,
        parallel,
        cost,
        rows,
        setReturning,
        setOptions: setOptions.length > 0 ? setOptions : undefined,
        sqlBody,
    };

    // Add to results
    result.functions = result.functions || [];
    result.functions.push(func);
    
    // Register in context
    context.functions.set(fullName, func);
    context.defineSymbol(funcName, 'function', func, schemaName, 'DEFINITIVE');
}

/**
 * Parse CREATE TRIGGER statement
 */
function parseCreateTriggerDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?(?:CONSTRAINT\s+)?TRIGGER\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+(BEFORE|AFTER|INSTEAD\s+OF)\s+([\s\S]+?)\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i);
    
    if (!match) {
        return;
    }

    const schemaName = match[1] ? safeExtract(match[1]) : undefined;
    const triggerName = safeExtract(match[2]);
    const timing = safeExtract(match[3]).toUpperCase() as any;
    const eventsStr = safeExtract(match[4]).toUpperCase();
    const tableSchema = match[5] ? safeExtract(match[5]) : undefined;
    const tableName = safeExtract(match[6]);

    const fullTableName = context.qualifyName(tableName, tableSchema);
    const fullName = context.qualifyName(triggerName, schemaName);

    // Extract individual events
    const events: string[] = [];
    if (eventsStr.includes('INSERT')) events.push('INSERT');
    if (eventsStr.includes('UPDATE')) events.push('UPDATE');
    if (eventsStr.includes('DELETE')) events.push('DELETE');
    if (eventsStr.includes('TRUNCATE')) events.push('TRUNCATE');

    // Extract function name
    const execMatch = sql.match(/EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i);
    const funcSchema = execMatch ? execMatch[1] : undefined;
    const funcName = execMatch ? execMatch[2] : undefined;

    if (funcName) {
        const fullFuncName = context.qualifyName(funcName, funcSchema);
        context.addDependency(fullName, fullFuncName);
    }

    // Extract WHEN condition
    let condition: string | undefined;
    const whenMatch = sql.match(/\bWHEN\s*\((.+?)\)\s*EXECUTE/i);
    if (whenMatch) {
        condition = whenMatch[1].trim();
    }

    // Extract REFERENCING clause (arbitrary order support)
    let referencing: { newTable?: string; oldTable?: string } | undefined;
    const referencingMatch = sql.match(/\bREFERENCING\s+([\s\S]+?)(?=\bFOR\b|\bEXECUTE\b|\bWHEN\b|$)/i);
    if (referencingMatch) {
        const refClause = referencingMatch[1];
        const oldMatch = refClause.match(/\bOLD\s+TABLE\s+(?:AS\s+)?(\w+)/i);
        const newMatch = refClause.match(/\bNEW\s+TABLE\s+(?:AS\s+)?(\w+)/i);
        if (oldMatch || newMatch) {
            referencing = {};
            if (oldMatch) referencing.oldTable = oldMatch[1];
            if (newMatch) referencing.newTable = newMatch[1];
        }
    }

    // Extract function arguments
    let arguments_: string[] | undefined;
    const argsMatch = sql.match(/EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([^)]*)\)/i);
    if (argsMatch && argsMatch[3]) {
        arguments_ = argsMatch[3].split(',').map(a => a.trim()).filter(a => a);
    }

    // Check for constraint trigger
    const isConstraint = /\bCONSTRAINT\s+TRIGGER\b/i.test(sql);

    // Check for DEFERRABLE
    const deferrable = /\bDEFERRABLE\b/i.test(sql);
    const initially = /\bINITIALLY\s+(DEFERRED|IMMEDIATE)\b/i.exec(sql)?.[1]?.toUpperCase();
    const initiallyDeferred = initially === 'DEFERRED';

    const trigger: Trigger = {
        name: triggerName,
        table: tableName,
        timing,
        events,
        event: events[0] || 'UPDATE',
        level: /\bFOR\s+EACH\s+ROW\b/i.test(sql) ? 'ROW' : 'STATEMENT',
        functionName: funcName,
        functionSchema: funcSchema,
        function: funcName,
        condition,
        referencing,
        arguments: arguments_,
        isConstraint,
        deferrable,
        initially: initially as 'DEFERRED' | 'IMMEDIATE' | undefined,
        initiallyDeferred,
    };

    // Register in context
    context.addDependency(fullName, fullTableName);
    context.triggers.set(triggerName, trigger);

    // Add to results
    result.triggers = result.triggers || [];
    result.triggers.push(trigger);
}

/**
 * Parse CREATE ENUM statement
 */
function parseCreateEnumDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s+ENUM\s*\(\s*([^)]+)\s*\)/i);
    
    if (!match) {
        return;
    }

    const schemaName = safeExtract(match[1]);
    const enumName = safeExtract(match[2]);
    const valuesStr = safeExtract(match[3]);

    const fullName = context.qualifyName(enumName, schemaName);
    const values = valuesStr.split(',').map(v => v.trim().replace(/^'|'$/g, ''));

    const enumType: EnumType = {
        name: enumName,
        schema: schemaName || context.currentSchema,
        values,
    };

    // Add to results
    result.enums = result.enums || [];
    result.enums.push(enumType);
}

/**
 * Parse CREATE TYPE statement for composite types
 */
function parseCreateTypeDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    // PG14+: MULTIRANGE type
    const multirangeMatch = sql.match(/CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s+MULTIRANGE\s*\(\s*(?:SUBTYPE\s*=\s*)?(\w+)\s*\)/i);
    if (multirangeMatch) {
        const schemaName = multirangeMatch[1] ? safeExtract(multirangeMatch[1]) : undefined;
        const typeName = safeExtract(multirangeMatch[2]);
        const subtype = safeExtract(multirangeMatch[3]);
        const fullName = context.qualifyName(typeName, schemaName);

        const compositeType: CompositeType = {
            name: typeName,
            schema: schemaName || context.currentSchema,
            attributes: [{ name: 'subtype', type: subtype }],
            kind: 'multirange',
            subtype,
        };

        result.compositeTypes = result.compositeTypes || [];
        result.compositeTypes.push(compositeType);
        context.compositeTypes.set(fullName, compositeType);
        context.defineSymbol(typeName, 'type', compositeType, schemaName, 'DEFINITIVE');
        return;
    }

    // Match: CREATE TYPE [schema.]name AS ( ... )
    const match = sql.match(/CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s*\(/i);
    if (!match) {
        return;
    }

    const schemaName = match[1] ? safeExtract(match[1]) : undefined;
    const typeName = safeExtract(match[2]);
    const fullName = context.qualifyName(typeName, schemaName);

    // Find the AS ( ... ) section with balanced parentheses
    const startIdx = sql.indexOf('(', match.index! + match[0].length - 1);
    if (startIdx === -1) return;

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

    if (endIdx === -1) return;

    const attributesStr = sql.slice(startIdx + 1, endIdx).trim();

    // Parse attributes (respect commas, but don't split inside parentheses like VARCHAR(10))
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
        schema: schemaName || context.currentSchema,
        attributes,
        fields: attributes,
        columns: attributes,
    };

    // Add to results
    result.compositeTypes = result.compositeTypes || [];
    result.compositeTypes.push(compositeType);

    // Register in context
    context.compositeTypes.set(fullName, compositeType);
}

/**
 * Parse CREATE EXTENSION statement
 */
function parseCreateExtensionDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?)/i);
    
    if (!match) {
        return;
    }

    const extName = safeExtract(match[1]);

    const schemaMatch = sql.match(/SCHEMA\s+(?:"?(\w+)"?)/i);
    const schemaName = schemaMatch ? schemaMatch[1] : context.currentSchema || 'public';

    const versionMatch = sql.match(/VERSION\s+'([^']+)'/i);
    const version = versionMatch ? versionMatch[1] : undefined;

    const extension: Extension = {
        name: extName,
        schema: schemaName,
        version,
    };

    // Add to results
    result.extensions = result.extensions || [];
    result.extensions.push(extension);

    // Register in context
    context.extensions.set(extName, extension);
}

/**
 * Parse CREATE SCHEMA statement
 */
function parseCreateSchemaDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?)/i);
    
    if (!match) {
        return;
    }

    const schemaName = safeExtract(match[1]);

    // Add to results
    result.schemas = result.schemas || [];
    result.schemas.push(schemaName);
}

/**
 * Parse CREATE SEQUENCE statement
 */
function parseCreateSequenceDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+(TEMP(?:ORARY)?\s+)?SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i);
    
    if (!match) {
        return;
    }

    const schemaName = safeExtract(match[2]);
    const seqName = safeExtract(match[3]);
    const fullName = context.qualifyName(seqName, schemaName);

    const sequence: Sequence = {
        name: seqName,
        schema: schemaName || context.currentSchema,
        dataType: undefined,
        start: undefined,
        increment: undefined,
        minValue: undefined,
        maxValue: undefined,
        cycle: /CYCLE/i.test(sql) && !/NO\s+CYCLE/i.test(sql),
        cache: undefined,
        order: /ORDER/i.test(sql) && !/NO\s+ORDER/i.test(sql),
        ownedBy: undefined,
        comment: undefined,
        temporary: !!match[1]
    };

    // Extract data type
    const dataTypeMatch = sql.match(/AS\s+(SMALLINT|INTEGER|BIGINT)/i);
    if (dataTypeMatch) {
        sequence.dataType = dataTypeMatch[1].toUpperCase();
    }

    // Extract START WITH
    const startMatch = sql.match(/START\s+(?:WITH\s+)?(-?\d+)/i);
    if (startMatch) {
        sequence.start = parseInt(startMatch[1], 10);
    }

    // Extract INCREMENT BY
    const incrementMatch = sql.match(/INCREMENT\s+(?:BY\s+)?(-?\d+)/i);
    if (incrementMatch) {
        sequence.increment = parseInt(incrementMatch[1], 10);
    }

    // Extract MINVALUE
    const minMatch = sql.match(/MINVALUE\s+(-?\d+)/i);
    if (minMatch) {
        sequence.minValue = parseInt(minMatch[1], 10);
    }

    // Extract MAXVALUE
    const maxMatch = sql.match(/MAXVALUE\s+(-?\d+)/i);
    if (maxMatch) {
        sequence.maxValue = parseInt(maxMatch[1], 10);
    }

    // Extract CACHE
    const cacheMatch = sql.match(/CACHE\s+(\d+)/i);
    if (cacheMatch) {
        sequence.cache = parseInt(cacheMatch[1], 10);
    }

    // Extract OWNED BY
    const ownedByMatch = sql.match(/OWNED\s+BY\s+(\w+(?:\.\w+)?)/i);
    if (ownedByMatch) {
        sequence.ownedBy = ownedByMatch[1];
    }

    // Add to results
    result.sequences = result.sequences || [];
    result.sequences.push(sequence);

    // Register in context
    context.sequences.set(fullName, sequence);
    context.defineSymbol(seqName, 'sequence', sequence, schemaName, 'DEFINITIVE');
}

/**
 * Parse CREATE DOMAIN statement
 */
function parseCreateDomainDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+DOMAIN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+(?:AS\s+)?([A-Za-z][A-Za-z0-9_(),\s]*?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|CHECK|COLLATE)[\s\S]*)?$/i);
    
    if (!match) {
        return;
    }

    const schemaName = safeExtract(match[1]);
    const domainName = safeExtract(match[2]);
    const baseType = safeExtract(match[3]).trim();
    const fullName = context.qualifyName(domainName, schemaName);

    const domain: Domain = {
        name: domainName,
        schema: schemaName || context.currentSchema,
        baseType,
        notNull: /NOT\s+NULL/i.test(sql),
    };

    // Extract CHECK constraint
    const checkMatch = sql.match(/CHECK\s*\((.+?)\)/i);
    if (checkMatch) {
        domain.checkExpression = checkMatch[1].trim();
    }

    // Extract DEFAULT
    const defaultMatch = sql.match(/DEFAULT\s+([^\s]+)/i);
    if (defaultMatch) {
        domain.default = defaultMatch[1].trim();
    }

    // Extract COLLATE
    const collateMatch = sql.match(/\bCOLLATE\s+"?(\w+)"?/i);
    if (collateMatch) {
        domain.collation = collateMatch[1];
    }

    // Add to results
    result.domains = result.domains || [];
    result.domains.push(domain);
}

/**
 * Parse CREATE ROLE statement
 */
function parseCreateRoleDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+(?:ROLE|USER)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?)/i);
    
    if (!match) {
        return;
    }

    const roleName = safeExtract(match[1]);
    const upperSql = sql.toUpperCase();
    const conLimitMatch = sql.match(/CONNECTION\s+LIMIT\s+(-?\d+)/i);

    const role: Role = {
        name: roleName,
        isSuperuser: upperSql.includes('SUPERUSER') && !upperSql.includes('NOSUPERUSER'),
        canLogin: upperSql.includes('LOGIN') && !upperSql.includes('NOLOGIN'),
        canCreateDb: upperSql.includes('CREATEDB') && !upperSql.includes('NOCREATEDB'),
        canCreateRole: upperSql.includes('CREATEROLE') && !upperSql.includes('NOCREATEROLE'),
        inherit: upperSql.includes('INHERIT') && !upperSql.includes('NOINHERIT'),
        bypassRls: upperSql.includes('BYPASSRLS') && !upperSql.includes('NOBYPASSRLS'),
        replication: upperSql.includes('REPLICATION') && !upperSql.includes('NOREPLICATION'),
        connectionLimit: conLimitMatch ? parseInt(conLimitMatch[1], 10) : undefined,
    };

    // Add to results
    result.roles = result.roles || [];
    result.roles.push(role);
}

/**
 * Parse ALTER TABLE statement
 */
function parseAlterTableDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    // ENABLE ROW LEVEL SECURITY
    const enableRLSMatch = sql.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    if (enableRLSMatch) {
        const schemaName = enableRLSMatch[1];
        const tableName = enableRLSMatch[2];
        const fullName = context.qualifyName(tableName, schemaName);
        const table = context.tables.get(fullName) || context.tables.get(tableName);
        if (table) {
            table.rlsEnabled = true;
        }
        return;
    }

    // DISABLE ROW LEVEL SECURITY
    const disableRLSMatch = sql.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    if (disableRLSMatch) {
        const schemaName = disableRLSMatch[1];
        const tableName = disableRLSMatch[2];
        const fullName = context.qualifyName(tableName, schemaName);
        const table = context.tables.get(fullName) || context.tables.get(tableName);
        if (table) {
            table.rlsEnabled = false;
        }
        return;
    }

    // FORCE ROW LEVEL SECURITY
    const forceRLSMatch = sql.match(/ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
    if (forceRLSMatch) {
        const schemaName = forceRLSMatch[1];
        const tableName = forceRLSMatch[2];
        const fullName = context.qualifyName(tableName, schemaName);
        const table = context.tables.get(fullName) || context.tables.get(tableName);
        if (table) {
            table.rlsEnabled = true;
        }
        return;
    }

    // Let the regex fallback handle all other ALTER TABLE commands
    result.success = false;
}

/**
 * Parse CREATE POLICY statement
 */
function parseCreatePolicyDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const match = sql.match(/CREATE\s+POLICY\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+(?:AS\s+(PERMISSIVE|RESTRICTIVE)\s+)?FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)/i);
    
    if (!match) {
        return;
    }

    const policyName = safeExtract(match[2]);
    const schemaName = safeExtract(match[1]);
    const tableName = safeExtract(match[4]);
    const tableSchema = safeExtract(match[3]);
    const permissive = !(match[5] && match[5].toUpperCase() === 'RESTRICTIVE');
    const command = safeExtract(match[6]).toUpperCase() as any;

    const fullTableName = context.qualifyName(tableName, tableSchema);

    // Track table dependency
    context.addDependency(policyName, fullTableName);

    const policy: Policy = {
        name: policyName,
        schema: schemaName || context.currentSchema,
        table: tableName,
        command,
        permissive,
    };

    // Add to results
    result.policies = result.policies || [];
    result.policies.push(policy);
}

/**
 * Parse CREATE PROPERTY GRAPH statement
 */
function parseCreatePropertyGraphDirect(
    sql: string,
    context: ParseContext,
    result: AstParseResult
): void {
    const parseResult = parseCreatePropertyGraphRegex(sql, context);
    if (parseResult.success && parseResult.propertyGraph) {
        result.propertyGraphs = result.propertyGraphs || [];
        result.propertyGraphs.push(parseResult.propertyGraph);
    }
}