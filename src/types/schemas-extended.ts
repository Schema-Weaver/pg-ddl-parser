// =============================================================================
// Schema Types - Extended
// =============================================================================

export interface Schema {
    name: string;
    authorization?: string;
    /** Default character set */
    charset?: string;
    /** Default collation */
    collation?: string;
    /** Comments */
    comment?: string;
}
