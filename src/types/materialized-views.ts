// =============================================================================
// Materialized View Types
// =============================================================================

import { VerificationLevel } from './base';

export interface MaterializedView {
    name: string;
    schema?: string;
    query?: string;
    columns?: string[];
    isUnique?: boolean;
    uniqueColumns?: string[];
    withNoData?: boolean;
    tablespace?: string;
    comment?: string;
    verificationLevel?: VerificationLevel;
    /** PG18: Refresh configuration */
    refresh?: {
        method?: 'FAST' | 'FULL';
        concurrent?: boolean;
        withNoData?: boolean;
    };
}
