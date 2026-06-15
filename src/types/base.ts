/**
 * Core Types for PostgreSQL Parser v2
 *
 * Fundamental type definitions used across all parser phases
 */

// =============================================================================
// Token Types
// =============================================================================

export type TokenType =
    | 'KEYWORD'
    | 'IDENTIFIER'
    | 'QUOTED_IDENTIFIER'
    | 'STRING'
    | 'DOLLAR_STRING'
    | 'NUMBER'
    | 'OPERATOR'
    | 'SYMBOL'
    | 'DELIMITER'
    | 'COMMENT'
    | 'WHITESPACE'
    | 'EOF';

export interface Position {
    line: number;
    column: number;
    offset: number;
}

export interface TokenContext {
    parenthesesDepth: number;
    bracketDepth: number;
    braceDepth: number;
    inFunction: boolean;
    inString: boolean;
    stringDelimiter?: string;
}

// =============================================================================
// Symbol Registry
// =============================================================================

export type SymbolType =
    | 'DEPENDS_ON'        // A -> Depends on -> B (e.g., View requires Table, Function uses Type)
    | 'HAS_SEQUENCE'      // Table.Column -> Uses -> Sequence
    | 'OWNS_POLICY'       // Role -> Owns -> Policy
    | 'APPLIES_TO'        // Policy -> Applies to -> Table
    | string;             // Extendable for AI/custom relationship

export interface Symbol {
    name: string;
    type: SymbolType;
    schema: string;
    fullName: string;
    object: any;
    verificationLevel: 'DEFINITIVE' | 'HEURISTIC' | 'INFERRED';
    position?: Position;
}

export interface Token {
    type: TokenType;
    value: string;
    position: Position;
    context: TokenContext;
    raw?: string; // Original text before normalization
}

// =============================================================================
// Data Type Categories
// =============================================================================

export type DataTypeCategory =
    | 'numeric' | 'NUMERIC'
    | 'text' | 'TEXT' | 'STRING'
    | 'boolean' | 'BOOLEAN'
    | 'datetime' | 'DATETIME'
    | 'uuid' | 'UUID'
    | 'json' | 'JSON'
    | 'array' | 'ARRAY'
    | 'binary' | 'BINARY'
    | 'enum' | 'ENUM'
    | 'range' | 'RANGE'
    | 'network' | 'NETWORK'
    | 'geometry' | 'GEOMETRY'
    | 'hstore' | 'HSTORE'
    | 'composite' | 'COMPOSITE'
    | 'other' | 'OTHER';

// =============================================================================
// Verification Levels
// =============================================================================

export type VerificationLevel = 'DEFINITIVE' | 'HEURISTIC' | 'INFERRED';

// =============================================================================
// Result Type
// =============================================================================

export interface RegexParseResult {
    success: boolean;
    schema?: string;
    confidence: number;
    error?: string;
    table?: any;
    view?: any;
    index?: any;
    function?: any;
    trigger?: any;
    policy?: any;
    enum?: any;
    compositeType?: any;
    domain?: any;
    extension?: any;
    sequence?: any;
    role?: any;
    rule?: any;
    aggregate?: any;
    propertyGraph?: any;
    /** Generic data payload for ALTER/DROP results */
    data?: any;
}