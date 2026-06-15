// =============================================================================
// Policy Types - Extended
// =============================================================================

export interface Policy {
    name: string;
    schema?: string;
    table: string;
    permissive: 'PERMISSIVE' | 'RESTRICTIVE';
    roles: string[];
    cmd: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    using?: string;
    withCheck?: string;
    /** Bypass RLS */
    bypassRls?: boolean;
    /** Check option */
    checkOption?: 'LOCAL' | 'CASCADED';
}
