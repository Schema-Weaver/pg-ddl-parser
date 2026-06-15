// =============================================================================
// Temporal Types (PG18)
// =============================================================================

export interface TemporalTable {
    name: string;
    schema?: string;
    period?: TemporalPeriod;
    systemVersioning?: TemporalSystemVersioning;
}

export interface TemporalPeriod {
    name: string;
    startColumn: string;
    endColumn: string;
}

export interface TemporalSystemVersioning {
    enabled: boolean;
    historyTable?: string;
    dataConsistencyCheck?: boolean;
    retentionPeriod?: string;
}

export interface TemporalFunction {
    name: string;
    schema?: string;
    type: 'FOR_PORTION' | 'CONTAINED_IN' | 'PERIOD_' | 'SYSTEM_TIME';
    parameters?: TemporalFunctionParameter[];
    returnType?: string;
}

export interface TemporalFunctionParameter {
    name: string;
    type: string;
    mode: 'IN' | 'OUT' | 'INOUT';
}
