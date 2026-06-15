import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';
import { Table } from '../types/tables';

/**
 * Detect foreign key relationships between tables
 * Identifies relationships based on Table.foreignKeys arrays
 */
export function detectForeignKeys(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Iterate through all parsed tables
    for (const table of context.tables.values()) {
        const sourceSchema = table.schema || context.currentSchema;
        const sourceTable = table.name.includes('.') ? table.name.split('.').pop()! : table.name;

        // 1. Check each foreign key constraint in the table
        for (const fk of table.foreignKeys) {
            // Check if foreign key specifies target table properly
            if (!fk.targetTable) {
                continue;
            }
            
            // Extract target table info
            let targetTable: string;
            let targetSchema: string | undefined;
            
            // Handle schema-qualified target table
            if (fk.targetTable.includes('.')) {
                [targetSchema, targetTable] = fk.targetTable.split('.');
            } else {
                targetSchema = context.currentSchema; // Assume current schema if none specified
                targetTable = fk.targetTable;
            }
            
            // Resolve target table - it might not exist yet if defined later
            if (!context.tables.has(fk.targetTable)) {
                // Check if we have a table with that qualified name
                const qualTarget = context.qualifyName(targetTable, targetSchema);
                if (!context.tables.has(qualTarget)) {
                    // If target table isn't available yet, skip this FK for now
                    // It will be detected when the target table is processed
                    continue;
                }
            }
            
            // For each column in the foreign key constraint
            for (let i = 0; i < fk.columns.length; i++) {
                const sourceColumn = fk.columns[i];
                
                // Target column (if specified) or same position
                let targetColumn: string;
                if (i < fk.targetColumns.length) {
                    targetColumn = fk.targetColumns[i];
                } else {
                    // If not specified, it's likely one-to-one column matching
                    targetColumn = sourceColumn;
                }
                
                // Create the relationship
                const relationship: Relationship = {
                    id: `${sourceSchema}.${sourceTable}.${sourceColumn}->${targetSchema}.${targetTable}.${targetColumn}`,
                    source: {
                        schema: sourceSchema,
                        table: sourceTable,
                        column: sourceColumn
                    },
                    target: {
                        schema: targetSchema,
                        table: targetTable,
                        column: targetColumn
                    },
                    type: 'FOREIGN_KEY',
                    cardinality: 'MANY_TO_ONE',
                    onDelete: fk.onDelete as any,
                    onUpdate: fk.onUpdate as any,
                    sourceType: 'EXPLICIT_FK',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                    }
                };
                
                relationships.push(relationship);
            }
        }

        // 2. Check inline column-level references (e.g. col REFERENCES target(id))
        for (const column of table.columns) {
            if (column.references) {
                const ref = column.references;
                const targetTable = ref.table.includes('.') ? ref.table.split('.').pop()! : ref.table;
                const targetSchema = ref.schema || context.currentSchema;
                
                const targetColumns = Array.isArray(ref.column) ? ref.column : [ref.column];
                
                for (const targetColumn of targetColumns) {
                    const sourceColumn = column.name;
                    
                    const relationship: Relationship = {
                        id: `${sourceSchema}.${sourceTable}.${sourceColumn}->${targetSchema}.${targetTable}.${targetColumn}`,
                        source: {
                            schema: sourceSchema,
                            table: sourceTable,
                            column: sourceColumn
                        },
                        target: {
                            schema: targetSchema,
                            table: targetTable,
                            column: targetColumn
                        },
                        type: 'FOREIGN_KEY',
                        cardinality: 'MANY_TO_ONE',
                        onDelete: ref.onDelete as any,
                        onUpdate: ref.onUpdate as any,
                        sourceType: 'EXPLICIT_FK',
                        confidence: 1.0,
                        metadata: {
                            matchMethod: 'parser_match',
                        }
                    };
                    
                    relationships.push(relationship);
                }
            }
        }
    }
    
    return relationships;
}