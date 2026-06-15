import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';
import {
    detectForeignKeys,
    detectPartitions,
    detectInheritance,
    detectViewDependencies,
    detectTriggerBindings,
    detectSequenceOwnership,
    detectPropertyGraphRelations,
    detectTemporalRelations,
    detectExtensionDependencies,
} from './index';

/**
 * Build final relationships by combining all relationship detection results
 * and deduplicating conflicting relationships
 */
export function buildRelationships(context: ParseContext): Relationship[] {
    // Get all relationships from different detectors
    const fkRelationships = detectForeignKeys(context);
    const partitionRelationships = detectPartitions(context);
    const inheritanceRelationships = detectInheritance(context);
    const viewDependencies = detectViewDependencies(context);
    const triggerBindings = detectTriggerBindings(context);
    const sequenceOwnership = detectSequenceOwnership(context);
    const propertyGraphRelations = detectPropertyGraphRelations(context);
    const temporalRelations = detectTemporalRelations(context);
    const extensionDependencies = detectExtensionDependencies(context);
    
    // Combine all relationships
    let allRelationships: Relationship[] = [
        ...fkRelationships,
        ...partitionRelationships,
        ...inheritanceRelationships,
        ...viewDependencies,
        ...triggerBindings,
        ...sequenceOwnership,
        ...propertyGraphRelations,
        ...temporalRelations,
        ...extensionDependencies
    ];
    
    // Deduplicate relationships by ID
    const seenIds = new Set<string>();
    const uniqueRelationships: Relationship[] = [];
    
    for (const rel of allRelationships) {
        // Ensure unique ID for each relationship
        if (!seenIds.has(rel.id)) {
            seenIds.add(rel.id);
            uniqueRelationships.push(rel);
        }
    }
    
    // Return deduplicated relationships
    return uniqueRelationships;
}

/**
 * Infer potential relationships when explicit ones are missing
 * This is intended as an enhancement for strict mode disabled
 */
export function inferPotentialRelationships(context: ParseContext): Relationship[] {
    // TODO: Implement inference logic for missing relationships
    // For now, return empty array, since this is an advanced feature
    return [];
}