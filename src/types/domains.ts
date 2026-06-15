// =============================================================================
// Domain Types
// =============================================================================

export interface Domain {
    name: string;
    schema?: string;
    baseType: string;
    notNull?: boolean;
    default?: string;
    checkExpression?: string;
    constraints?: DomainConstraint[];
    collation?: string;
}

export interface DomainConstraint {
    name?: string;
    type: 'CHECK' | 'NOT NULL' | 'UNIQUE';
    expression?: string;
    notValid?: boolean;
}