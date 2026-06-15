// =============================================================================
// Parse Context (shared state)
// =============================================================================

import { Table } from './tables';
import { View } from './views';
import { Index } from './indexes';
import { PostgresFunction } from './functions';
import { Trigger } from './triggers';
import { Policy } from './policies';
import { Extension } from './extensions';
import { Domain } from './domains';
import { CompositeType } from './composite-types';
import { Sequence } from './sequences';
import { Role } from './roles';
import { ParserError } from './errors';
import { PostgresStats } from './stats';
import { SymbolType, VerificationLevel } from './base';

export interface ParseOptions {
    /** Include comments in output */
    includeComments?: boolean;
    /** Strict mode - fail on first error */
    strict?: boolean;
    /** Default schema when not specified */
    defaultSchema?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Maximum statements to parse (for huge files) */
    maxStatements?: number;
}

export const DEFAULT_PARSE_OPTIONS: ParseOptions = {
    includeComments: false,
    strict: false,
    defaultSchema: 'public',
    debug: false,
    maxStatements: 10000,
};

export interface ParseContext {
    // Current schema being parsed
    currentSchema: string;
    
    // Symbols registry
    symbols: Map<string, any>;
    
    // Parsed objects
    tables: Map<string, Table>;
    views: Map<string, View>;
    indexes: Map<string, Index>;
    functions: Map<string, PostgresFunction>;
    triggers: Map<string, Trigger>;
    policies: Map<string, Policy>;
    extensions: Map<string, Extension>;
    domains: Map<string, Domain>;
    compositeTypes: Map<string, CompositeType>;
    sequences: Map<string, Sequence>;
    roles: Map<string, Role>;
    
    // Dependencies tracking
    dependencies: Map<string, Set<string>>;
    forwardReferences: Map<string, string>;
    
    // Parser errors
    errors: ParserError[];
    warnings: ParserError[];
    
    // Stats and metadata
    stats: PostgresStats;
    
    // Utility methods
    qualifyName(name: string, schema?: string): string;
    defineSymbol(name: string, type: SymbolType, obj: any, schema?: string, level?: VerificationLevel): void;
    addDependency(source: string, target: string): void;
    addForwardReference(source: string, target: string): void;
}