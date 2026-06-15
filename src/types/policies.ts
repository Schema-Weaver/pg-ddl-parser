// =============================================================================
// Policy Types
// =============================================================================

export interface Policy {
    name: string;
    schema?: string;
    table: string;
    command?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    cmd?: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    permissive: boolean | 'PERMISSIVE' | 'RESTRICTIVE';
    roles?: string[];
    usingExpression?: string;
    checkExpression?: string;
    using?: string;
    withCheck?: string;
    bypassRls?: boolean;
    checkOption?: 'LOCAL' | 'CASCADED';
}