// =============================================================================
// Errors & Warnings
// =============================================================================

import { Position } from './base';

export type ErrorLevel = 'ERROR' | 'WARNING' | 'SUGGESTION' | 'INFO';

export type ErrorCode =
    | 'PARSE_ERROR'
    | 'TOKENIZE_ERROR'
    | 'FK_UNRESOLVED'
    | 'TYPE_UNKNOWN'
    | 'TABLE_UNKNOWN'
    | 'SCHEMA_UNKNOWN'
    | 'CIRCULAR_DEPENDENCY'
    | 'DUPLICATE_NAME'
    | 'CONSTRAINT_INVALID'
    | 'SYNTAX_ERROR'
    | 'INCOMPLETE_PARSE'
    | 'UNEXPECTED_EOF'
    | 'UNEXPECTED_TOKEN';

export interface ParserError {
    level: ErrorLevel;
    code: ErrorCode;
    message: string;
    position?: Position;
    endPosition?: Position;
    statement?: string;
    suggestion?: string;
    recovery?: 'SKIP_TOKEN' | 'SKIP_STATEMENT' | 'SKIP_CONSTRUCT' | 'CONTINUE';
    affectedObject?: string; // e.g., "public.users"
}