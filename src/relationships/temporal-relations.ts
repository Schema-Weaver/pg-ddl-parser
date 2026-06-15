import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';

/**
 * Detect temporal relationships (PERIOD clauses)
 * Identifies temporal primary keys and foreign keys with PERIOD columns
 */
export function detectTemporalRelations(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    for (const [tableKey, table] of context.tables.entries()) {
        const tableSchema = table.schema || context.currentSchema;
        const tableName = table.name.includes('.') ? table.name.split('.').pop()! : table.name;
        
        // Check for temporal PK (WITHOUT OVERLAPS)
        for (const constraint of table.constraints || []) {
            if ((constraint.type === 'PRIMARY KEY' || constraint.type === 'EXCLUDE' || constraint.type === 'UNIQUE') && constraint.withoutOverlaps) {
                // Create WITHOUT_OVERLAPS relationship
                const relationship: Relationship = {
                    id: `${tableSchema}.${tableName}.WITHOUT_OVERLAPS`,
                    source: {
                        schema: tableSchema,
                        table: tableName
                    },
                    target: {
                        schema: tableSchema,
                        table: tableName
                    },
                    type: 'TEMPORAL_PK',
                    cardinality: 'ONE_TO_ONE',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                    },
                    annotations: ['temporal_pk', `columns:${constraint.columns?.join(',') || ''}`]
                };
                
                relationships.push(relationship);
            }
            
            // Check for PERIOD temporal FK
            if (constraint.type === 'FOREIGN KEY' && constraint.periodColumn) {
                let targetTable: string;
                let targetSchema: string | undefined;
                
                if (constraint.targetTable?.includes('.')) {
                    [targetSchema, targetTable] = constraint.targetTable.split('.');
                } else {
                    targetSchema = context.currentSchema;
                    targetTable = constraint.targetTable || '';
                }
                
                // Create PERIOD relationship
                const relationship: Relationship = {
                    id: `${tableSchema}.${tableName}.PERIOD->${targetSchema}.${targetTable}`,
                    source: {
                        schema: tableSchema,
                        table: tableName,
                        column: constraint.periodColumn
                    },
                    target: {
                        schema: targetSchema,
                        table: targetTable
                    },
                    type: 'TEMPORAL_FK',
                    cardinality: 'MANY_TO_ONE',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                        periodColumn: constraint.periodColumn,
                        targetTable: constraint.targetTable
                    },
                    annotations: ['temporal_fk', `period:${constraint.periodColumn}`]
                };
                
                relationships.push(relationship);
            }
        }
        
        // Check inline PERIOD in column definitions
        for (const column of table.columns || []) {
            const isRangeType = ['tstzrange', 'daterange', 'tsrange', 'tstzmultirange', 'datemultirange', 'int4range', 'int8range', 'numrange'].includes(column.type.toLowerCase()) || column.type.toLowerCase().includes('range');
            if ((column as any).period || isRangeType) {
                // Column has PERIOD clause
                const relationship: Relationship = {
                    id: `${tableSchema}.${tableName}.${column.name}.PERIOD`,
                    source: {
                        schema: tableSchema,
                        table: tableName,
                        column: column.name
                    },
                    target: {
                        schema: tableSchema,
                        table: tableName
                    },
                    type: 'PERIOD',
                    cardinality: 'ONE_TO_ONE',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                    },
                    annotations: ['temporal_period_column']
                };
                
                relationships.push(relationship);
            }
        }
    }
    
    return relationships;
}
