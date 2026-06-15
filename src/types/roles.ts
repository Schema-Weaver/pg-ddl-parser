// =============================================================================
// Role Types
// =============================================================================

export interface Role {
    name: string;
    isSuperuser?: boolean;
    canLogin?: boolean;
    canCreateDb?: boolean;
    canCreateRole?: boolean;
    inherit?: boolean;
    bypassRls?: boolean;
    connectionLimit?: number;
    validUntil?: string;
    inRoles?: string[];
    roles?: string[];
    adminRoles?: string[];
    password?: string;
    login?: boolean;
    superuser?: boolean;
    createdb?: boolean;
    createrole?: boolean;
    replication?: boolean;
    bypassrls?: boolean;
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