import { PropertyGraph, PropertyGraphVertex, PropertyGraphEdge, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

function extractBalancedParentheses(str: string, startIndex: number): string {
    let depth = 0;
    let end = -1;
    for (let i = startIndex; i < str.length; i++) {
        if (str[i] === '(') {
            depth++;
        } else if (str[i] === ')') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end > startIndex) {
        return str.slice(startIndex + 1, end);
    }
    return '';
}

function splitByComma(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    for (const char of str) {
        if (char === '(') depth++;
        else if (char === ')') depth--;

        if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

export function parseCreatePropertyGraphRegex(sql: string, context?: ParseContext): RegexParseResult {
    const headerMatch = sql.match(/CREATE\s+PROPERTY\s+GRAPH\s+(?:TABLE\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i);
    if (!headerMatch) {
        return { success: false, confidence: 0, error: 'Could not match CREATE PROPERTY GRAPH' };
    }

    const schemaName = headerMatch[1];
    const name = headerMatch[2];
    const fullGraphName = context ? context.qualifyName(name, schemaName) : (schemaName ? `${schemaName}.${name}` : name);

    const vertices: PropertyGraphVertex[] = [];
    const edges: PropertyGraphEdge[] = [];

    // Extract VERTEX TABLES body
    const vertexKeywordIndex = sql.search(/(?:VERTEX|NODE)\s+TABLES?\s*\(/i);
    if (vertexKeywordIndex !== -1) {
        const openParenIndex = sql.indexOf('(', vertexKeywordIndex);
        const vertexContent = extractBalancedParentheses(sql, openParenIndex);
        const parts = splitByComma(vertexContent);

        for (const part of parts) {
            const tableMatch = part.match(/^\s*(?:"?(\w+)"?\.)?"?(\w+)"?/);
            if (tableMatch) {
                const tSchema = tableMatch[1];
                const tName = tableMatch[2];
                const idMatch = part.match(/KEY\s*\(\s*([^)]+)\s*\)/i);
                
                const vertex: PropertyGraphVertex = {
                    name: tName,
                    table: tName,
                    idExpression: idMatch ? idMatch[1].trim() : undefined,
                    properties: [],
                };
                vertices.push(vertex);

                if (context) {
                    let targetTable = context.tables.get(`${tSchema || context.currentSchema}.${tName}`) || context.tables.get(tName);
                    if (!targetTable) {
                        targetTable = Array.from(context.tables.values()).find(t => t.name.endsWith('.' + tName) || t.name === tName);
                    }
                    if (targetTable) {
                        targetTable.isVertex = true;
                        targetTable.isPropertyGraphVertex = true;
                        targetTable.graphLabel = tName;
                        targetTable.graphName = name;
                        targetTable.propertyGraph = {
                            type: 'VERTEX',
                            name: name,
                            idExpression: vertex.idExpression
                        };
                    }
                }
            }
        }
    }

    // Extract EDGE TABLES body
    const edgeKeywordIndex = sql.search(/EDGE\s+TABLES?\s*\(/i);
    if (edgeKeywordIndex !== -1) {
        const openParenIndex = sql.indexOf('(', edgeKeywordIndex);
        const edgeContent = extractBalancedParentheses(sql, openParenIndex);
        const parts = splitByComma(edgeContent);

        for (const part of parts) {
            const tableMatch = part.match(/^\s*(?:"?(\w+)"?\.)?"?(\w+)"?/);
            if (tableMatch) {
                const tSchema = tableMatch[1];
                const tName = tableMatch[2];

                const sourceMatch = part.match(/SOURCE\s+(?:KEY\s*\([^)]+\)\s*)?(?:REFERENCES\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i);
                const destMatch = part.match(/(?:DESTINATION|TARGET)\s+(?:KEY\s*\([^)]+\)\s*)?(?:REFERENCES\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i);

                const edge: PropertyGraphEdge = {
                    name: tName,
                    table: tName,
                    sourceExpression: sourceMatch ? sourceMatch[2] : undefined,
                    targetExpression: destMatch ? destMatch[2] : undefined,
                    properties: [],
                };
                edges.push(edge);

                if (context) {
                    let targetTable = context.tables.get(`${tSchema || context.currentSchema}.${tName}`) || context.tables.get(tName);
                    if (!targetTable) {
                        targetTable = Array.from(context.tables.values()).find(t => t.name.endsWith('.' + tName) || t.name === tName);
                    }
                    if (targetTable) {
                        targetTable.isEdge = true;
                        targetTable.isPropertyGraphEdge = true;
                        targetTable.graphSourceLabel = edge.sourceExpression;
                        targetTable.graphTargetLabel = edge.targetExpression;
                        targetTable.graphName = name;
                        targetTable.propertyGraph = {
                            type: 'EDGE',
                            name: name
                        };
                    }
                }
            }
        }
    }

    const graph: PropertyGraph = {
        name: name,
        schema: schemaName || context?.currentSchema,
        vertices,
        edges,
        keyType: 'text',
        properties: [],
    };

    if (context) {
        context.addDependency(name, fullGraphName);
    }

    return { success: true, propertyGraph: graph, confidence: 0.9 };
}