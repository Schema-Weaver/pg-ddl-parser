import { DataTypeCategory } from './base';

export interface Column {
    name: string;
    type: string;
    typeCategory: DataTypeCategory;
    nullable: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    isUnique?: boolean;
    isGenerated?: boolean;
    generatedExpression?: string;
    /** PG 18 adds VIRTUAL generated columns. Defaults to 'STORED' for PG <18. */
    generatedType?: 'STORED' | 'VIRTUAL' | 'ALWAYS_IDENTITY' | 'BY_DEFAULT_IDENTITY';
    defaultValue?: string;
    checkConstraint?: string;
    references?: ForeignKeyReference;
    comment?: string;
    /** PG18: Named NOT NULL constraint */
    notNullConstraint?: {
        name?: string;
        notValid?: boolean;
        inherited?: boolean;
    };
    /** PG12+: Identity column options */
    identityOptions?: {
        always: boolean;
        startWith?: number;
        incrementBy?: number;
        minValue?: number;
        maxValue?: number;
        cache?: number;
        cycle?: boolean;
    };
    /** Column collation */
    collation?: string;
}

export interface ForeignKeyReference {
    schema?: string;
    table: string;
    column: string | string[]; // Support multi-column FK (temporal)
    onDelete?: string;
    onUpdate?: string;
    /** PG18: PERIOD temporal foreign key target column */
    periodColumn?: string;
    /** PG18: Foreign key enforcement flag */
    enforced?: boolean;
}