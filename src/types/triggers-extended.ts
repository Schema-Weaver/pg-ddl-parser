// =============================================================================
// Trigger Types - Extended
// =============================================================================

export interface Trigger {
    name: string;
    schema?: string;
    table: string;
    timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
    events: string[];
    event?: string;
    level: 'ROW' | 'STATEMENT';
    functionName?: string;
    functionSchema?: string;
    function?: string;
    condition?: string;
    /** Transition tables (PG10+) */
    transitionTables?: TriggerTransitionTable[];
    /** Referencing clause (PG15+) */
    referencing?: TriggerReferencing;
    /** Order clause (PG12+) */
    order?: TriggerOrder;
    /** Deferrable (PG12+) */
    deferrable?: boolean;
    /** Initially deferred (PG12+) */
    initiallyDeferred?: boolean;
    /** Filter condition (PG17+) */
    filterCondition?: string;
    /** PG19: Property graph trigger */
    propertyGraph?: TriggerPropertyGraph;
}

export interface TriggerTransitionTable {
    name: string;
    table: string;
}

export interface TriggerReferencing {
    oldTable?: string;
    newTable?: string;
    oldTransitionTable?: string;
    newTransitionTable?: string;
}

export interface TriggerOrder {
    name: string;
    position: number;
}

export interface TriggerPropertyGraph {
    type: 'VERTEX' | 'EDGE';
    name?: string;
}
