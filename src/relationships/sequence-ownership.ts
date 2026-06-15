import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';

/**
 * Detect sequence ownership relationships
 * Identifies which columns own which sequences (for SERIAL/IDENTITY)
 */
export function detectSequenceOwnership(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Process implicit sequences for serial columns
    for (const table of context.tables.values()) {
        const tableSchema = table.schema || context.currentSchema;
        const tableName = table.name.includes('.') ? table.name.split('.').pop()! : table.name;
        
        for (const col of table.columns) {
            if (/serial/i.test(col.type)) {
                const seqName = `${tableName}_${col.name}_seq`;
                const fullSeqName = context.qualifyName(seqName, tableSchema);
                
                if (!context.sequences.has(fullSeqName)) {
                    context.sequences.set(fullSeqName, {
                        name: fullSeqName,
                        schema: tableSchema,
                        ownedBy: `${table.name}.${col.name}`
                    });
                }
            }
        }
    }
    
    for (const [seqKey, sequence] of context.sequences.entries()) {
        const seqSchema = sequence.schema || context.currentSchema;
        const seqName = sequence.name.includes('.') ? sequence.name.split('.').pop()! : sequence.name;
        
        // Sequence owned by a table column
        if (sequence.ownedBy) {
            let targetTable: string;
            let targetSchema: string | undefined;
            let targetColumn: string;
            
            // ownedBy format: "schema.table.column" or "table.column"
            const parts = sequence.ownedBy.split('.');
            
            if (parts.length === 3) {
                [targetSchema, targetTable, targetColumn] = parts;
            } else if (parts.length === 2) {
                targetSchema = context.currentSchema;
                [targetTable, targetColumn] = parts;
            } else {
                continue;
            }
            
            const tableKey = context.qualifyName(targetTable, targetSchema);
            
            // Sequence -> Table.Column relationship
            const relationship: Relationship = {
                id: `${seqSchema}.${seqName}->${targetSchema}.${targetTable}.${targetColumn}`,
                source: {
                    schema: seqSchema,
                    table: seqName
                },
                target: {
                    schema: targetSchema,
                    table: targetTable,
                    column: targetColumn
                },
                type: 'HAS_SEQUENCE',
                cardinality: 'ONE_TO_ONE',
                confidence: 1.0,
                metadata: {
                    matchMethod: 'parser_match',
                },
                annotations: [`owned_by:${sequence.ownedBy}`]
            };
            
            relationships.push(relationship);
        }
    }
    
    return relationships;
}
