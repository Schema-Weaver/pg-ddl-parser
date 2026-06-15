// =============================================================================
// Role Types - Extended
// =============================================================================

export interface Role {
    name: string;
    password?: string;
    login?: boolean;
    inherit?: boolean;
    superuser?: boolean;
    createdb?: boolean;
    createrole?: boolean;
    replication?: boolean;
    bypassrls?: boolean;
    connectionLimit?: number;
    validUntil?: string;
    inRole?: string[];
    role?: string[];
    admin?: string[];
    /** Option settings */
    settings?: RoleSetting[];
    /** Member options */
    memberOptions?: RoleMemberOption[];
}

export interface RoleSetting {
    role: string;
    database?: string;
    variable: string;
    value: string;
}

export interface RoleMemberOption {
    role: string;
    admin?: boolean;
    inherit?: boolean;
    set?: boolean;
}
