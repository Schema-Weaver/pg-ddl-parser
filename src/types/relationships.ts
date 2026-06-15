// =============================================================================
// Relationships
// =============================================================================

export type RelationshipType =
    | 'FOREIGN_KEY'
    | 'TEMPORAL_FK'
    | 'TEMPORAL_PK'
    | 'WITHOUT_OVERLAPS'
    | 'PERIOD'
    | 'PARTITION_CHILD'
    | 'VIEW_DEPENDENCY'
    | 'TRIGGER_TARGET'
    | 'TRIGGER_FUNCTION'
    | 'POLICY_TARGET'
    | 'CALLS'
    | 'DEPENDS_ON'
    | 'OWNS_POLICY'
    | 'APPLIES_TO'
    | 'HAS_SEQUENCE'
    | 'PROPERTY_GRAPH_VERTEX'
    | 'PROPERTY_GRAPH_EDGE'
    | 'PROPERTY_GRAPH_PATH'
    | 'INFERRED'
    | 'INHERITANCE'
    | 'PARTITION_PARENT';

export type Cardinality = '1:1' | '1:N' | 'N:M' | 'UNKNOWN';

export interface Relationship {
    id: string;
    source: {
        schema?: string;
        table: string;
        column?: string;
    };
    target: {
        schema?: string;
        table: string;
        column?: string;
    };
    type: RelationshipType;
    cardinality?: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY' | 'UNKNOWN';
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';

    /** Metadata about the reliability of this relationship */
    sourceType?: 'EXPLICIT_FK' | 'INFERRED_VIEW' | 'INFERRED_TRIGGER' | 'PARSER_MATCH';
    confidence: number; // 0.0 - 1.0
    metadata?: {
        isFuzzyMatch?: boolean;
        matchMethod?: 'regex' | 'ast' | 'parser_match';
        /** For temporal relationships */
        periodColumn?: string;
        targetTable?: string;
        targetColumns?: string[];
    };
    annotations?: string[];
}