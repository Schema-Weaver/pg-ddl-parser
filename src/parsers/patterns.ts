import { DataTypeCategory } from '../types';

// =============================================================================
// Type Categorization
// =============================================================================

export function categorizeDataType(typeName: string): DataTypeCategory {
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
    if (t === 'uuid') return 'uuid';
    if (/^(json|jsonb|json_scalar|json_table)/.test(t)) return 'json';
    if (t.endsWith('[]')) return 'array';
    if (t === 'bytea') return 'binary';
    if (t === 'hstore') return 'hstore';
    if (/range$/.test(t)) return 'range';
    if (/multirange$/.test(t)) return 'range';
    if (/^(inet|cidr|macaddr|macaddr8)/.test(t)) return 'network';
    if (/^(geometry|geography|point|line|lseg|box|path|polygon|circle)/.test(t)) {
        return 'geometry';
    }
    if (/^(tsvector|tsquery)/.test(t)) return 'text';
    if (/^(xml)/.test(t)) return 'text';

    return 'other';
}

// =============================================================================
// Regex Patterns
// =============================================================================

export const PATTERNS = {
    // CREATE TABLE with optional schema (TEMP before or after table name)
    createTable: /CREATE\s+(?:TEMP(?:ORARY)?\s+)?(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s+TEMP(?:ORARY)?)?\s*\(/i,

    // CREATE TABLE AS SELECT (CTAS)
    createTableAs: /CREATE\s+(?:TEMP(?:ORARY)?\s+)?(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\b/i,

    // PARTITION BY clause
    partitionBy: /PARTITION\s+BY\s+(RANGE|LIST|HASH)\s*\(\s*([^)]+)\s*\)/i,

    // PARTITION OF clause (child partition)
    partitionOf: /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+PARTITION\s+OF\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // Column definition (simplified)
    column: /^\s*"?(\w+)"?\s+([A-Z][A-Z0-9_(),.]+)(?:\s*\[\s*\])?(.*)$/i,

    // GENERATED ALWAYS AS (PG <=17: STORED only; PG 18+: STORED or VIRTUAL)
    generatedColumn: /GENERATED\s+ALWAYS\s+AS\s*\(([^)]+)\)\s+(STORED|VIRTUAL)/i,

    // IDENTITY columns (PG12+)
    identityAlways: /GENERATED\s+ALWAYS\s+AS\s+IDENTITY(?:\s*\(([^)]+)\))?/i,
    identityByDefault: /GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY(?:\s*\(([^)]+)\))?/i,

    // REFERENCES clause
    references: /REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(\s*"?(\w+)"?\s*\)\s*(?:ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION))?/i,

    // PRIMARY KEY
    primaryKey: /PRIMARY\s+KEY/i,

    // NOT NULL
    notNull: /NOT\s+NULL/i,

    // UNIQUE
    unique: /\bUNIQUE\b/i,

    // DEFAULT - handles nested parentheses (e.g., nextval('seq'::regclass))
    default: /DEFAULT\s+((?:[^,)]|\([^)]*\))+)/i,

    // CHECK constraint
    check: /CHECK\s*\(([^)]+(?:\([^)]*\)[^)]*)*)\)/i,

    // Table-level CONSTRAINT
    tableConstraint: /CONSTRAINT\s+"?(\w+)"?\s+(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)/i,

    // CREATE POLICY
    createPolicy: /CREATE\s+POLICY\s+"?(\w+)"?\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+(?:AS\s+(PERMISSIVE|RESTRICTIVE)\s+)?FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)/i,

    // USING and WITH CHECK in policies
    policyUsing: /USING\s*\((.+?)\)(?:\s*WITH\s+CHECK\s*\((.+?)\))?/i,

    // CREATE TYPE ... AS ENUM
    createEnum: /CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s+ENUM\s*\(\s*([^)]+)\s*\)/i,

    // CREATE TYPE ... AS (composite) - NOT ENUM (requires matching parens, not ENUM keyword)
    createCompositeType: /CREATE\s+TYPE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS\s*\(\s*([\s\S]+?)\s*\)/i,

    // CREATE DOMAIN
    createDomain: /CREATE\s+DOMAIN\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+(?:AS\s+)?([A-Za-z][A-Za-z0-9_()\[\],\s]*?)(?:\s+(?:NOT\s+NULL|NULL|DEFAULT|CHECK|COLLATE)[\s\S]*)?$/i,

    // CREATE VIEW
    createView: /CREATE\s+(?:OR\s+REPLACE\s+)?(MATERIALIZED\s+)?VIEW\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+AS/i,

    // CREATE VIEW with WITH (...) options before AS (PG15+)
    createViewWithOptions: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:(?:RECURSIVE\s+|TEMPORARY\s+|TEMP\s+)*(?:MATERIALIZED\s+)?VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s*\([^)]+\))?(?:\s+WITH\s*\([^)]+\))?\s+AS/i,

    // CREATE FUNCTION
    createFunction: /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(([^)]*)\)\s*RETURNS\s+(\w+(?:\s+\w+)?)/i,

    // CREATE TRIGGER (with constraint support)
    createTrigger: /CREATE\s+(?:OR\s+REPLACE\s+)?(?:CONSTRAINT\s+)?TRIGGER\s+"?(\w+)"?\s+(BEFORE|AFTER|INSTEAD\s+OF)\s+([\s\S]+?)\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // EXECUTE FUNCTION
    executeFunction: /EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // CREATE EXTENSION
    createExtension: /CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i,

    // CREATE SCHEMA
    createSchema: /CREATE\s+SCHEMA\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i,

    // CREATE SEQUENCE
    createSequence: /CREATE\s+(TEMP(?:ORARY)?\s+)?SEQUENCE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // COMMENT ON
    comment: /COMMENT\s+ON\s+(TABLE|COLUMN|SCHEMA|FUNCTION|INDEX|TRIGGER|VIEW)\s+(?:"?(\w+)"?\.)?"?(\w+)"?(?:\."?(\w+)"?)?\s+IS\s+'([^']+)'/i,

    // CREATE INDEX - improved to handle complex expressions
    createIndex: /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s+ON\s+(?:ONLY\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s+USING\s+(\w+))?\s*\(([\s\S]+?)\)(?:\s+(?:WHERE|INCLUDE|WITH))?/i,

    // CREATE ROLE
    createRole: /CREATE\s+(ROLE|USER)\s+"?(\w+)"?(?:\s+(SUPERUSER|NOSUPERUSER|CREATEDB|NOCREATEDB|CREATEROLE|NOCREATEROLE|INHERIT|NOINHERIT|LOGIN|NOLOGIN|REPLICATION|NOREPLICATION|BYPASSRLS|NOBYPASSRLS|CONNECTION\s+LIMIT\s+\d+|VALID\s+UNTIL\s+'[^']+'|PASSWORD\s+'[^']+'|IN\s+ROLE\s+[^,;]+|IN\s+GROUP\s+[^,;]+|ROLE\s+[^,;]+|ADMIN\s+[^,;]+|USER\s+[^,;]+|SYSID\s+\d+)*)*/i,

    // CREATE RULE
    createRule: /CREATE\s+RULE\s+"?(\w+)"?\s+AS\s+ON\s+(SELECT|INSERT|UPDATE|DELETE)\s+TO\s+(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s+(?:WHEN|WHERE)\s+([\s\S]+?))?\s+DO\s+([\s\S]+)$/i,

    // ALTER TABLE ENABLE ROW LEVEL SECURITY
    enableRls: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,

    // PG18: WITHOUT OVERLAPS constraint (inline and table-level)
    withoutOverlapsColumn: /\bUNIQUE\s+\(([^)]+)\)\s+WITHOUT\s+OVERLAPS/i,
    withoutOverlapsConstraint: /CONSTRAINT\s+"?(\w+)"?\s+UNIQUE\s+\(([^)]+)\)\s+WITHOUT\s+OVERLAPS/i,

    // PG18: NOT ENFORCED constraint
    notEnforcedConstraint: /\bCONSTRAINT\s+"?(\w+)"?\s+CHECK\s*\([^)]+\)\s+NOT\s+ENFORCED/i,
    notEnforcedFK: /\bFOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+[^)]+\)\s+NOT\s+ENFORCED/i,

    // PG18: PERIOD temporal foreign key
    periodForeignKey: /FOREIGN\s+KEY\s*\(\s*([^,)]+)\s*,\s*PERIOD\s+\(([^)]+)\)\s*\)\s*REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(\s*([^)]+)\s*(:?\s*,\s*PERIOD\s+\(([^)]+)\)\s*)?\)/i,

    // PG18: PERIOD temporal primary key
    periodPrimaryKey: /PRIMARY\s+KEY\s+\(([^)]+)\)\s+PERIOD\s+\(([^)]+)\)/i,

    // PG18: Named NOT NULL constraint (table level)
    namedNotNullConstraint: /CONSTRAINT\s+"?(\w+)"?\s+NOT\s+NULL\s+\(([^)]+)\)/i,

    // PG18: ALTER TABLE ADD CONSTRAINT with NOT VALID
    alterTableAddConstraint: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ADD\s+CONSTRAINT\s+"?(\w+)"?\s+(CHECK|UNIQUE|FOREIGN\s+KEY)/i,
    alterTableValidateConstraint: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+VALIDATE\s+CONSTRAINT\s+"?(\w+)"?/i,
    alterTableNoInherit: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+NO\s+INHERIT\s+"?(\w+)"?/i,
    alterTableInherit: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+INHERIT\s+"?(\w+)"?/i,

    // PG18: ALTER TABLE ... NOT VALID
    alterTableNotValid: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+VALIDATE\s+CONSTRAINT\s+"?(\w+)"?/i,

    // PG18: ALTER TABLE ... EXPRESSION (generated column)
    alterTableSetExpression: /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s+ALTER\s+COLUMN\s+"?(\w+)"?\s+SET\s+EXPRESSION/i,

    // PG19: CREATE/DROP PROPERTY GRAPH
    createPropertyGraph: /CREATE\s+PROPERTY\s+GRAPH\s+(?:TABLE\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // PG19: GRAPH_TABLE query
    graphTableQuery: /GRAPH_TABLE\s*\(\s*([^)]+)\s+MATCH\s+([^)]+)\s+COLUMNS\s*\([^)]+\)/i,

    // PG18: CREATE FOREIGN TABLE LIKE
    createForeignTableLike: /CREATE\s+FOREIGN\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(\s*LIKE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s+\([^)]+\)\s*\)/i,

    // PG19: REPACK
    repackTable: /REPACK\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // WAIT FOR LSN
    waitForLsn: /WAIT\s+FOR\s+LSN\s*\(\s*'([^']+)'\s*\)/i,

    // =============================================================================
    // DROP Statements (44 DROP statements)
    // =============================================================================

    // DROP TABLE
    dropTable: /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP VIEW
    dropView: /DROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP INDEX
    dropIndex: /DROP\s+INDEX\s+(?:CONCURRENTLY\s+)?(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP INDEX CONCURRENTLY (separate pattern for CONCURRENTLY keyword)
    dropIndexConcurrently: /DROP\s+INDEX\s+CONCURRENTLY\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP FUNCTION
    dropFunction: /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?\s*\((?:[^)]*)\)?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP TYPE
    dropType: /DROP\s+TYPE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP SEQUENCE
    dropSequence: /DROP\s+SEQUENCE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP SCHEMA
    dropSchema: /DROP\s+SCHEMA\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP DATABASE
    dropDatabase: /DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?/i,

    // DROP ROLE
    dropRole: /DROP\s+(?:ROLE|USER)\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?/i,

    // DROP EXTENSION
    dropExtension: /DROP\s+EXTENSION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP MATERIALIZED VIEW
    dropMaterializedView: /DROP\s+MATERIALIZED\s+VIEW\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP AGGREGATE
    dropAggregate: /DROP\s+AGGREGATE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?\s*\((?:[^)]*)\)?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP OPERATOR
    dropOperator: /DROP\s+OPERATOR\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?\s*\((?:[^)]*)\)?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP PROPERTY GRAPH
    dropPropertyGraph: /DROP\s+PROPERTY\s+GRAPH\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?/i,

    // DROP DOMAIN
    dropDomain: /DROP\s+DOMAIN\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP CAST
    dropCast: /DROP\s+CAST\s+(?:IF\s+EXISTS\s+)?\(\s*([^)]+)\s+AS\s+([^)]+)\s*\)(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP CONVERSION
    dropConversion: /DROP\s+CONVERSION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP TRANSFORM
    dropTransform: /DROP\s+TRANSFORM\s+(?:IF\s+EXISTS\s+)?\(\s*([^)]+)\s+FOR\s+([^)]+)\s*\)(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP FOREIGN TABLE
    dropForeignTable: /DROP\s+FOREIGN\s+TABLE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP FOREIGN SERVER
    dropForeignServer: /DROP\s+SERVER\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP USER MAPPING
    dropUserMapping: /DROP\s+USER\s+MAPPING\s+(?:IF\s+EXISTS\s+)?\(\s*([^)]+)\s+FOR\s+([^)]+)\s*\)\s+ON\s+SERVER\s+"?(\w+)"?/i,

    // DROP STATISTIC
    dropStatistic: /DROP\s+STATISTICS\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP EVENT TRIGGER
    dropEventTrigger: /DROP\s+EVENT\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?/i,

    // DROP SUBSCRIPTION
    dropSubscription: /DROP\s+SUBSCRIPTION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP PUBLICATION
    dropPublication: /DROP\s+PUBLICATION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP FOREIGN DATA WRAPPER
    dropForeignDataWrapper: /DROP\s+FOREIGN\s+DATA\s+WRAPPER\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP LARGE OBJECT
    dropLargeObject: /DROP\s+LARGE\s+OBJECT\s+(?:IF\s+EXISTS\s+)?(\d+)/i,

    // DROP TEXT SEARCH DICTIONARY
    dropTextSearchDictionary: /DROP\s+TEXT\s+SEARCH\s+DICTIONARY\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP TEXT SEARCH CONFIGURATION
    dropTextSearchConfiguration: /DROP\s+TEXT\s+SEARCH\s+CONFIGURATION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP TEXT SEARCH PARSER
    dropTextSearchParser: /DROP\s+TEXT\s+SEARCH\s+PARSER\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP TEXT SEARCH TEMPLATE
    dropTextSearchTemplate: /DROP\s+TEXT\s+SEARCH\s+TEMPLATE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP COLLATION
    dropCollation: /DROP\s+COLLATION\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP POLICY
    dropPolicy: /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?(?:\s+(CASCADE|RESTRICT))?/i,

    // DROP TRIGGER
    dropTrigger: /DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?\s+ON\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i,

    // DROP RULE
    dropRule: /DROP\s+RULE\s+(?:IF\s+EXISTS\s+)?(\w+)?(?:\.(\w+))?"?(\w+)"?\s+ON\s+(?:"?(\w+)"?\.)?(\w+)"?/i,

    // CREATE COLLATION
    createCollation: /CREATE\s+COLLATION\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s*\(\s*([\s\S]+?)\s*\)/i,

    // CREATE DATABASE
    createDatabase: /CREATE\s+DATABASE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*([\s\S]*)/i,

    // CREATE AGGREGATE: name (type) (SFUNC=..., STYPE=..., ...)
    createAggregate: /CREATE\s+(?:OR\s+REPLACE\s+)?AGGREGATE\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(\s*([^)]+?)\s*\)\s*\(\s*([\s\S]+?)\s*\)/i,

    // CREATE MATERIALIZED VIEW
    createMaterializedView: /CREATE\s+MATERIALIZED\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)\s+AS\s+([\s\S]+)/i,

    // CREATE OPERATOR
    createOperator: /CREATE\s+OPERATOR\s+(?:"?(\w+)"?\.)?([^\s(]+)\s*\(\s*([\s\S]+?)\s*\)/i,
};
