// =============================================================================
// Operator Types
// =============================================================================

export interface Operator {
    name: string;
    schema?: string;
    leftType?: string;
    rightType: string;
    procedure: string;
    commutator?: string;
    negator?: string;
    restrict?: string;
    join?: string;
    hashes?: boolean;
    merges?: boolean;
}
