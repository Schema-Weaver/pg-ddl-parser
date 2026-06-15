// =============================================================================
// Constraint Types - Extended
// =============================================================================

export interface NamedConstraint {
    name?: string;
    columns?: string[];
    expression?: string;
    enforced?: boolean;
    notValid?: boolean;
    periodColumn?: string;
    withoutOverlaps?: boolean;
    inherit?: boolean;
}

export interface TableLevelPrimaryKey {
    name?: string;
    columns: string[];
    periodColumn?: string;
    withoutOverlaps?: boolean;
    notValid?: boolean;
    inherit?: boolean;
    concurrently?: boolean;
    ifNotExists?: boolean;
}

export interface TableLevelForeignKey {
    name?: string;
    columns: string[];
    targetTable: string;
    targetColumns: string[];
    periodColumn?: string;
    targetPeriodColumn?: string;
    onDelete?: string;
    onUpdate?: string;
    enforced?: boolean;
    notValid?: boolean;
    inherit?: boolean;
    deferrable?: boolean;
    initiallyDeferred?: boolean;
    concurrently?: boolean;
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
