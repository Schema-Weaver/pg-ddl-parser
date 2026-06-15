// =============================================================================
// Index Types
// =============================================================================

export interface IndexColumn {
    column: string;
    name?: string;
    order?: 'ASC' | 'DESC';
    direction?: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
    operatorClass?: string;
    collation?: string;
}

export interface Index {
    name: string;
    schema?: string;
    table: string;
    columns: IndexColumn[];
    type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
    method: string;
    isUnique: boolean;
    isPartial: boolean;
    whereClause?: string;
    includeColumns: string[];
    /** PostgreSQL storage parameters */
    with?: IndexWithOptions;
    /** Access method */
    accessMethod?: string;
    /** Index operator classes */
    operatorClasses?: IndexOperatorClass[];
    /** Collation for each column */
    collation?: string[];
    /** NULLS treatment */
    nullsOrder?: ('FIRST' | 'LAST')[];
    /** PG18: Filter predicate for partial indexes */
    filter?: string;
    /** PG18: Concurrent creation */
    concurrently?: boolean;
    /** PG18: If not exists */
    ifNotExists?: boolean;
}

export interface IndexWithOptions {
    fillfactor?: number;
    vacuum_cleanup_index_scale_factor?: number;
    fastupdate?: boolean;
    gin_pending_list_limit?: number;
    deduplicate_items?: boolean;
    pages_per_range?: number;
    autosummarize?: boolean;
    intree?: boolean;
    check_consistency?: boolean;
    [key: string]: string | number | boolean | undefined;
}

export interface IndexOperatorClass {
    column: string;
    name: string;
    options?: string[];
}