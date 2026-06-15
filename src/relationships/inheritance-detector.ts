import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';
import { Table } from '../types/tables';

/**
 * Detect table inheritance relationships
 * Identifies parent-child inheritance relationships in tables
 */
export function detectInheritance(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Iterate through all parsed tables
    for (const table of context.tables.values()) {
        // Check if this table inherits from another table
        if (table.inheritsFrom) {
            const targetSchema = table.schema || context.currentSchema;
            const targetTable = table.name.includes('.') ? table.name.split('.').pop()! : table.name;
            
            // Extract parent table name and schema
            let parentTable: string;
            let parentSchema: string | undefined;
            
            // Handle schema-qualified parent table
            if (table.inheritsFrom.includes('.')) {
                [parentSchema, parentTable] = table.inheritsFrom.split('.');
            } else {
                parentSchema = context.currentSchema;
                parentTable = table.inheritsFrom;
            }
            
            // Create parent-child relationship
            const relationship: Relationship = {
                id: `${parentSchema}.${parentTable}->inherits.${targetSchema}.${targetTable}`,
                source: {
                    schema: parentSchema,
                    table: parentTable
                },
                target: {
                    schema: targetSchema,
                    table: targetTable
                },
                type: 'INHERITANCE', // Inherited tables typically don't have explicit FKs
                cardinality: 'ONE_TO_MANY',
                sourceType: 'PARSER_MATCH',
                confidence: 0.85, // High confidence but lower than FK since inference
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