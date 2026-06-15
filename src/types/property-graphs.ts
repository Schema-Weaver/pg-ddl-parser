// =============================================================================
// Property Graph Types (PG19)
// =============================================================================

export interface PropertyGraph {
    name: string;
    schema?: string;
    vertices?: PropertyGraphVertex[];
    edges?: PropertyGraphEdge[];
    keyType?: string;
    properties?: PropertyGraphProperty[];
}

export interface PropertyGraphVertex {
    name: string;
    table: string;
    idExpression?: string;
    properties?: PropertyGraphProperty[];
}

export interface PropertyGraphEdge {
    name: string;
    table: string;
    sourceExpression?: string;
    targetExpression?: string;
    properties?: PropertyGraphProperty[];
}

export interface PropertyGraphProperty {
    name: string;
    type: string;
    expression?: string;
}
