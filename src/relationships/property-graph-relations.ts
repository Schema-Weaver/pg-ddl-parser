import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';

/**
 * Detect property graph relationships (PG19)
 * Identifies vertex and edge table relationships in property graphs
 */
export function detectPropertyGraphRelations(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    // Property graphs are stored in context.extensions or as separate objects
    // For now, we detect based on property graph table metadata
    
    for (const [tableKey, table] of context.tables.entries()) {
        // Check if table is part of a property graph
        if (table.isPropertyGraphVertex || table.isPropertyGraphEdge) {
            const tableSchema = table.schema || context.currentSchema;
            const tableName = table.name.includes('.') ? table.name.split('.').pop()! : table.name;
            
            // Vertex tables have graph-specific metadata
            if (table.isPropertyGraphVertex && table.graphLabel) {
                // Vertex -> Property Graph relationship
                const relationship: Relationship = {
                    id: `${tableSchema}.${tableName}->${tableSchema}.${table.graphName || 'property_graph'}`,
                    source: {
                        schema: tableSchema,
                        table: tableName
                    },
                    target: {
                        schema: tableSchema,
                        table: table.graphName || 'property_graph'
                    },
                    type: 'PROPERTY_GRAPH_VERTEX',
                    cardinality: 'ONE_TO_MANY',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                    },
                    annotations: ['vertex', `label:${table.graphLabel}`]
                };
                
                relationships.push(relationship);
            }
            
            // Edge tables connect vertex tables
            if (table.isPropertyGraphEdge && table.graphSourceLabel && table.graphTargetLabel) {
                // Resolve actual source vertex table schema
                const sourceTable = Array.from(context.tables.values()).find(t => t.name.endsWith('.' + table.graphSourceLabel) || t.name === table.graphSourceLabel);
                const sSchema = sourceTable ? sourceTable.schema : tableSchema;

                // Edge -> Source Vertex relationship
                const sourceRel: Relationship = {
                    id: `${tableSchema}.${tableName}->${sSchema}.${table.graphSourceLabel}`,
                    source: {
                        schema: tableSchema,
                        table: tableName
                    },
                    target: {
                        schema: sSchema,
                        table: table.graphSourceLabel
                    },
                    type: 'PROPERTY_GRAPH_EDGE',
                    cardinality: 'ONE_TO_MANY',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                    },
                    annotations: ['edge', `source:${table.graphSourceLabel}`]
                };
                
                relationships.push(sourceRel);
                
                // Resolve actual target vertex table schema
                const targetTable = Array.from(context.tables.values()).find(t => t.name.endsWith('.' + table.graphTargetLabel) || t.name === table.graphTargetLabel);
                const tSchema = targetTable ? targetTable.schema : tableSchema;

                // Edge -> Target Vertex relationship
                const targetRel: Relationship = {
                    id: `${tableSchema}.${tableName}->${tSchema}.${table.graphTargetLabel}`,
                    source: {
                        schema: tableSchema,
                        table: tableName
                    },
                    target: {
                        schema: tSchema,
                        table: table.graphTargetLabel
                    },
                    type: 'PROPERTY_GRAPH_EDGE',
                    cardinality: 'ONE_TO_MANY',
                    confidence: 1.0,
                    metadata: {
                        matchMethod: 'parser_match',
                    },
                    annotations: ['edge', `target:${table.graphTargetLabel}`]
                };
                
                relationships.push(targetRel);
            }
        }
    }
    
    return relationships;
}
