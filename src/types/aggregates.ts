// =============================================================================
// Aggregate Types
// =============================================================================

export interface Aggregate {
    name: string;
    schema?: string;
    baseType?: string;
    finalFunc: string;
    initCond?: string;
    finalFuncExtra?: boolean;
    sortOperator?: string;
    combineFunc?: string;
    serializeFunc?: string;
    deserializeFunc?: string;
    msfunc?: string;
    minvfunc?: string;
    mfinalfunc?: string;
    minitcond?: string;
    mfinalfuncExtra?: boolean;
    mfinalfuncDirect?: boolean;
    hashable?: boolean;
}
