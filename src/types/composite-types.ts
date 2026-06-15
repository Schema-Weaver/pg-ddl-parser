// =============================================================================
// Composite Types
// =============================================================================

export interface CompositeType {
    name: string;
    schema?: string;
    attributes: CompositeTypeAttribute[];
    fields?: { name: string; type: string }[];
    columns?: { name: string; type: string }[];
    /** PG14+: multirange type variant */
    kind?: 'composite' | 'multirange' | 'range';
    subtype?: string;
}

export interface CompositeTypeAttribute {
    name: string;
    type: string;
    default?: string;
}