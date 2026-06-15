// =============================================================================
// Type Definition Types
// =============================================================================



export interface RangeType {
    name: string;
    schema?: string;
    subtype: string;
    subtypeOpclass?: string;
    collation?: string;
    canonical?: string;
    subdiff?: string;
}

export interface BaseType {
    name: string;
    schema?: string;
    input: string;
    output: string;
    receive?: string;
    send?: string;
    typmodIn?: string;
    typmodOut?: string;
    analyze?: string;
    internallength?: number;
    externallength?: number;
    inputcategory?: string;
    delimiter?: string;
    element?: string;
    default?: string;
    align?: 'char' | 'int2' | 'int4' | 'double' | 'solidint';
    storage?: 'plain' | 'external' | 'extended' | 'main';
    category?: string;
    preferred?: boolean;
    deprecated?: boolean;
    elementtype?: string;
    arrayElemType?: string;
    arrayBoundInfo?: string;
}
