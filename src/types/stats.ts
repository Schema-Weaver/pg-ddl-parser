// =============================================================================
// Schema Statistics
// =============================================================================

import { DataTypeCategory } from './base';

export interface PostgresStats {
    dataTypes: Map<DataTypeCategory, number>;
    primaryKeys: number;
    foreignKeys: number;
    uniqueConstraints: number;
    checkConstraints: number;
    notNullConstraints: number;
    indexTypes: Map<string, number>;
    generatedColumns: number;
    defaultValues: number;
    partitionedTables: number;
    childPartitions: number;
    temporaryTables: number;
    inheritedTables: number;
    rlsPolicies: number;
    withoutOverlapsConstraints: number;
    periodTemporalConstraints: number;
    temporalTables: number;
}

export interface Statistics {
    name: string;
    schema?: string;
    columns: string[];
    kind: string;
    target?: number;
    expression?: string;
    /** Dependencies */
    dependencies?: string[];
    /** Most common values */
    mostCommonVals?: boolean;
    /** Most common frequencies */
    mostCommonFreqs?: boolean;
    /** Histogram bounds */
    histogramBounds?: boolean;
    /** Correlation */
    correlation?: boolean;
}