// =============================================================================
// Rule Types
// =============================================================================

export interface Rule {
    name: string;
    schema?: string;
    table: string;
    event: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    instead?: boolean;
    condition?: string;
    action?: string | RuleAction[];
    /** Instead rule */
    isInstead?: boolean;
    /** Where clause */
    whereClause?: string;
    /** Priority (PG12+) */
    priority?: number;
}

export interface RuleAction {
    type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    query?: string;
    target?: string;
    columns?: string[];
    values?: string[];
}