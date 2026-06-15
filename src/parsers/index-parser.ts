import { Index, IndexColumn, IndexOperatorClass, IndexWithOptions, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

function splitColumnsStr(columnsStr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;
    for (let i = 0; i < columnsStr.length; i++) {
        const char = columnsStr[i];
        if (char === '(') {
            parenDepth++;
            current += char;
        } else if (char === ')') {
            parenDepth--;
            current += char;
        } else if (char === ',' && parenDepth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    return parts;
}

function parseIndexColumnItem(colStr: string): IndexColumn {
    colStr = colStr.trim();
    
    let columnNameOrExpr = '';
    let rest = colStr;
    
    if (colStr.startsWith('(')) {
        let parenCount = 0;
        let endIdx = -1;
        for (let i = 0; i < colStr.length; i++) {
            if (colStr[i] === '(') parenCount++;
            else if (colStr[i] === ')') {
                parenCount--;
                if (parenCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }
        if (endIdx !== -1) {
            columnNameOrExpr = colStr.slice(0, endIdx + 1);
            rest = colStr.slice(endIdx + 1).trim();
        } else {
            const match = colStr.match(/^\(([^)]+)\)/);
            if (match) {
                columnNameOrExpr = match[0];
                rest = colStr.slice(match[0].length).trim();
            }
        }
    } else {
        const match = colStr.match(/^(?:"?(\w+)"?)/);
        if (match) {
            columnNameOrExpr = match[1];
            rest = colStr.slice(match[0].length).trim();
        } else {
            const matchWord = colStr.match(/^([^\s,()]+)/);
            if (matchWord) {
                columnNameOrExpr = matchWord[1];
                rest = colStr.slice(matchWord[0].length).trim();
            }
        }
    }
    
    let collation: string | undefined;
    let order: 'ASC' | 'DESC' | undefined;
    let nulls: 'FIRST' | 'LAST' | undefined;
    let opclass: string | undefined;
    
    const collMatch = rest.match(/\bCOLLATE\s+(?:"?([\w.-]+)"?)/i);
    if (collMatch) {
        collation = collMatch[1];
        rest = rest.replace(collMatch[0], '').trim();
    }
    
    const orderMatch = rest.match(/\b(ASC|DESC)\b/i);
    if (orderMatch) {
        order = orderMatch[1].toUpperCase() as 'ASC' | 'DESC';
        rest = rest.replace(orderMatch[0], '').trim();
    }
    
    const nullsMatch = rest.match(/\bNULLS\s+(FIRST|LAST)\b/i);
    if (nullsMatch) {
        nulls = nullsMatch[1].toUpperCase() as 'FIRST' | 'LAST';
        rest = rest.replace(nullsMatch[0], '').trim();
    }
    
    if (rest) {
        opclass = rest.trim();
    }
    
    return {
        column: columnNameOrExpr,
        name: columnNameOrExpr.replace(/^\((.*)\)$/, '$1'),
        order,
        direction: order,
        nulls,
        collation,
        operatorClass: opclass
    };
}

export function parseCreateIndexRegex(sql: string, context?: ParseContext): RegexParseResult {
    const match = sql.match(PATTERNS.createIndex);
    if (!match) {
        return { success: false, confidence: 0, error: 'Could not match CREATE INDEX' };
    }

    const isUnique = !!match[1];
    const concurrently = /\bCONCURRENTLY\b/i.test(sql);
    const ifNotExists = /\bIF\s+NOT\s+EXISTS\b/i.test(sql);
    const indexName = match[2];
    const schemaName = match[3];
    const tableName = match[4];
    let indexType = (match[5] || 'btree').toLowerCase() as any;
    const usingMatch = sql.match(/\bUSING\s+(\w+)\b/i);
    if (usingMatch) {
        indexType = usingMatch[1].toLowerCase() as any;
    }
    const columnsStr = match[6];

    const fullIndexName = context ? context.qualifyName(indexName, schemaName) : (schemaName ? `${schemaName}.${indexName}` : indexName);
    const fullTableName = context ? context.qualifyName(tableName, schemaName) : (schemaName ? `${schemaName}.${tableName}` : tableName);

    // Parse columns
    const columns: IndexColumn[] = [];
    const operatorClasses: IndexOperatorClass[] = [];
    const collations: string[] = [];
    const nullsOrder: ('FIRST' | 'LAST')[] = [];

    if (columnsStr) {
        const parts = splitColumnsStr(columnsStr);
        for (const part of parts) {
            const parsedCol = parseIndexColumnItem(part);
            columns.push(parsedCol);

            if (parsedCol.operatorClass) {
                const opName = parsedCol.operatorClass.split('(')[0].trim();
                const opOptsMatch = parsedCol.operatorClass.match(/\(([^)]+)\)/);
                const options = opOptsMatch ? opOptsMatch[1].split(',').map(s => s.trim()) : [];
                operatorClasses.push({
                    column: parsedCol.column,
                    name: opName,
                    options,
                });
            }
            if (parsedCol.collation) {
                collations.push(parsedCol.collation);
            }
            if (parsedCol.nulls) {
                nullsOrder.push(parsedCol.nulls);
            }
        }
    }

    // Parse WITH options
    let withOptions: IndexWithOptions = {};
    const withMatch = sql.match(/WITH\s*\(\s*([^)]+)\s*\)/i);
    if (withMatch) {
        const options = withMatch[1].split(',').map(s => s.trim());
        for (const opt of options) {
            const [key, value] = opt.split('=').map(s => s.trim());
            if (key && value) {
                let parsedVal: string | number | boolean = value;
                if (value.toLowerCase() === 'on' || value.toLowerCase() === 'true') {
                    parsedVal = true;
                } else if (value.toLowerCase() === 'off' || value.toLowerCase() === 'false') {
                    parsedVal = false;
                } else if (!isNaN(Number(value))) {
                    parsedVal = Number(value);
                }
                withOptions[key] = parsedVal;
            }
        }
    }

    const index: Index = {
        name: indexName,
        schema: schemaName,
        table: tableName,
        columns,
        type: indexType,
        method: indexType,
        isUnique,
        isPartial: /\bWHERE\b/i.test(sql),
        includeColumns: [],
        concurrently,
        ifNotExists,
        with: Object.keys(withOptions).length > 0 ? withOptions : undefined,
        operatorClasses: operatorClasses.length > 0 ? operatorClasses : undefined,
        collation: collations.length > 0 ? collations : undefined,
        nullsOrder: nullsOrder.length > 0 ? nullsOrder : undefined,
    };

    // Check for INCLUDE
    const includeMatch = sql.match(/\bINCLUDE\s*\(([^)]+)\s*\)/i);
    if (includeMatch) {
        index.includeColumns = includeMatch[1]
            .split(',')
            .map(c => c.trim().replace(/"/g, ''));
    }

    // Extract WHERE clause for partial index
    const whereMatch = sql.match(/\bWHERE\s+([\s\S]+?)(?:\s*;?\s*$)/i);
    if (whereMatch) {
        index.whereClause = whereMatch[1].trim();
    }

    // Track dependency
    if (context) {
        context.addDependency(indexName, fullTableName);
    }

    return { success: true, index, confidence: 0.95 };
}