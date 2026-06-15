import { NamedConstraint, TableLevelPrimaryKey, TableLevelForeignKey, CheckConstraint, ExclusionConstraint, TableLevelUnique, TableLevelCheck, TableLevelExclude, ExclusionElement, RegexParseResult } from '../types';
import { ParseContext } from '../context/parse-context';
import { PATTERNS } from './patterns';

export function parseConstraintDefinitions(sql: string, context?: ParseContext): {
    constraints: NamedConstraint[];
    uniqueConstraints: NamedConstraint[];
    primaryKey?: TableLevelPrimaryKey;
    foreignKeys: TableLevelForeignKey[];
    tableConstraints: any[];
} {
    const result = {
        constraints: [] as NamedConstraint[],
        uniqueConstraints: [] as NamedConstraint[],
        primaryKey: undefined as TableLevelPrimaryKey | undefined,
        foreignKeys: [] as TableLevelForeignKey[],
        tableConstraints: [] as any[],
    };

    // Parse PRIMARY KEY constraint
    const pkMatch = sql.match(/PRIMARY\s+KEY\s*\(\s*([^)]+)\s*\)/i);
    if (pkMatch) {
        const cols: string[] = [];
        let withoutOverlaps = /WITHOUT\s+OVERLAPS/i.test(sql);
        for (const col of pkMatch[1].split(',')) {
            const trimmed = col.trim().replace(/"/g, '');
            if (/WITHOUT\s+OVERLAPS/i.test(trimmed)) {
                withoutOverlaps = true;
                cols.push(trimmed.replace(/\s+WITHOUT\s+OVERLAPS/i, '').trim());
            } else {
                cols.push(trimmed);
            }
        }
        result.primaryKey = {
            columns: cols,
            withoutOverlaps,
        };
        result.tableConstraints.push({
            type: 'PRIMARY KEY',
            columns: cols,
            withoutOverlaps,
        });
    }

    // Parse FOREIGN KEY constraints
    const fkMatches = sql.matchAll(/(?:CONSTRAINT\s+"?(\w+)"?\s+)?FOREIGN\s+KEY\s*\(\s*([^)]+)\s*\)\s+REFERENCES\s+(?:"?(\w+)"?\.)?"?(\w+)"?\s*\(\s*([^)]+)\s*\)/gi);
    for (const m of fkMatches) {
        const name = m[1];
        
        let periodColumn: string | undefined;
        let targetPeriodColumn: string | undefined;
        
        const columns: string[] = [];
        for (const col of m[2].split(',')) {
            const trimmed = col.trim().replace(/"/g, '');
            const periodMatch = trimmed.match(/PERIOD\s+(\w+)/i);
            if (periodMatch) {
                periodColumn = periodMatch[1];
            } else {
                columns.push(trimmed);
            }
        }
        
        const refSchema = m[3];
        const refTable = m[4];
        const targetTable = refSchema ? `${refSchema}.${refTable}` : refTable;
        
        const targetColumns: string[] = [];
        for (const col of m[5].split(',')) {
            const trimmed = col.trim().replace(/"/g, '');
            const periodMatch = trimmed.match(/PERIOD\s+(\w+)/i);
            if (periodMatch) {
                targetPeriodColumn = periodMatch[1];
            } else {
                targetColumns.push(trimmed);
            }
        }

        const matchIndex = m.index || 0;
        const remainingText = sql.slice(matchIndex, matchIndex + 250);
        const onDeleteMatch = remainingText.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i);
        const onUpdateMatch = remainingText.match(/ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i);
        
        const deferrable = /DEFERRABLE/i.test(remainingText);
        const initiallyDeferred = /INITIALLY\s+DEFERRED/i.test(remainingText);
        const notValid = /NOT\s+VALID/i.test(remainingText);
        
        const fkObj: TableLevelForeignKey = {
            name,
            columns,
            targetTable,
            targetColumns,
            periodColumn,
            targetPeriodColumn,
            onDelete: onDeleteMatch ? onDeleteMatch[1].toUpperCase() : undefined,
            onUpdate: onUpdateMatch ? onUpdateMatch[1].toUpperCase() : undefined,
            deferrable: deferrable ? true : undefined,
            initiallyDeferred: initiallyDeferred ? true : undefined,
            notValid: notValid ? true : undefined,
        };

        result.foreignKeys.push(fkObj);
        result.tableConstraints.push({
            type: 'FOREIGN KEY',
            name,
            columns,
            targetTable,
            targetColumns,
            periodColumn,
            targetPeriodColumn,
            onDelete: fkObj.onDelete,
            onUpdate: fkObj.onUpdate,
            deferrable: fkObj.deferrable,
            initiallyDeferred: fkObj.initiallyDeferred,
            notValid: fkObj.notValid,
        });
    }

    // Parse CHECK constraints (inline and table-level, NOT ENFORCED before or after CHECK)
    const checkPatterns = [
        /(?:CONSTRAINT\s+"?(\w+)"?\s+)?(?:NOT\s+ENFORCED\s+)?CHECK\s*\(\s*([\s\S]+?)\s*\)(?:\s+NOT\s+ENFORCED)?(?:\s+NOT\s+VALID)?/gi,
        /CONSTRAINT\s+"?(\w+)"?\s+NOT\s+ENFORCED\s+CHECK\s*\(\s*([\s\S]+?)\s*\)/gi,
    ];
    for (const checkPattern of checkPatterns) {
        const checkMatches = sql.matchAll(checkPattern);
        for (const m of checkMatches) {
            const fullMatch = m[0];
            const checkObj = {
                name: m[1],
                expression: m[2],
                enforced: /NOT\s+ENFORCED/i.test(fullMatch) ? false : undefined,
                notValid: /NOT\s+VALID/i.test(fullMatch) ? true : undefined,
            };
            if (!result.constraints.some(c => c.expression === checkObj.expression && c.name === checkObj.name)) {
                result.constraints.push(checkObj);
                result.tableConstraints.push({
                    type: 'CHECK',
                    name: checkObj.name,
                    expression: checkObj.expression,
                    enforced: checkObj.enforced,
                    notValid: checkObj.notValid,
                });
            }
        }
    }

    // Parse UNIQUE constraints
    const uniqueMatches = sql.matchAll(/(?:CONSTRAINT\s+"?(\w+)"?\s+)?UNIQUE\s*\(\s*([^)]+)\s*\)/gi);
    for (const m of uniqueMatches) {
        const uniqueObj = {
            name: m[1],
            columns: m[2].split(',').map(s => s.trim().replace(/"/g, '')),
        };
        result.uniqueConstraints.push(uniqueObj);
        result.tableConstraints.push({
            type: 'UNIQUE',
            name: uniqueObj.name,
            columns: uniqueObj.columns,
        });
    }

    // Parse EXCLUDE constraints
    const excludeMatches = sql.matchAll(/(?:CONSTRAINT\s+"?(\w+)"?\s+)?EXCLUDE\s+USING\s+(\w+)\s*\(\s*([^)]+)\s*\)/gi);
    for (const m of excludeMatches) {
        const name = m[1];
        const using = m[2];
        const body = m[3];
        
        const columns: string[] = [];
        let withoutOverlaps = false;
        
        for (const col of body.split(',')) {
            const trimmed = col.trim().replace(/"/g, '');
            if (trimmed.includes('WITH &&')) {
                withoutOverlaps = true;
                columns.push(trimmed.replace(/\s+WITH\s+&&/i, '').trim());
            } else {
                columns.push(trimmed.replace(/\s+WITH\s+.*$/i, '').trim());
            }
        }
        
        result.tableConstraints.push({
            type: 'EXCLUDE',
            name,
            using,
            columns,
            withoutOverlaps,
        });
    }

    return result;
}

export function parseCreateConstraintRegex(sql: string, context?: ParseContext): RegexParseResult {
    // Parse ADD CONSTRAINT
    const addConstraintMatch = sql.match(/ADD\s+CONSTRAINT\s+(\w+)\s+(PRIMARY\s+KEY|UNIQUE|CHECK|FOREIGN\s+KEY)/i);
    if (addConstraintMatch) {
        const constraintName = addConstraintMatch[1];
        const constraintType = addConstraintMatch[2].toUpperCase();

        const constraint: NamedConstraint = {
            name: constraintName,
            columns: [],
            expression: undefined,
        };

        // Extract columns for PRIMARY KEY and UNIQUE
        if (constraintType.includes('PRIMARY KEY') || constraintType.includes('UNIQUE')) {
            const columnsMatch = sql.match(/\(\s*([^)]+)\s*\)/);
            if (columnsMatch) {
                constraint.columns = columnsMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
            }
        }

        // Extract expression for CHECK
        if (constraintType.includes('CHECK')) {
            const checkMatch = sql.match(/CHECK\s*\(\s*([^)]+)\s*\)/i);
            if (checkMatch) {
                constraint.expression = checkMatch[1];
            }
        }

        return { success: true, function: constraint, confidence: 0.9 };
    }

    // Parse EXCLUSION constraint
    const exclusionMatch = sql.match(/EXCLUDE\s+USING\s+(\w+)\s*\(\s*([^)]+)\s*\)/i);
    if (exclusionMatch) {
        const elements: ExclusionElement[] = [];
        const elementStr = exclusionMatch[2];
        
        // Parse elements like (column WITH operator)
        const elementMatches = elementStr.matchAll(/(\w+)\s+WITH\s+(\w+)/gi);
        for (const m of elementMatches) {
            elements.push({
                column: m[1],
                operator: m[2],
            });
        }

        const constraint: ExclusionConstraint = {
            name: sql.match(/CONSTRAINT\s+(\w+)/i)?.[1],
            columns: elements.map(e => e.column),
            operatorClasses: [exclusionMatch[1]],
            whereClause: sql.match(/WHERE\s+\(\s*([^)]+)\s*\)/i)?.[1],
            using: exclusionMatch[1],
        };

        return { success: true, function: constraint, confidence: 0.9 };
    }

    return { success: false, confidence: 0, error: 'Could not match constraint definition' };
}