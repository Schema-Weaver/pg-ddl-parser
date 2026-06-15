// =============================================================================
// CREATE Statement Regex Patterns
// =============================================================================

// CREATE TABLE patterns
export const CREATE_TABLE_REGEX = /^CREATE\s+(TEMP|TEMPORARY|UNLOGGED)?\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*\(/i;
export const CREATE_TABLE_AS_REGEX = /^CREATE\s+(TEMP|TEMPORARY|UNLOGGED)?\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s+AS\s+SELECT/i;
export const LIKE_CLAUSE_REGEX = /LIKE\s+(\w+(?:\.\w+)?)\s*(\([^)]+\))?/gi;
export const INHERITS_CLAUSE_REGEX = /INHERITS\s*\(\s*([\w\s,]+)\s*\)/gi;
export const PARTITION_OF_REGEX = /PARTITION\s+OF\s+(\w+(?:\.\w+)?)\s*(\([^)]+\))?/gi;
export const TABLESPACE_REGEX = /TABLESPACE\s+(\w+)/gi;
export const WITH_REGEX = /WITH\s*\(\s*([^)]+)\s*\)/gi;
export const WITHOUT_OIDS_REGEX = /WITHOUT\s+OIDS/gi;
export const WITH_OIDS_REGEX = /WITH\s+OIDS/gi;
export const ON_COMMIT_REGEX = /ON\s+COMMIT\s+(PRESERVE_ROWS|DELETE_ROWS|DROP)/gi;

// CREATE TABLE column constraints
export const COLUMN_CONSTRAINTS_REGEX = {
    PRIMARY_KEY: /PRIMARY\s+KEY/gi,
    UNIQUE: /UNIQUE/gi,
    NOT_NULL: /NOT\s+NULL/gi,
    NULL: /NULL/gi,
    DEFAULT: /DEFAULT\s+([^,)\n]+)/gi,
    CHECK: /CHECK\s*\(\s*([^)]+)\s*\)/gi,
    REFERENCES: /REFERENCES\s+(\w+(?:\.\w+)?)\s*\(\s*([\w\s,]+)\s*\)/gi,
    GENERATED: /GENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY/gi,
    STORED: /STORED\s+AS\s+\(/gi,
    VIRTUAL: /VIRTUAL/gi,
    COMMENT: /COMMENT\s+'[^']*'/gi,
};

// CREATE INDEX patterns
export const CREATE_INDEX_REGEX = /^CREATE\s+(UNIQUE)?\s+INDEX\s+(CONCURRENTLY)?\s+(IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s*(USING\s+(\w+))?\s*\(/i;
export const INCLUDE_REGEX = /INCLUDE\s*\(\s*([\w\s,]+)\s*\)/gi;
export const INDEX_WITH_REGEX = /WITH\s*\(\s*([^)]+)\s*\)/gi;
export const WHERE_REGEX = /WHERE\s+(.+)/gi;
export const COLLATE_REGEX = /COLLATE\s+(\w+)/gi;
export const OPCLASS_REGEX = /(\w+)\s+(\w+)(?:\s*\(\s*[^)]+\s*\))?/gi;

// CREATE MATERIALIZED VIEW patterns
export const CREATE_MATERIALIZED_VIEW_REGEX = /^CREATE\s+MATERIALIZED\s+VIEW\s+(IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(\([^)]+\))?\s+AS\s+SELECT/i;
export const REFRESH_REGEX = /REFRESH\s+DEFERRED|REFRESH\s+IMMEDIATE/gi;
export const WITH_NO_DATA_REGEX = /WITH\s+NO\s+DATA/gi;

// CREATE FUNCTION/PROCEDURE patterns
export const CREATE_FUNCTION_REGEX = /^CREATE\s+(OR\s+REPLACE\s+)?(OR\s+ALTER\s+)?(OR\s+INVOKER\s+)?(OR\s+DEFINER\s+)?(OR\s+SECURITY\s+INVOKER\s+)?(OR\s+SECURITY\s+DEFINER\s+)?(FUNCTION|PROCEDURE)\s+(\w+(?:\.\w+)?)\s*\(/i;
export const RETURNS_REGEX = /RETURNS\s+(SETOF\s+)?(\w+)(?:\s*\[\s*\])/gi;
export const LANGUAGE_REGEX = /LANGUAGE\s+(\w+)/gi;
export const VOLATILITY_REGEX = /VOLATILE|STABLE|IMMUTABLE/gi;
export const AS_REGEX = /AS\s+(?:'([^']*)'|\"([^\"]*)\"|'([^']*)'|$$([^$]*)$$)/gi;
export const COST_REGEX = /COST\s+(\d+)/gi;
export const ROWS_REGEX = /ROWS\s+(\d+)/gi;
export const PARALLEL_REGEX = /PARALLEL\s+(SAFE|RESTRICTED|UNSAFE)/gi;
export const SET_REGEX = /SET\s+(\w+)\s*=\s*([^;]+)/gi;

// CREATE TYPE patterns
export const CREATE_TYPE_REGEX = /^CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s*=/i;
export const CREATE_ENUM_REGEX = /^CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+ENUM\s*\(\s*([^)]+)\s*\)/i;
export const CREATE_RANGE_REGEX = /^CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+RANGE\s*\(/i;
export const CREATE_COMPOSITE_REGEX = /^CREATE\s+TYPE\s+(\w+(?:\.\w+)?)\s+AS\s+\(\s*([^)]+)\s*\)/i;

// CREATE SEQUENCE patterns
export const CREATE_SEQUENCE_REGEX = /^CREATE\s+(TEMP|TEMPORARY)?\s+SEQUENCE\s+(IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*/i;
export const START_WITH_REGEX = /START\s+(WITH\s+)?(\d+)/gi;
export const INCREMENT_BY_REGEX = /INCREMENT\s+(BY\s+)?(-?\d+)/gi;
export const MINVALUE_REGEX = /MINVALUE\s+(-?\d+)/gi;
export const MAXVALUE_REGEX = /MAXVALUE\s+(-?\d+)/gi;
export const CACHE_REGEX = /CACHE\s+(\d+)/gi;
export const ORDER_REGEX = /ORDER/gi;
export const CYCLE_REGEX = /CYCLE/gi;

// CREATE VIEW patterns
export const CREATE_VIEW_REGEX = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:RECURSIVE\s+)?(?:MATERIALIZED\s+)?\s+VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(\([^)]+\))?\s+AS\s+SELECT/i;
export const WITH_OPTIONS_REGEX = /WITH\s*\(\s*([^)]+)\s*\)\s*AS\s+SELECT/i;
export const CHECK_OPTION_REGEX = /WITH\s+CHECK\s+OPTION/gi;

// CREATE POLICY patterns
export const CREATE_POLICY_REGEX = /^CREATE\s+POLICY\s+(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s+AS\s+(PERMISSIVE|RESTRICTIVE)\s+FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\s+TO\s+([\w\s,]+)\s*/i;
export const USING_REGEX = /USING\s*\(\s*([^)]+)\s*\)/gi;
export const WITH_CHECK_REGEX = /WITH\s+CHECK\s*\(\s*([^)]+)\s*\)/gi;

// CREATE TRIGGER patterns
export const CREATE_TRIGGER_REGEX = /^CREATE\s+TRIGGER\s+(\w+(?:\.\w+)?)\s+(BEFORE|AFTER|INSTEAD\s+OF)\s+([\w\s|]+)\s+ON\s+(\w+(?:\.\w+)?)\s+(FROM\s+(\w+(?:\.\w+)?))?\s*$/i;
export const ROW_LEVEL_REGEX = /FOR\s+(EACH\s+)?(ROW|STATEMENT)/gi;
export const WHEN_REGEX = /WHEN\s*\(\s*([^)]+)\s*\)/gi;
export const EXECUTE_REGEX = /EXECUTE\s+FUNCTION\s+(\w+(?:\.\w+)?)\s*\(\s*([^)]*)\s*\)/gi;

// CREATE ROLE patterns
export const CREATE_ROLE_REGEX = /^CREATE\s+ROLE\s+(\w+)\s*/i;
export const LOGIN_REGEX = /LOGIN|NOLOGIN/gi;
export const PASSWORD_REGEX = /PASSWORD\s+(?:'([^']*)'|NULL)/gi;
export const INHERIT_REGEX = /INHERIT|NOINHERIT/gi;
export const SUPERUSER_REGEX = /SUPERUSER|NOSUPERUSER/gi;
export const CREATEDB_REGEX = /CREATEDB|NOCREATEDB/gi;
export const CREATEROLE_REGEX = /CREATEROLE|NOCREATEROLE/gi;
export const REPLICATION_REGEX = /REPLICATION|NOREPLICATION/gi;
export const BYPASSRLS_REGEX = /BYPASSRLS|NOBYPASSRLS/gi;
export const CONNECTION_LIMIT_REGEX = /CONNECTION\s+LIMIT\s+(-?\d+)/gi;
export const VALID_UNTIL_REGEX = /VALID\s+UNTIL\s+'([^']*)'/gi;

// CREATE SCHEMA patterns
export const CREATE_SCHEMA_REGEX = /^CREATE\s+SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?(\w+)\s*(AUTHORIZATION\s+(\w+))?/i;

// CREATE DATABASE patterns
export const CREATE_DATABASE_REGEX = /^CREATE\s+DATABASE\s+(\w+)\s*/i;
export const TEMPLATE_REGEX = /TEMPLATE\s+(\w+)/gi;
export const ENCODING_REGEX = /ENCODING\s+'(\w+)'/gi;
export const LC_COLLATE_REGEX = /LC_COLLATE\s+'([^']*)'/gi;
export const LC_CTYPE_REGEX = /LC_CTYPE\s+'([^']*)'/gi;

// CREATE EXTENSION patterns
export const CREATE_EXTENSION_REGEX = /^CREATE\s+EXTENSION\s+(IF\s+NOT\s+EXISTS\s+)?(\w+)\s*(VERSION\s+['"]?(\w+)['"]?)?\s*(SCHEMA\s+(\w+))?/i;
export const CASCADE_REGEX = /CASCADE/gi;

// CREATE COLLATION patterns
export const CREATE_COLLATION_REGEX = /^CREATE\s+COLLATION\s+(\w+(?:\.\w+)?)\s*\(\s*([^)]+)\s*\)/i;

// CREATE AGGREGATE patterns
export const CREATE_AGGREGATE_REGEX = /^CREATE\s+AGGREGATE\s+(\w+(?:\.\w+)?)\s*\(\s*([^)]+)\s*\)\s*\(\s*([^)]+)\s*\)/i;

// CREATE OPERATOR patterns
export const CREATE_OPERATOR_REGEX = /^CREATE\s+OPERATOR\s+(\w+(?:\.\w+)?)\s*\(\s*([^)]+)\s*\)/i;

// CREATE PROPERTY GRAPH patterns (PG19)
export const CREATE_PROPERTY_GRAPH_REGEX = /^CREATE\s+PROPERTY\s+GRAPH\s+(\w+(?:\.\w+)?)\s*\(/i;
export const VERTEX_REGEX = /VERTEX\s+(\w+)\s+ON\s+(\w+)\s*(\([^)]+\))?/gi;
export const EDGE_REGEX = /EDGE\s+(\w+)\s+ON\s+(\w+)\s*(\([^)]+\))?/gi;
export const KEY_TYPE_REGEX = /KEY\s+TYPE\s+(\w+)/gi;

// CREATE TEMPORAL patterns (PG18)
export const CREATE_PERIOD_REGEX = /PERIOD\s+(\w+)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi;
export const CREATE_SYSTEM_VERSIONING_REGEX = /SYSTEM_VERSIONING\s*=/gi;

// ALTER TABLE patterns (comprehensive)
export const ALTER_TABLE_REGEX = /^ALTER\s+TABLE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*/i;
export const ADD_COLUMN_REGEX = /ADD\s+(COLUMN\s+)?(\w+)\s+([^,]+?)(?:\s+CONSTRAINT\s+(\w+))?(?:\s+NOT\s+NULL)?(?:\s+DEFAULT\s+[^,]+)?(?:\s+REFERENCES\s+[^,]+)?/gi;
export const DROP_COLUMN_REGEX = /DROP\s+(COLUMN\s+)?(\w+)\s+(CASCADE|RESTRICT)?/gi;
export const ALTER_COLUMN_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+(SET\s+DEFAULT\s+[^,]+|DROP\s+DEFAULT|SET\s+NOT\s+NULL|DROP\s+NOT\s+NULL|SET\s+DATA\s+TYPE\s+[^,]+)/gi;
export const ADD_CONSTRAINT_REGEX = /ADD\s+CONSTRAINT\s+(\w+)\s+(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)/gi;
export const DROP_CONSTRAINT_REGEX = /DROP\s+CONSTRAINT\s+(IF\s+EXISTS\s+)?(\w+)\s+(CASCADE|RESTRICT)?/gi;
export const ENABLE_TRIGGER_REGEX = /ENABLE\s+(TRIGGER\s+)?(\w+)/gi;
export const DISABLE_TRIGGER_REGEX = /DISABLE\s+(TRIGGER\s+)?(\w+)/gi;
export const ENABLE_RULE_REGEX = /ENABLE\s+(RULE\s+)?(\w+)/gi;
export const DISABLE_RULE_REGEX = /DISABLE\s+(RULE\s+)?(\w+)/gi;
export const CLUSTER_ON_REGEX = /CLUSTER\s+ON\s+(\w+)/gi;
export const SET_TABLESPACE_REGEX = /SET\s+TABLESPACE\s+(\w+)/gi;
export const SET_SCHEMA_REGEX = /SET\s+SCHEMA\s+(\w+)/gi;
export const REPLICA_REGEX = /REPLICA\s+(USING\s+INDEX|USING\s+ALL|USING\s+PRIMARY_KEY|USING\s+UNIQUE|USING\s+NOTHING|FULL|INDEX)/gi;
export const FORCE_ROW_SECURITY_REGEX = /FORCE\s+ROW\s+SECURITY/gi;
export const NO_FORCE_ROW_SECURITY_REGEX = /NO\s+FORCE\s+ROW\s+SECURITY/gi;
export const ALTER_INHERIT_REGEX = /INHERIT/gi;
export const NO_INHERIT_REGEX = /NO\s+INHERIT/gi;
export const OF_REGEX = /OF\s+(\w+)/gi;
export const ALTER_WITHOUT_OIDS_REGEX = /WITHOUT\s+OIDS/gi;
export const SET_LOGGED_REGEX = /SET\s+LOGGED/gi;
export const SET_UNLOGGED_REGEX = /SET\s+UNLOGGED/gi;
export const SET_ACCESS_METHOD_REGEX = /SET\s+ACCESS\s+METHOD\s+(\w+)/gi;

// ALTER TABLE subcommands for PG18/19
export const ALTER_COLUMN_SET_VARIANT_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+VARIANT/gi;
export const ALTER_COLUMN_DROP_VARIANT_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+DROP\s+VARIANT/gi;
export const ALTER_COLUMN_SET_EXPRESSION_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+EXPRESSION\s+AS\s+\(/gi;
export const ALTER_COLUMN_DROP_EXPRESSION_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+DROP\s+EXPRESSION/gi;
export const ALTER_COLUMN_SET_STORAGE_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+STORAGE\s+(PLAIN|EXTERNAL|EXTENDED|MAIN)/gi;
export const ALTER_COLUMN_SET_STATISTICS_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+STATISTICS\s+(\d+)/gi;
export const ALTER_COLUMN_RESET_STATISTICS_REGEX = /ALTER\s+(COLUMN\s+)?(\w+)\s+RESET\s+STATISTICS/gi;
// Duplicate removed: ALTER_COLUMN_SET_STORAGE_REGEX already defined at line 164

// DROP statements
export const DROP_TABLE_REGEX = /^DROP\s+TABLE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_VIEW_REGEX = /^DROP\s+VIEW\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_INDEX_REGEX = /^DROP\s+INDEX\s+(CONCURRENTLY\s+)?(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_FUNCTION_REGEX = /^DROP\s+FUNCTION\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*\([^)]*\)\s*(CASCADE|RESTRICT)?/i;
export const DROP_TYPE_REGEX = /^DROP\s+TYPE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_SEQUENCE_REGEX = /^DROP\s+SEQUENCE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_SCHEMA_REGEX = /^DROP\s+SCHEMA\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i;
export const DROP_DATABASE_REGEX = /^DROP\s+DATABASE\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i;
export const DROP_ROLE_REGEX = /^DROP\s+ROLE\s+(IF\s+EXISTS\s+)?(\w+)/i;
export const DROP_POLICY_REGEX = /^DROP\s+POLICY\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_TRIGGER_REGEX = /^DROP\s+TRIGGER\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_RULE_REGEX = /^DROP\s+RULE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_EXTENSION_REGEX = /^DROP\s+EXTENSION\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i;
export const DROP_COLLATION_REGEX = /^DROP\s+COLLATION\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;
export const DROP_AGGREGATE_REGEX = /^DROP\s+AGGREGATE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*\([^)]*\)\s*(CASCADE|RESTRICT)?/i;
export const DROP_OPERATOR_REGEX = /^DROP\s+OPERATOR\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*\([^)]*\)\s*(CASCADE|RESTRICT)?/i;
export const DROP_PROPERTY_GRAPH_REGEX = /^DROP\s+PROPERTY\s+GRAPH\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i;

// Additional ALTER statements
export const ALTER_DATABASE_REGEX = /^ALTER\s+DATABASE\s+(\w+)\s+/i;
export const ALTER_FUNCTION_REGEX = /^ALTER\s+FUNCTION\s+(\w+(?:\.\w+)?)\s*\([^)]*\)\s+/i;
export const ALTER_SEQUENCE_REGEX = /^ALTER\s+SEQUENCE\s+(\w+(?:\.\w+)?)\s+/i;
export const ALTER_VIEW_REGEX = /^ALTER\s+VIEW\s+(\w+(?:\.\w+)?)\s+/i;
export const ALTER_TYPE_REGEX = /^ALTER\s+TYPE\s+(\w+(?:\.\w+)?)\s+/i;
export const ALTER_POLICY_REGEX = /^ALTER\s+POLICY\s+(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s+/i;
export const ALTER_TRIGGER_REGEX = /^ALTER\s+TRIGGER\s+(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s+/i;
export const ALTER_RULE_REGEX = /^ALTER\s+RULE\s+(\w+(?:\.\w+)?)\s+ON\s+(\w+(?:\.\w+)?)\s+/i;

// RENAME statements
export const RENAME_TABLE_REGEX = /^RENAME\s+TABLE\s+(\w+(?:\.\w+)?)\s+TO\s+(\w+)/i;
export const RENAME_COLUMN_REGEX = /^ALTER\s+TABLE\s+(\w+(?:\.\w+)?)\s+RENAME\s+(COLUMN\s+)?(\w+)\s+TO\s+(\w+)/i;
export const RENAME_CONSTRAINT_REGEX = /^ALTER\s+TABLE\s+(\w+(?:\.\w+)?)\s+RENAME\s+CONSTRAINT\s+(\w+)\s+TO\s+(\w+)/i;
export const RENAME_INDEX_REGEX = /^RENAME\s+INDEX\s+(\w+(?:\.\w+)?)\s+TO\s+(\w+)/i;
export const RENAME_SCHEMA_REGEX = /^RENAME\s+SCHEMA\s+(\w+)\s+TO\s+(\w+)/i;
export const RENAME_DATABASE_REGEX = /^RENAME\s+DATABASE\s+(\w+)\s+TO\s+(\w+)/i;

// GRANT/REVOKE patterns
export const GRANT_REGEX = /^GRANT\s+([^;]+)\s+ON\s+([^;]+)\s+TO\s+(\w+)/i;
export const REVOKE_REGEX = /^REVOKE\s+([^;]+)\s+ON\s+([^;]+)\s+FROM\s+(\w+)/i;

// VACUUM/ANALYZE patterns
export const VACUUM_REGEX = /^VACUUM\s+(FULL|FREEZE|ANALYZE)?\s*(\w+(?:\.\w+)?)?/i;
export const ANALYZE_REGEX = /^ANALYZE\s*(\w+(?:\.\w+)?)?/i;

// Additional patterns for PG18/19 features
export const MERGE_PARTITION_REGEX = /MERGE\s+PARTITIONS\s+([^;]+)/gi;
export const SPLIT_PARTITION_REGEX = /SPLIT\s+PARTITION\s+(\w+)\s+INTO\s+\(/gi;
export const ATTACH_PARTITION_REGEX = /ATTACH\s+PARTITION\s+(\w+(?:\.\w+)?)\s+FOR\s+VALUES\s*\(/gi;
export const DETACH_PARTITION_REGEX = /DETACH\s+PARTITION\s+(\w+(?:\.\w+)?)\s*(FINALIZE)?/gi;
