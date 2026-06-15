// =============================================================================
// Statistics Types - Extended
// =============================================================================

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
