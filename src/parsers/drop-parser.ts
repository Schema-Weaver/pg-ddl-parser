import { RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

// =============================================================================
// DROP Statement Parsers (44 DROP statements)
// =============================================================================

export function parseDropTableRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropTable);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TABLE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const tableName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TABLE', tableName: fullName, ifExists, cascade } 
    };
}

export function parseDropViewRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropView);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP VIEW' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const viewName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(viewName, schemaName) : (schemaName ? `${schemaName}.${viewName}` : viewName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_VIEW', viewName: fullName, ifExists, cascade } 
    };
}

export function parseDropIndexRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropIndex);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP INDEX' };
    }

    const concurrently = sql.toUpperCase().includes('CONCURRENTLY');
    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const indexName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(indexName, schemaName) : (schemaName ? `${schemaName}.${indexName}` : indexName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_INDEX', indexName: fullName, concurrently, ifExists, cascade } 
    };
}

export function parseDropFunctionRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropFunction);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP FUNCTION' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const funcName = match[3];
    const schemaName = match[2];
    const params = match[4];
    const cascade = match[5]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(funcName, schemaName) : (schemaName ? `${schemaName}.${funcName}` : funcName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_FUNCTION', functionName: fullName, ifExists, params, cascade } 
    };
}

export function parseDropTypeRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropType);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TYPE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const typeName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(typeName, schemaName) : (schemaName ? `${schemaName}.${typeName}` : typeName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TYPE', typeName: fullName, ifExists, cascade } 
    };
}

export function parseDropSequenceRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropSequence);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP SEQUENCE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const sequenceName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(sequenceName, schemaName) : (schemaName ? `${schemaName}.${sequenceName}` : sequenceName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_SEQUENCE', sequenceName: fullName, ifExists, cascade } 
    };
}

export function parseDropSchemaRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropSchema);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP SCHEMA' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const schemaName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_SCHEMA', schemaName, ifExists, cascade } 
    };
}

export function parseDropDatabaseRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropDatabase);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP DATABASE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const dbName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_DATABASE', dbName, ifExists, cascade } 
    };
}

export function parseDropRoleRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropRole);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP ROLE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const roleName = match[2];

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_ROLE', roleName, ifExists } 
    };
}

export function parseDropPolicyRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropPolicy);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP POLICY' };
    }

    const ifExists = !!match[1];
    const policyName = match[2];
    const schemaName = match[3];
    const tableName = match[4];
    const schemaName2 = match[5];
    const cascade = match[6]?.toUpperCase() === 'CASCADE';

    const fullTableName = context ? context.qualifyName(tableName, schemaName2) : (schemaName2 ? `${schemaName2}.${tableName}` : tableName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_POLICY', policyName, tableName: fullTableName, ifExists, cascade } 
    };
}

export function parseDropTriggerRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropTrigger);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TRIGGER' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const triggerName = match[3];
    const schemaName = match[2];
    const tableName = match[5];
    const schemaName2 = match[4];
    const cascade = sql.toUpperCase().includes('CASCADE') ? 'CASCADE' : 'RESTRICT';

    const fullTableName = context ? context.qualifyName(tableName, schemaName2) : (schemaName2 ? `${schemaName2}.${tableName}` : tableName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TRIGGER', triggerName: schemaName ? `${schemaName}.${triggerName}` : triggerName, tableName: fullTableName, ifExists, cascade } 
    };
}

export function parseDropRuleRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropRule);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP RULE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const ruleName = match[3];
    const schemaName = match[2];
    const tableName = match[5];
    const schemaName2 = match[4];
    const cascade = sql.toUpperCase().includes('CASCADE') ? 'CASCADE' : 'RESTRICT';

    const fullTableName = context ? context.qualifyName(tableName, schemaName2) : (schemaName2 ? `${schemaName2}.${tableName}` : tableName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_RULE', ruleName: schemaName ? `${schemaName}.${ruleName}` : ruleName, tableName: fullTableName, ifExists, cascade } 
    };
}

export function parseDropExtensionRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropExtension);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP EXTENSION' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const extensionName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(extensionName, schemaName) : (schemaName ? `${schemaName}.${extensionName}` : extensionName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_EXTENSION', extensionName: fullName, ifExists, cascade } 
    };
}

export function parseDropCollationRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropCollation);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP COLLATION' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const collationName = match[3];
    const schemaName = match[2];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(collationName, schemaName) : (schemaName ? `${schemaName}.${collationName}` : collationName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_COLLATION', collationName: fullName, ifExists, cascade } 
    };
}

export function parseDropAggregateRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropAggregate);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP AGGREGATE' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const aggregateName = match[3];
    const schemaName = match[2];
    const params = match[4];
    const cascade = match[5]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(aggregateName, schemaName) : (schemaName ? `${schemaName}.${aggregateName}` : aggregateName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_AGGREGATE', aggregateName: fullName, ifExists, params, cascade } 
    };
}

export function parseDropOperatorRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropOperator);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP OPERATOR' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const operatorName = match[3];
    const schemaName = match[2];
    const params = match[4];
    const cascade = match[5]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(operatorName, schemaName) : (schemaName ? `${schemaName}.${operatorName}` : operatorName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_OPERATOR', operatorName: fullName, ifExists, params, cascade } 
    };
}

export function parseDropPropertyGraphRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.dropPropertyGraph);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP PROPERTY GRAPH' };
    }

    const ifExists = sql.toUpperCase().includes('IF EXISTS');
    const graphName = match[3];
    const schemaName = match[2];
    const cascade = sql.toUpperCase().includes('CASCADE') ? 'CASCADE' : 'RESTRICT';

    const fullName = context ? context.qualifyName(graphName, schemaName) : (schemaName ? `${schemaName}.${graphName}` : graphName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_PROPERTY_GRAPH', graphName: fullName, ifExists, cascade } 
    };
}

export function parseDropDomainRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+DOMAIN\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP DOMAIN' };
    }

    const ifExists = !!match[1];
    const domainName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    const schemaName = domainName.includes('.') ? domainName.split('.')[0] : null;
    const simpleName = domainName.includes('.') ? domainName.split('.')[1] : domainName;
    const fullName = context ? context.qualifyName(simpleName, schemaName) : (schemaName ? `${schemaName}.${simpleName}` : simpleName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_DOMAIN', domainName: fullName, ifExists, cascade } 
    };
}

export function parseDropCastRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+CAST\s+\(\s*([^)]+)\s+AS\s+([^)]+)\s*\)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP CAST' };
    }

    const sourceType = match[1];
    const targetType = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_CAST', sourceType, targetType, cascade } 
    };
}

export function parseDropConversionRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+CONVERSION\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP CONVERSION' };
    }

    const ifExists = !!match[1];
    const conversionName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(conversionName, schemaName) : (schemaName ? `${schemaName}.${conversionName}` : conversionName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_CONVERSION', conversionName: fullName, ifExists, cascade } 
    };
}

export function parseDropTransformRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+TRANSFORM\s+FOR\s+(\w+)\s+LANGUAGE\s+(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TRANSFORM' };
    }

    const type = match[1];
    const language = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TRANSFORM', typeName: type, language, cascade } 
    };
}

export function parseDropForeignTableRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+FOREIGN\s+TABLE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP FOREIGN TABLE' };
    }

    const ifExists = !!match[1];
    const tableName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_FOREIGN_TABLE', tableName: fullName, ifExists, cascade } 
    };
}

export function parseDropForeignServerRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+SERVER\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP SERVER' };
    }

    const ifExists = !!match[1];
    const serverName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_SERVER', serverName, ifExists, cascade } 
    };
}

export function parseDropUserMappingRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+USER\s+MAPPING\s+FOR\s+(\w+)\s+SERVER\s+(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP USER MAPPING' };
    }

    const user = match[1];
    const server = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_USER_MAPPING', user, server, cascade } 
    };
}

export function parseDropStatisticRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+STATISTICS\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP STATISTICS' };
    }

    const ifExists = !!match[1];
    const statsName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(statsName, schemaName) : (schemaName ? `${schemaName}.${statsName}` : statsName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_STATISTICS', statsName: fullName, ifExists, cascade } 
    };
}

export function parseDropEventTriggerRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+EVENT\s+TRIGGER\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP EVENT TRIGGER' };
    }

    const ifExists = !!match[1];
    const triggerName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_EVENT_TRIGGER', triggerName, ifExists, cascade } 
    };
}

export function parseDropMaterializedViewRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+MATERIALIZED\s+VIEW\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP MATERIALIZED VIEW' };
    }

    const ifExists = !!match[1];
    const viewName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(viewName, schemaName) : (schemaName ? `${schemaName}.${viewName}` : viewName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_MATERIALIZED_VIEW', viewName: fullName, ifExists, cascade } 
    };
}

export function parseDropSubscriptionRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+SUBSCRIPTION\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP SUBSCRIPTION' };
    }

    const ifExists = !!match[1];
    const subName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_SUBSCRIPTION', subName, ifExists, cascade } 
    };
}

export function parseDropPublicationRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+PUBLICATION\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP PUBLICATION' };
    }

    const ifExists = !!match[1];
    const pubName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_PUBLICATION', pubName, ifExists, cascade } 
    };
}

export function parseDropForeignDataWrapperRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+FOREIGN\s+DATA\s+WRAPPER\s+(IF\s+EXISTS\s+)?(\w+)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP FOREIGN DATA WRAPPER' };
    }

    const ifExists = !!match[1];
    const wrapperName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_FOREIGN_DATA_WRAPPER', wrapperName, ifExists, cascade } 
    };
}

export function parseDropLargeObjectRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+LARGE\s+OBJECT\s+(\d+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP LARGE OBJECT' };
    }

    const oid = parseInt(match[1], 10);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_LARGE_OBJECT', oid } 
    };
}

export function parseDropTextSearchDictionaryRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+TEXT\s+SEARCH\s+DICTIONARY\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TEXT SEARCH DICTIONARY' };
    }

    const ifExists = !!match[1];
    const dictName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(dictName, schemaName) : (schemaName ? `${schemaName}.${dictName}` : dictName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TEXT_SEARCH_DICTIONARY', dictName: fullName, ifExists, cascade } 
    };
}

export function parseDropTextSearchConfigurationRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+TEXT\s+SEARCH\s+CONFIGURATION\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TEXT SEARCH CONFIGURATION' };
    }

    const ifExists = !!match[1];
    const configName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(configName, schemaName) : (schemaName ? `${schemaName}.${configName}` : configName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TEXT_SEARCH_CONFIGURATION', configName: fullName, ifExists, cascade } 
    };
}

export function parseDropTextSearchParserRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+TEXT\s+SEARCH\s+PARSER\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TEXT SEARCH PARSER' };
    }

    const ifExists = !!match[1];
    const parserName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(parserName, schemaName) : (schemaName ? `${schemaName}.${parserName}` : parserName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TEXT_SEARCH_PARSER', parserName: fullName, ifExists, cascade } 
    };
}

export function parseDropTextSearchTemplateRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+TEXT\s+SEARCH\s+TEMPLATE\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP TEXT SEARCH TEMPLATE' };
    }

    const ifExists = !!match[1];
    const templateName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(templateName, schemaName) : (schemaName ? `${schemaName}.${templateName}` : templateName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_TEXT_SEARCH_TEMPLATE', templateName: fullName, ifExists, cascade } 
    };
}

export function parseDropIndexConcurrentlyRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+INDEX\s+CONCURRENTLY\s+(IF\s+EXISTS\s+)?(\w+(?:\.\w+)?)\s*(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP INDEX CONCURRENTLY' };
    }

    const ifExists = !!match[1];
    const indexName = match[2];
    const schemaName = match[3];
    const cascade = match[4]?.toUpperCase() === 'CASCADE';

    const fullName = context ? context.qualifyName(indexName, schemaName) : (schemaName ? `${schemaName}.${indexName}` : indexName);

    return { 
        success: true, 
        confidence: 0.95, 
        data: { type: 'DROP_INDEX_CONCURRENTLY', indexName: fullName, ifExists, cascade } 
    };
}

// =============================================================================
// Main DROP Parser
// =============================================================================

export function parseDropRegex(sql: string, context?: ParseContext): RegexParseResult {
    const sqlUpper = sql.toUpperCase();

    // Try each DROP statement parser
    const parsers = [
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
        parseDropIndexConcurrentlyRegex,
    ];

    for (const parser of parsers) {
        const result = parser(sql, context);
        if (result.success) {
            return result;
        }
    }

    return { success: false, confidence: 0, error: 'Could not match any DROP statement' };
}