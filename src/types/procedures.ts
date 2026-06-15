// =============================================================================
// Procedure Types
// =============================================================================

export interface Procedure {
    name: string;
    schema?: string;
    language: string;
    parameters?: ProcedureParameter[];
    body?: string;
    volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
    securityDefiner?: boolean;
    setOptions?: ProcedureSetOption[];
}

export interface ProcedureParameter {
    name?: string;
    type: string;
    mode?: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
    default?: string;
}

export interface ProcedureSetOption {
    category: string;
    name: string;
    value: string;
}
