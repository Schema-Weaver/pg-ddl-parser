// =============================================================================
// View Types
// =============================================================================

import { VerificationLevel } from './base';

export interface View {
    name: string;
    schema?: string;
    isMaterialized: boolean;
    isRecursive: boolean;
    query?: string;
    columns?: (string | ViewColumn)[];
    comment?: string;
    verificationLevel?: VerificationLevel;
    definedOn?: string[];
    /** WITH options */
    withOptions?: ViewWithOptions;
    /** Check option */
    checkOption?: 'LOCAL' | 'CASCADED';
    /** Security barrier */
    securityBarrier?: boolean;
    /** Security invoker */
    securityInvoker?: boolean;
    /** Access method */
    accessMethod?: string;
    /** Tablespaces */
    tablespace?: string;
}

export interface ViewColumn {
    name: string;
    dependencies?: {
        table: string;
        column: string;
    }[];
}

export interface ViewWithOptions {
    checkOption?: 'LOCAL' | 'CASCADED';
    securityBarrier?: boolean;
    securityInvoker?: boolean;
    [key: string]: string | number | boolean | undefined;
}