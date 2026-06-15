// =============================================================================
// Table Types - Extended
// =============================================================================

import { Column } from './columns';
import { VerificationLevel } from './base';
import { NamedConstraint, TableLevelPrimaryKey, TableLevelForeignKey } from './constraints-extended';

export interface Table {
    name: string;
    schema?: string;
    columns: Column[];
    isPartitioned: boolean;
    partitionType?: 'range' | 'list' | 'hash';
    partitionKey?: string[];
    partitionOf?: string;
    partitionBounds?: { from?: string; to?: string; in?: string[] };
    inheritsFrom?: string;
    isTemporary: boolean;
    isUnlogged: boolean;
    checkConstraints: NamedConstraint[];
    uniqueConstraints: NamedConstraint[];
    primaryKey?: TableLevelPrimaryKey;
    foreignKeys: TableLevelForeignKey[];
    constraints?: any[];
    comment?: string;
    confidence: number;
    verificationLevel?: VerificationLevel;
    rlsEnabled?: boolean;
    temporalConstraints?: TemporalConstraint[];
    isVertex?: boolean;
    isEdge?: boolean;
    /** Table-level options */
    with?: Record<string, string | number>;
    /** Table access method */
    accessMethod?: string;
    /** Tablespaces */
    tablespace?: string;
    partitionTablespace?: string;
    /** ON COMMIT behavior for temporary tables */
    onCommit?: 'PRESERVE_ROWS' | 'DELETE_ROWS' | 'DROP';
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
    /** PG19: Property graph */
    propertyGraph?: PropertyGraphTable;
}

export interface TemporalConstraint {
    type: 'PERIOD' | 'WITHOUT_OVERLAPS';
    column?: string;
    columns?: string[];
    name?: string;
}

export interface TemporalPeriod {
    name: string;
    startColumn: string;
    endColumn: string;
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
