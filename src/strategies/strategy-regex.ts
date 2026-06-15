/**
 * Strategy C: Pattern Match Parser (Regex Fallback)
 *
 * Fallback parser for syntax that pgsql-ast-parser doesn't support:
 * - PARTITION BY / PARTITION OF
 * - GENERATED ALWAYS AS ... STORED
 * - CREATE POLICY with complex USING expressions
 * - Complex CHECK constraints
 * - COMMENT ON statements
 */

import { StatementInfo, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import {
    parseCreateTableRegex,
    parseCreatePolicyRegex,
    parseCreateEnumRegex,
    parseCreateTypeRegex,
    parseCreateViewRegex,
    parseCreateFunctionRegex,
    parseCreateTriggerRegex,
    parseCreateExtensionRegex,
    parseCreateSchemaRegex,
    parseCreateSequenceRegex,
    parseCreateDomainRegex,
    parseCreateIndexRegex,
    parseCreateRoleRegex,
    parseAlterTableRegex,
    parseCreateRuleRegex,
    // New parsers for comprehensive DDL support
    parseCreateMaterializedViewRegex,
    parseCreateProcedureRegex,
    parseCreateAggregateRegex,
    parseCreateOperatorRegex,
    parseCreatePropertyGraphRegex,
    parseCreateTemporalRegex,
    parseCreatePartitionRegex,
    parseCreateIndexExtendedRegex,
    parseCreateConstraintRegex,
    parseCreateTableExtendedRegex,
    parseCreateTypeDefinitionRegex,
    parseCreateSequenceExtendedRegex,
    parseCreateFunctionExtendedRegex,
    parseCreateViewExtendedRegex,
    parseCreateTriggerExtendedRegex,
    parseCreatePolicyExtendedRegex,
    parseCreateRuleExtendedRegex,
    parseCreateStatisticsRegex,
    parseCreateRoleExtendedRegex,
    parseCreateSchemaExtendedRegex,
    parseCreateDatabaseRegex,
    parseCreateCollationRegex,
    // ALTER and DROP parsers
    parseDropRegex,
    // Re-export from existing files
    parseDropTableRegex,
    parseDropViewRegex,
    parseDropIndexRegex,
    parseDropFunctionRegex,
    parseDropTypeRegex,
    parseDropSequenceRegex,
    parseDropSchemaRegex,
    parseDropDatabaseRegex,
    parseDropRoleRegex,
    parseDropPolicyRegex,
    parseDropTriggerRegex,
    parseDropRuleRegex,
    parseDropExtensionRegex,
    parseDropCollationRegex,
    parseDropAggregateRegex,
    parseDropOperatorRegex,
    parseDropPropertyGraphRegex,
    parseDropDomainRegex,
    parseDropCastRegex,
    parseDropConversionRegex,
    parseDropTransformRegex,
    parseDropForeignTableRegex,
    parseDropForeignServerRegex,
    parseDropUserMappingRegex,
    parseDropStatisticRegex,
    parseDropEventTriggerRegex,
    parseDropMaterializedViewRegex,
    parseDropSubscriptionRegex,
    parseDropPublicationRegex,
    parseDropForeignDataWrapperRegex,
    parseDropLargeObjectRegex,
    parseDropTextSearchDictionaryRegex,
    parseDropTextSearchConfigurationRegex,
    parseDropTextSearchParserRegex,
    parseDropTextSearchTemplateRegex,
    parseDropIndexConcurrentlyRegex
} from '../parsers';

// Re-export result type for consumers
export type { RegexParseResult };

// =============================================================================
// Main Parser Functions
// =============================================================================

/**
 * Try to parse a statement using regex patterns
 */
export function tryRegexParse(
    statement: StatementInfo,
    context: ParseContext
): RegexParseResult {
    const sql = statement.text.trim();
    const sqlUpper = sql.toUpperCase();

    switch (statement.type) {
        case 'CREATE_TABLE':
        case 'CREATE_TABLE_PARTITION':
            return parseCreateTableRegex(sql, context);

        case 'CREATE_POLICY':
            return parseCreatePolicyRegex(sql, context);

        case 'CREATE_ENUM':
            return parseCreateEnumRegex(sql, context);

        case 'CREATE_TYPE':
            return parseCreateTypeRegex(sql, context);

        case 'CREATE_VIEW':
        case 'CREATE_MATERIALIZED_VIEW':
            return parseCreateViewExtendedRegex(sql, context) as RegexParseResult;

        case 'CREATE_FUNCTION':
        case 'CREATE_PROCEDURE':
            return parseCreateFunctionRegex(sql, context);

        case 'CREATE_TRIGGER':
            return parseCreateTriggerRegex(sql, context);

        case 'CREATE_EXTENSION':
            return parseCreateExtensionRegex(sql, context);

        case 'CREATE_SCHEMA':
            return parseCreateSchemaRegex(sql);

        case 'CREATE_SEQUENCE':
            return parseCreateSequenceRegex(sql, context);

        case 'CREATE_DOMAIN':
            return parseCreateDomainRegex(sql, context);

        case 'CREATE_INDEX':
            return parseCreateIndexRegex(sql, context);

        case 'CREATE_ROLE':
            return parseCreateRoleRegex(sql, context);

        case 'CREATE_RULE':
            return parseCreateRuleRegex(sql, context);

        case 'CREATE_AGGREGATE':
            return parseCreateAggregateRegex(sql, context);

        case 'ALTER_TABLE':
            return parseAlterTableRegex(sql, context);

        case 'DROP_TABLE':
            return parseDropTableRegex(sql, context);
        case 'DROP_VIEW':
            return parseDropViewRegex(sql, context);
        case 'DROP_INDEX':
            return parseDropIndexRegex(sql, context);
        case 'DROP_FUNCTION':
            return parseDropFunctionRegex(sql, context);
        case 'DROP_TYPE':
            return parseDropTypeRegex(sql, context);
        case 'DROP_SEQUENCE':
            return parseDropSequenceRegex(sql, context);
        case 'DROP_SCHEMA':
            return parseDropSchemaRegex(sql, context);
        case 'DROP_DATABASE':
            return parseDropDatabaseRegex(sql, context);
        case 'DROP_ROLE':
            return parseDropRoleRegex(sql, context);
        case 'DROP_POLICY':
            return parseDropPolicyRegex(sql, context);
        case 'DROP_TRIGGER':
            return parseDropTriggerRegex(sql, context);
        case 'DROP_RULE':
            return parseDropRuleRegex(sql, context);
        case 'DROP_EXTENSION':
            return parseDropExtensionRegex(sql, context);
        case 'DROP_COLLATION':
            return parseDropCollationRegex(sql, context);
        case 'DROP_AGGREGATE':
            return parseDropAggregateRegex(sql, context);
        case 'DROP_OPERATOR':
            return parseDropOperatorRegex(sql, context);
        case 'DROP_PROPERTY_GRAPH':
            return parseDropPropertyGraphRegex(sql, context);
        case 'DROP_DOMAIN':
            return parseDropDomainRegex(sql, context);
        case 'DROP_MATERIALIZED_VIEW':
            return parseDropMaterializedViewRegex(sql, context);

        default:
            // Auto-detect based on SQL text for UNKNOWN types
            return tryAutoDetectParse(sql, sqlUpper, context);
    }
}

/**
 * Auto-detect statement type from SQL text and parse
 */
function tryAutoDetectParse(
    sql: string,
    sqlUpper: string,
    context: ParseContext
): RegexParseResult {
    // Try CREATE TABLE
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('TABLE')) {
        const result = parseCreateTableExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE INDEX
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('INDEX')) {
        const result = parseCreateIndexExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE VIEW
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('VIEW')) {
        const result = parseCreateViewExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE FUNCTION
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('FUNCTION')) {
        const result = parseCreateFunctionExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE TRIGGER
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('TRIGGER')) {
        const result = parseCreateTriggerExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE POLICY
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('POLICY')) {
        const result = parseCreatePolicyExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE TYPE with ENUM
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('TYPE') && sqlUpper.includes('ENUM')) {
        const result = parseCreateTypeDefinitionRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE TYPE (composite)
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('TYPE')) {
        const result = parseCreateTypeDefinitionRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE EXTENSION
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('EXTENSION')) {
        const result = parseCreateExtensionRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE SCHEMA
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('SCHEMA')) {
        const result = parseCreateSchemaExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE SEQUENCE
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('SEQUENCE')) {
        const result = parseCreateSequenceExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE DOMAIN
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('DOMAIN')) {
        const result = parseCreateDomainRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE ROLE / USER
    if (sqlUpper.includes('CREATE') && (sqlUpper.includes('ROLE') || sqlUpper.includes('USER'))) {
        const result = parseCreateRoleExtendedRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE MATERIALIZED VIEW
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('MATERIALIZED') && sqlUpper.includes('VIEW')) {
        const result = parseCreateMaterializedViewRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE PROCEDURE
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('PROCEDURE')) {
        const result = parseCreateProcedureRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE AGGREGATE
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('AGGREGATE')) {
        const result = parseCreateAggregateRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE OPERATOR
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('OPERATOR')) {
        const result = parseCreateOperatorRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE PROPERTY GRAPH
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('PROPERTY') && sqlUpper.includes('GRAPH')) {
        const result = parseCreatePropertyGraphRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE TEMPORAL TABLE (PERIOD SYSTEM_TIME)
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('TABLE') && sqlUpper.includes('PERIOD')) {
        const result = parseCreateTemporalRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE COLLATION
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('COLLATION')) {
        const result = parseCreateCollationRegex(sql, context);
        if (result.success) return result;
    }

    // Try CREATE DATABASE
    if (sqlUpper.includes('CREATE') && sqlUpper.includes('DATABASE')) {
        const result = parseCreateDatabaseRegex(sql, context);
        if (result.success) return result;
    }

    // Try ALTER TABLE ENABLE ROW LEVEL SECURITY
    if (sqlUpper.includes('ALTER') && sqlUpper.includes('TABLE') && sqlUpper.includes('ROW LEVEL SECURITY')) {
        const result = parseAlterTableRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP TABLE
    if (sqlUpper.includes('DROP') && sqlUpper.includes('TABLE')) {
        const result = parseDropTableRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP VIEW
    if (sqlUpper.includes('DROP') && sqlUpper.includes('VIEW')) {
        const result = parseDropViewRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP INDEX
    if (sqlUpper.includes('DROP') && sqlUpper.includes('INDEX')) {
        const result = parseDropIndexRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP FUNCTION
    if (sqlUpper.includes('DROP') && sqlUpper.includes('FUNCTION')) {
        const result = parseDropFunctionRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP TYPE
    if (sqlUpper.includes('DROP') && sqlUpper.includes('TYPE')) {
        const result = parseDropTypeRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP SEQUENCE
    if (sqlUpper.includes('DROP') && sqlUpper.includes('SEQUENCE')) {
        const result = parseDropSequenceRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP SCHEMA
    if (sqlUpper.includes('DROP') && sqlUpper.includes('SCHEMA')) {
        const result = parseDropSchemaRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP DATABASE
    if (sqlUpper.includes('DROP') && sqlUpper.includes('DATABASE')) {
        const result = parseDropDatabaseRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP ROLE
    if (sqlUpper.includes('DROP') && sqlUpper.includes('ROLE')) {
        const result = parseDropRoleRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP EXTENSION
    if (sqlUpper.includes('DROP') && sqlUpper.includes('EXTENSION')) {
        const result = parseDropExtensionRegex(sql, context);
        if (result.success) return result;
    }

    // Try DROP MATERIALIZED VIEW
    if (sqlUpper.includes('DROP') && sqlUpper.includes('MATERIALIZED') && sqlUpper.includes('VIEW')) {
        const result = parseDropMaterializedViewRegex(sql, context);
        if (result.success) return result;
    }

    return { success: false, confidence: 0, error: 'No matching pattern found' };
}