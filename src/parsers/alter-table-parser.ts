import { RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

// =============================================================================
// ALTER TABLE Sub-Command Parsers (50+ sub-commands)
// =============================================================================

export function parseAlterTableAddColumn(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ADD\s+(COLUMN\s+)?(\w+)\s+([^,]+?)(?:\s+CONSTRAINT\s+(\w+))?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD COLUMN' };
    }

    const columnName = match[2];
    const columnType = match[3];
    const constraintName = match[4];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_COLUMN', columnName, columnType, constraintName } 
    };
}

export function parseAlterTableDropColumn(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+(COLUMN\s+)?(\w+)\s+(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP COLUMN' };
    }

    const columnName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_COLUMN', columnName, cascade } 
    };
}

export function parseAlterTableAlterColumn(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+(SET\s+DEFAULT\s+[^,]+|DROP\s+DEFAULT|SET\s+NOT\s+NULL|DROP\s+NOT\s+NULL|SET\s+DATA\s+TYPE\s+[^,]+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ALTER COLUMN' };
    }

    const columnName = match[2];
    const operation = match[3];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ALTER_COLUMN', columnName, operation } 
    };
}

export function parseAlterTableAddConstraint(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ADD\s+CONSTRAINT\s+(\w+)\s+(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD CONSTRAINT' };
    }

    const constraintName = match[1];
    const constraintType = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_CONSTRAINT', constraintName, constraintType } 
    };
}

export function parseAlterTableDropConstraint(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+CONSTRAINT\s+(IF\s+EXISTS\s+)?(\w+)\s+(CASCADE|RESTRICT)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP CONSTRAINT' };
    }

    const constraintName = match[2];
    const cascade = match[3]?.toUpperCase() === 'CASCADE';

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_CONSTRAINT', constraintName, cascade } 
    };
}

export function parseAlterTableEnableTrigger(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ENABLE\s+(TRIGGER\s+)?(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ENABLE TRIGGER' };
    }

    const triggerName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ENABLE_TRIGGER', triggerName } 
    };
}

export function parseAlterTableDisableTrigger(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DISABLE\s+(TRIGGER\s+)?(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DISABLE TRIGGER' };
    }

    const triggerName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DISABLE_TRIGGER', triggerName } 
    };
}

export function parseAlterTableEnableRule(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ENABLE\s+(RULE\s+)?(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ENABLE RULE' };
    }

    const ruleName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ENABLE_RULE', ruleName } 
    };
}

export function parseAlterTableDisableRule(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DISABLE\s+(RULE\s+)?(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DISABLE RULE' };
    }

    const ruleName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DISABLE_RULE', ruleName } 
    };
}

export function parseAlterTableClusterOn(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/CLUSTER\s+ON\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CLUSTER ON' };
    }

    const indexName = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'CLUSTER_ON', indexName } 
    };
}

export function parseAlterTableSetTablespace(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/SET\s+TABLESPACE\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET TABLESPACE' };
    }

    const tablespaceName = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_TABLESPACE', tablespaceName } 
    };
}

export function parseAlterTableSetSchema(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/SET\s+SCHEMA\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET SCHEMA' };
    }

    const schemaName = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_SCHEMA', schemaName } 
    };
}

export function parseAlterTableReplica(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/REPLICA\s+(USING\s+INDEX|USING\s+ALL|USING\s+PRIMARY_KEY|USING\s+NOTHING|FULL|INDEX)\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match REPLICA' };
    }

    const option = match[1];
    const indexName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'REPLICA', option, indexName } 
    };
}

export function parseAlterTableForceRowSecurity(sql: string, context?: ParseContext): RegexParseResult {
    if (!/FORCE\s+ROW\s+SECURITY/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match FORCE ROW SECURITY' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'FORCE_ROW_SECURITY' } 
    };
}

export function parseAlterTableNoForceRowSecurity(sql: string, context?: ParseContext): RegexParseResult {
    if (!/NO\s+FORCE\s+ROW\s+SECURITY/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match NO FORCE ROW SECURITY' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'NO_FORCE_ROW_SECURITY' } 
    };
}

export function parseAlterTableInherit(sql: string, context?: ParseContext): RegexParseResult {
    if (!/INHERIT/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match INHERIT' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'INHERIT' } 
    };
}

export function parseAlterTableNoInherit(sql: string, context?: ParseContext): RegexParseResult {
    if (!/NO\s+INHERIT/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match NO INHERIT' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'NO_INHERIT' } 
    };
}

export function parseAlterTableOf(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/OF\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match OF' };
    }

    const typeName = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'OF', typeName } 
    };
}

export function parseAlterTableWithoutOids(sql: string, context?: ParseContext): RegexParseResult {
    if (!/WITHOUT\s+OIDS/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match WITHOUT OIDS' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'WITHOUT_OIDS' } 
    };
}

export function parseAlterTableSetLogged(sql: string, context?: ParseContext): RegexParseResult {
    if (!/SET\s+LOGGED/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match SET LOGGED' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_LOGGED' } 
    };
}

export function parseAlterTableSetUnlogged(sql: string, context?: ParseContext): RegexParseResult {
    if (!/SET\s+UNLOGGED/i.test(sql)) {
        return { success: false, confidence: 0, error: 'Could not match SET UNLOGGED' };
    }

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_UNLOGGED' } 
    };
}

export function parseAlterTableSetAccessMethod(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/SET\s+ACCESS\s+METHOD\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET ACCESS METHOD' };
    }

    const accessMethod = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_ACCESS_METHOD', accessMethod } 
    };
}

// =============================================================================
// PG18/19 ALTER TABLE Sub-Commands
// =============================================================================

export function parseAlterTableSetVariant(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+VARIANT/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET VARIANT' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_VARIANT', columnName } 
    };
}

export function parseAlterTableDropVariant(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+DROP\s+VARIANT/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP VARIANT' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_VARIANT', columnName } 
    };
}

export function parseAlterTableSetExpression(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+EXPRESSION\s+AS\s+\(/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET EXPRESSION' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_EXPRESSION', columnName } 
    };
}

export function parseAlterTableDropExpression(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+DROP\s+EXPRESSION/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP EXPRESSION' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_EXPRESSION', columnName } 
    };
}

export function parseAlterTableSetStorage(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+STORAGE\s+(PLAIN|EXTERNAL|EXTENDED|MAIN)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET STORAGE' };
    }

    const columnName = match[2];
    const storage = match[3];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_STORAGE', columnName, storage } 
    };
}

export function parseAlterTableSetStatistics(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+STATISTICS\s+(\d+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET STATISTICS' };
    }

    const columnName = match[2];
    const statistics = parseInt(match[3], 10);

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_STATISTICS', columnName, statistics } 
    };
}

export function parseAlterTableResetStatistics(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+RESET\s+STATISTICS/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match RESET STATISTICS' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'RESET_STATISTICS', columnName } 
    };
}

export function parseAlterTableAttachPartition(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ATTACH\s+PARTITION\s+(\w+(?:\.\w+)?)\s+FOR\s+VALUES\s*\(\s*([^)]+)\s*\)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ATTACH PARTITION' };
    }

    const partitionName = match[1];
    const bounds = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ATTACH_PARTITION', partitionName, bounds } 
    };
}

export function parseAlterTableDetachPartition(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DETACH\s+PARTITION\s+(\w+(?:\.\w+)?)\s*(FINALIZE)?/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DETACH PARTITION' };
    }

    const partitionName = match[1];
    const finalize = !!match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DETACH_PARTITION', partitionName, finalize } 
    };
}

export function parseAlterTableMergePartitions(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/MERGE\s+PARTITIONS\s+([^;]+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match MERGE PARTITIONS' };
    }

    const partitions = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'MERGE_PARTITIONS', partitions } 
    };
}

export function parseAlterTableSplitPartition(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/SPLIT\s+PARTITION\s+(\w+)\s+INTO\s+\(/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SPLIT PARTITION' };
    }

    const partitionName = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SPLIT_PARTITION', partitionName } 
    };
}

export function parseAlterTableAddColumnSetVariant(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+VARIANT/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD COLUMN SET VARIANT' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_COLUMN_SET_VARIANT', columnName } 
    };
}

export function parseAlterTableDropColumnCascade(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/DROP\s+(COLUMN\s+)?(\w+)\s+CASCADE/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP COLUMN CASCADE' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_COLUMN_CASCADE', columnName } 
    };
}

export function parseAlterTableAlterColumnType(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+DATA\s+TYPE\s+([^,]+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ALTER COLUMN TYPE' };
    }

    const columnName = match[2];
    const columnType = match[3];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ALTER_COLUMN_TYPE', columnName, columnType } 
    };
}

export function parseAlterTableSetDefault(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+DEFAULT\s+([^,]+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET DEFAULT' };
    }

    const columnName = match[2];
    const defaultValue = match[3];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_DEFAULT', columnName, defaultValue } 
    };
}

export function parseAlterTableDropDefault(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+DROP\s+DEFAULT/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP DEFAULT' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_DEFAULT', columnName } 
    };
}

export function parseAlterTableSetNotNull(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+SET\s+NOT\s+NULL/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match SET NOT NULL' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'SET_NOT_NULL', columnName } 
    };
}

export function parseAlterTableDropNotNull(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ALTER\s+(COLUMN\s+)?(\w+)\s+DROP\s+NOT\s+NULL/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match DROP NOT NULL' };
    }

    const columnName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'DROP_NOT_NULL', columnName } 
    };
}

export function parseAlterTableAddPrimaryKey(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ADD\s+PRIMARY\s+KEY\s*\(\s*([^)]+)\s*\)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD PRIMARY KEY' };
    }

    const columns = match[1].split(',').map(s => s.trim());

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_PRIMARY_KEY', columns } 
    };
}

export function parseAlterTableAddForeignKey(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ADD\s+FOREIGN\s+KEY\s*\(\s*([^)]+)\s*\)\s+REFERENCES\s+(\w+(?:\.\w+)?)\s*\(\s*([^)]+)\s*\)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD FOREIGN KEY' };
    }

    const columns = match[1].split(',').map(s => s.trim());
    const targetTable = match[2];
    const targetColumns = match[3].split(',').map(s => s.trim());

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_FOREIGN_KEY', columns, targetTable, targetColumns } 
    };
}

export function parseAlterTableAddUnique(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ADD\s+UNIQUE\s*\(\s*([^)]+)\s*\)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD UNIQUE' };
    }

    const columns = match[1].split(',').map(s => s.trim());

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_UNIQUE', columns } 
    };
}

export function parseAlterTableAddCheck(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/ADD\s+CHECK\s*\(\s*([^)]+)\s*\)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match ADD CHECK' };
    }

    const expression = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'ADD_CHECK', expression } 
    };
}

export function parseAlterTableRenameColumn(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/RENAME\s+(COLUMN\s+)?(\w+)\s+TO\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match RENAME COLUMN' };
    }

    const oldName = match[2];
    const newName = match[3];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'RENAME_COLUMN', oldName, newName } 
    };
}

export function parseAlterTableRenameConstraint(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/RENAME\s+CONSTRAINT\s+(\w+)\s+TO\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match RENAME CONSTRAINT' };
    }

    const oldName = match[1];
    const newName = match[2];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'RENAME_CONSTRAINT', oldName, newName } 
    };
}

export function parseAlterTableRenameTable(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/RENAME\s+TO\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match RENAME TABLE' };
    }

    const newName = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'RENAME_TABLE', newName } 
    };
}

export function parseAlterTableOwnerTo(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(/OWNER\s+TO\s+(\w+)/i);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match OWNER TO' };
    }

    const owner = match[1];

    return { 
        success: true, 
        confidence: 0.9, 
        data: { type: 'OWNER_TO', owner } 
    };
}