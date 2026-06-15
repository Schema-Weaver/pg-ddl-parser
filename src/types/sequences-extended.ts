// =============================================================================
// Sequence Types - Extended
// =============================================================================

export interface Sequence {
    name: string;
    schema?: string;
    dataType?: string;
    start?: number;
    increment?: number;
    minValue?: number;
    maxValue?: number;
    cycle?: boolean;
    cache?: number;
    order?: boolean;
    ownedBy?: string;
    comment?: string;
    /** Access method */
    accessMethod?: string;
    /** Storage parameters */
    with?: Record<string, string | number>;
    /** TEMPORARY flag */
    temporary?: boolean;
    /** TEMPORARY auto-drop */
    temporaryAutoDrop?: boolean;
}
