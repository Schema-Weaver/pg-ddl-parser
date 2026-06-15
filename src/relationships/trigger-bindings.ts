import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';

/**
 * Detect trigger bindings
 * Identifies relationships between triggers, tables, and functions
 */
export function detectTriggerBindings(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    
    for (const [triggerKey, trigger] of context.triggers.entries()) {
        const triggerSchema = trigger.schema || context.currentSchema;
        const triggerName = trigger.name.includes('.') ? trigger.name.split('.').pop()! : trigger.name;
        
        // Trigger is bound to a table
        if (trigger.table) {
            let targetTable: string;
            let targetSchema: string | undefined;
            
            if (trigger.table.includes('.')) {
                [targetSchema, targetTable] = trigger.table.split('.');
            } else {
                targetSchema = context.currentSchema;
                targetTable = trigger.table;
            }
            
            const tableKey = context.qualifyName(targetTable, targetSchema);
            
            // Trigger -> Table relationship
            const relationship1: Relationship = {
                id: `${triggerSchema}.${triggerName}->${targetSchema}.${targetTable}`,
                source: {
                    schema: triggerSchema,
                    table: triggerName
                },
                target: {
                    schema: targetSchema,
                    table: targetTable
                },
                type: 'TRIGGER_TARGET',
                cardinality: 'ONE_TO_ONE',
                confidence: 1.0,
                metadata: {
                    matchMethod: 'parser_match',
                },
                annotations: [trigger.timing, trigger.event]
            };
            
            relationships.push(relationship1);
        }
        
        // Trigger calls/uses a function
        if (trigger.functionName) {
            let funcTable: string;
            let funcSchema: string | undefined;
            
            if (trigger.functionName.includes('.')) {
                [funcSchema, funcTable] = trigger.functionName.split('.');
            } else {
                funcSchema = context.currentSchema;
                funcTable = trigger.functionName;
            }
            
            const funcKey = context.qualifyName(funcTable, funcSchema);
            
            // Trigger -> Function relationship
            const relationship2: Relationship = {
                id: `${triggerSchema}.${triggerName}->${funcSchema}.${funcTable}`,
                source: {
                    schema: triggerSchema,
                    table: triggerName
                },
                target: {
                    schema: funcSchema,
                    table: funcTable
                },
                type: 'TRIGGER_FUNCTION',
                cardinality: 'ONE_TO_ONE',
                confidence: 1.0,
                metadata: {
                    matchMethod: 'parser_match',
                },
                annotations: trigger.arguments ? [...trigger.arguments] : undefined
            };
            
            relationships.push(relationship2);
        }
    }
    
    return relationships;
}
