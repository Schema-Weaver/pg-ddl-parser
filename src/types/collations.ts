// =============================================================================
// Collation Types
// =============================================================================

export interface Collation {
    name: string;
    schema?: string;
    provider: 'icu' | 'libc';
    locale?: string;
    collate?: string;
    ctype?: string;
    deterministic?: boolean;
    version?: string;
}
