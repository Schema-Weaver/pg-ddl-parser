// =============================================================================
// Database Types - Extended
// =============================================================================

export interface Database {
    name: string;
    owner?: string;
    template?: string;
    encoding?: string;
    lcCollate?: string;
    lcCtype?: string;
    tablespace?: string;
    allowConnections?: boolean;
    connectionLimit?: number;
    isTemplate?: boolean;
    /** Comments */
    comment?: string;
}
