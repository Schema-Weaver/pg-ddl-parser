// =============================================================================
// Final Output
// =============================================================================

import { Table } from './tables';
import { Relationship } from './relationships';
import { EnumType } from './enums';
import { View } from './views';
import { Trigger } from './triggers';
import { Index } from './indexes';
import { Sequence } from './sequences';
import { PostgresFunction } from './functions';
import { Policy } from './policies';
import { Extension } from './extensions';
import { Domain } from './domains';
import { CompositeType } from './composite-types';
import { Role } from './roles';
import { PostgresStats } from './stats';
import { ParserError } from './errors';
import { Rule } from './rules';
import { Aggregate } from './aggregates';
import { PropertyGraph } from './property-graphs';

export interface ParsedSchema {
    tables: Table[];
    relationships: Relationship[];
    enums: Map<string, string[]>;
    enumTypes: EnumType[];
    views: View[];
    triggers: Trigger[];
    indexes: Index[];
    sequences: Sequence[];
    functions: PostgresFunction[];
    policies: Policy[];
    extensions: Extension[];
    schemas: string[];
    domains: Domain[];
    compositeTypes: CompositeType[];
    roles: Role[];
    rules: Rule[];
    aggregates?: Aggregate[];
    propertyGraphs?: PropertyGraph[];
    stats: PostgresStats;
    errors: ParserError[];
    warnings: ParserError[];
    parseTime?: number;
    confidence: number; // Overall parse confidence
}