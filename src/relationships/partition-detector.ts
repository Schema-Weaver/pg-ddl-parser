import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';
import { Table } from '../types/tables';

/**
 * Detect partition relationships
 * Identifies parent-child relationships in partitioned tables
 */
export function detectPartitions(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Iterate through all parsed tables
    for (const table of context.tables.values()) {
        // Check if this table is a child partition
        if (table.partitionOf) {
            const targetSchema = table.schema || context.currentSchema;
            const targetTable = table.name.includes('.') ? table.name.split('.').pop()! : table.name;
            
            // Extract parent table name and schema
            let parentTable: string;
            let parentSchema: string | undefined;
            
            // Handle schema-qualified parent table
            if (table.partitionOf.includes('.')) {
                [parentSchema, parentTable] = table.partitionOf.split('.');
            } else {
                parentSchema = context.currentSchema;
                parentTable = table.partitionOf;
            }
            
            // Create parent-child relationship
            const relationship: Relationship = {
                id: `${parentSchema}.${parentTable}->partition.${targetSchema}.${targetTable}`,
                source: {
                    schema: parentSchema,
                    table: parentTable
                },
                target: {
                    schema: targetSchema,
                    table: targetTable
                },
                type: 'PARTITION_CHILD',
                cardinality: 'ONE_TO_MANY',
                sourceType: 'PARSER_MATCH',
                confidence: 0.9, // High confidence in partition structure
                metadata: {
                    matchMethod: 'parser_match',
                    targetTable: parentTable,
                    targetColumns: []
                }
            };
            
            relationships.push(relationship);
        }
    }
    
    return relationships;
}