// =============================================================================
// Table Types
// =============================================================================

import { Column } from './columns';
import { VerificationLevel } from './base';
import { TemporalPeriod } from './temporal';
import { PartitionBounds } from './partitions';

export interface Table {
    name: string;
    schema?: string;
    columns: Column[];
    isPartitioned: boolean;
    partitionType?: 'range' | 'list' | 'hash';
    partitionKey?: string[];
    partitionOf?: string; // Parent table for child partitions
    partitionBounds?: PartitionBounds;
    inheritsFrom?: string;
    isTemporary: boolean;
    isUnlogged: boolean;
    checkConstraints: NamedConstraint[];
    uniqueConstraints: NamedConstraint[];
    primaryKey?: TableLevelPrimaryKey;
    foreignKeys: TableLevelForeignKey[];
    constraints?: any[];
    comment?: string;
    confidence: number; // 0-1 parsing confidence
    verificationLevel?: VerificationLevel;
    rlsEnabled?: boolean;
    /** PG18: Temporal constraints */
    temporalConstraints?: TemporalConstraint[];
    /** PG19: Property graph vertex/edge indicators */
    isVertex?: boolean;
    isEdge?: boolean;
    isPropertyGraphVertex?: boolean;
    isPropertyGraphEdge?: boolean;
    graphLabel?: string;
    graphName?: string;
    graphSourceLabel?: string;
    graphTargetLabel?: string;
    /** Table-level options */
    with?: Record<string, string | number>;
    /** Table access method */
    accessMethod?: string;
    /** Tablespaces */
    tablespace?: string;
    partitionTablespace?: string;
    /** ON COMMIT behavior for temporary tables */
    onCommit?: 'PRESERVE_ROWS' | 'DELETE_ROWS' | 'DROP';
    /** CREATE TABLE AS SELECT (CTAS) */
    createAs?: boolean;
    /** SELECT query for CTAS tables */
    asQuery?: string;
    /** OIDs option */
    withOids?: boolean;
    withoutOids?: boolean;
    /** INHERITS clause */
    inherits?: string[];
    /** LIKE clause */
    likeTable?: string;
    likeOptions?: string[];
    /** OF clause (typed tables) */
    ofType?: string;
    /** TEMPORARY/UNLOGGED */
    temporary?: 'LOCAL' | 'GLOBAL' | undefined;
    temporaryAutoDrop?: boolean;
    /** PG18: PERIOD temporal table */
    period?: TemporalPeriod;
    /** PG18: WITHOUT OVERLAPS */
    withoutOverlaps?: boolean;
    /** PG18: SYSTEM_VERSIONING for temporal tables */
    withSystemVersioning?: boolean;
    /** PG19: Property graph */
    propertyGraph?: PropertyGraphTable;
}

export interface PropertyGraphTable {
    type: 'VERTEX' | 'EDGE';
    name?: string;
    idExpression?: string;
    properties?: PropertyGraphTableProperty[];
}

export interface PropertyGraphTableProperty {
    name: string;
    type: string;
    expression?: string;
}

// =============================================================================
// Constraint Types
// =============================================================================

export interface TableLevelPrimaryKey {
    name?: string;
    columns: string[];
    /** PG18: PERIOD temporal primary key */
    periodColumn?: string;
    /** PG18: WITHOUT OVERLAPS */
    withoutOverlaps?: boolean;
    notValid?: boolean;
    inherit?: boolean;
    concurrently?: boolean;
    ifNotExists?: boolean;
}

export interface TableLevelForeignKey {
    name?: string;
    columns: string[];
    /** PG18: Multi-target columns for temporal FK */
    targetTable: string;
    targetColumns: string[];
    periodColumn?: string; // The PERIOD column in source
    targetPeriodColumn?: string; // The PERIOD column in target
    onDelete?: string;
    onUpdate?: string;
    enforced?: boolean;
    notValid?: boolean;
    inherit?: boolean;
    deferrable?: boolean;
    initiallyDeferred?: boolean;
    concurrently?: boolean;
}

export interface TemporalConstraint {
    type: 'PERIOD' | 'WITHOUT_OVERLAPS';
    column?: string; // Period column for PERIOD constraint
    columns?: string[]; // Columns for WITHOUT OVERLAPS
    name?: string;
}

export interface NamedConstraint {
    name?: string;
    columns?: string[];
    expression?: string;
    /** PG18: Check constraint enforcement flag */
    enforced?: boolean;
    /** PG18: NOT VALID flag for constraints */
    notValid?: boolean;
    /** PG18: PERIOD temporal constraint column */
    periodColumn?: string;
    /** PG18: WITHOUT OVERLAPS flag */
    withoutOverlaps?: boolean;
    /** PG18: INHERIT/NO INHERIT flag */
    inherit?: boolean;
}

export interface CheckConstraint {
    name?: string;
    expression: string;
    notValid?: boolean;
    inherit?: boolean;
    noInherit?: boolean;
    enforced?: boolean;
    concurrently?: boolean;
}

export interface ExclusionConstraint {
    name?: string;
    columns: string[];
    operatorClasses: string[];
    whereClause?: string;
    using?: string;
    with?: Record<string, string | number>;
    concurrently?: boolean;
    ifNotExists?: boolean;
}

export interface TableLevelUnique {
    name?: string;
    columns: string[];
    nullsNotDistinct?: boolean;
    using?: string;
    with?: Record<string, string | number>;
    concurrently?: boolean;
    ifNotExists?: boolean;
}

export interface TableLevelCheck {
    name?: string;
    expression: string;
    notValid?: boolean;
    inherit?: boolean;
    noInherit?: boolean;
}

export interface TableLevelExclude {
    name?: string;
    elements: ExclusionElement[];
    whereClause?: string;
    using?: string;
    with?: Record<string, string | number>;
}

export interface ExclusionElement {
    column: string;
    operator: string;
    opclass?: string;
}