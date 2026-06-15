import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';

/**
 * Detect view dependencies
 * Identifies relationships where views depend on tables/columns
 */
export function detectViewDependencies(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    for (const [viewKey, view] of context.views.entries()) {
        const viewSchema = view.schema || context.currentSchema;
        const viewName = view.name.includes('.') ? view.name.split('.').pop()! : view.name;
        
        const definedOn = new Set<string>(view.definedOn || []);
        
        if (definedOn.size === 0 && view.query) {
            const allTargets = [
                ...Array.from(context.tables.keys()),
                ...Array.from(context.views.keys())
            ];
            
            for (const targetKey of allTargets) {
                if (targetKey === viewKey) continue;
                
                const targetParts = targetKey.split('.');
                const targetName = targetParts[targetParts.length - 1];
                
                const regex = new RegExp(`\\b${targetName}\\b`, 'i');
                if (regex.test(view.query)) {
                    definedOn.add(targetKey);
                }
            }
        }
        
        // View depends on tables used in its definition
        if (definedOn.size > 0) {
            for (const tableRef of definedOn) {
                let targetTable: string;
                let targetSchema: string | undefined;
                
                if (tableRef.includes('.')) {
                    [targetSchema, targetTable] = tableRef.split('.');
                } else {
                    targetSchema = context.currentSchema;
                    targetTable = tableRef;
                }
                
                const targetKey = context.qualifyName(targetTable, targetSchema);
                
                // Create relationship from view to table (view depends on table)
                const relationship: Relationship = {
                    id: `${viewSchema}.${viewName}->${targetSchema}.${targetTable}`,
                    source: {
                        schema: viewSchema,
                        table: viewName
                    },
                    target: {
                        schema: targetSchema,
                        table: targetTable
                    },
                    type: 'VIEW_DEPENDENCY',
                    cardinality: 'UNKNOWN',
                    confidence: 0.9,
                    metadata: {
                        matchMethod: 'parser_match',
                    }
                };
                
                relationships.push(relationship);
            }
        }
        
        // View column dependencies (if available)
        if (view.columns && view.columns.length > 0) {
            for (const col of view.columns) {
                if (typeof col !== 'string') {
                    if (col.dependencies && col.dependencies.length > 0) {
                        for (const dep of col.dependencies) {
                            let depTable: string;
                            let depSchema: string | undefined;
                            
                            if (dep.table.includes('.')) {
                                [depSchema, depTable] = dep.table.split('.');
                            } else {
                                depSchema = context.currentSchema;
                                depTable = dep.table;
                            }
                            
                            const depKey = context.qualifyName(depTable, depSchema);
                            
                            const relationship: Relationship = {
                                id: `${viewSchema}.${viewName}.${col.name}->${depSchema}.${depTable}.${dep.column}`,
                                source: {
                                    schema: viewSchema,
                                    table: viewName,
                                    column: col.name
                                },
                                target: {
                                    schema: depSchema,
                                    table: depTable,
                                    column: dep.column
                                },
                                type: 'VIEW_DEPENDENCY',
                                cardinality: 'UNKNOWN',
                                confidence: 0.8,
                                metadata: {
                                    matchMethod: 'parser_match',
                                }
                            };
                            
                            relationships.push(relationship);
                        }
                    }
                }
            }
        }
    }
    
    return relationships;
}
