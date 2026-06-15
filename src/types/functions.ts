// =============================================================================
// Function Types
// =============================================================================

export interface PostgresFunction {
    name: string;
    schema?: string;
    language: string;
    returnType?: string;
    isProcedure: boolean;
    parameters?: FunctionParameter[];
    arguments?: FunctionParameter[];
    body?: string;
    volatility?: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
    securityDefiner?: boolean;
    setOptions?: FunctionSetOption[];
    /** Cost estimation */
    cost?: number;
    /** Row estimation */
    rows?: number;
    /** Safe to parallelize */
    parallel?: 'SAFE' | 'RESTRICTED' | 'UNSAFE';
    /** Null handling */
    returnsNullOnNullInput?: boolean;
    strict?: boolean;
    /** Transform clause */
    transforms?: Transform[];
    /** Window function */
    windowFunc?: boolean;
    /** Aggregate function */
    aggregate?: boolean;
    /** Variadic */
    variadic?: 'ANY' | 'VARIADIC' | string;
    /** Set returning */
    setReturning?: boolean;
    /** Configuration parameters */
    options?: string[];
    /** Implements clause */
    implements?: string;
    /** External name */
    externalName?: string;
    /** SQL body */
    sqlBody?: string;
}

export interface FunctionParameter {
    name?: string;
    type: string;
    mode?: 'IN' | 'OUT' | 'INOUT' | 'VARIADIC';
    default?: string;
    typeModifier?: number;
    collation?: string;
}

export interface FunctionSetOption {
    category: string;
    name: string;
    value: string;
}

export interface Transform {
    type: string;
    fromsql: string;
    tosql: string;
}