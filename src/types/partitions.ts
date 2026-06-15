// =============================================================================
// Partition Types
// =============================================================================

export interface Partition {
    name: string;
    schema?: string;
    parentTable: string;
    partitionType: 'range' | 'list' | 'hash';
    partitionKey: string[];
    partitionBounds?: PartitionBounds;
    tablespace?: string;
    comment?: string;
    /** PG19: Subpartition template */
    subpartitionTemplate?: PartitionTemplate;
}

export interface PartitionBounds {
    from?: string | string[];
    to?: string | string[];
    in?: string[];
    forValues?: string;
}

export interface PartitionTemplate {
    partitionType: 'range' | 'list' | 'hash';
    partitionKey: string[];
    partitions?: Partition[];
}
