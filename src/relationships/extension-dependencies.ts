import { ParseContext } from '../context/parse-context';
import { Relationship } from '../types/relationships';

/**
 * Detect extension dependencies
 * Identifies objects that depend on PostgreSQL extensions
 */
export function detectExtensionDependencies(context: ParseContext): Relationship[] {
    const relationships: Relationship[] = [];
    const extensions = Array.from(context.extensions.values());
    if (extensions.length === 0) return [];
    
    for (const extension of extensions) {
        const extSchema = extension.schema || context.currentSchema;
        const extName = extension.name.includes('.') ? extension.name.split('.').pop()! : extension.name;
        const extNameLower = extName.toLowerCase();

        // 1. Check tables and columns for dependencies
        for (const table of context.tables.values()) {
            const tableSchema = table.schema || context.currentSchema;
            const tableName = table.name.includes('.') ? table.name.split('.').pop()! : table.name;
            let depends = false;

            for (const col of table.columns) {
                const colType = col.type.toLowerCase();
                const colDefault = (col.defaultValue || '').toLowerCase();

                if (extNameLower === 'hstore' && colType.includes('hstore')) depends = true;
                if (extNameLower === 'ltree' && colType.includes('ltree')) depends = true;
                if (extNameLower === 'citext' && colType.includes('citext')) depends = true;
                if (extNameLower === 'postgis' && (colType.includes('geometry') || colType.includes('geography') || colType.includes('raster'))) depends = true;
                if ((extNameLower === 'uuid-ossp' || extNameLower === 'pgcrypto') && (colDefault.includes('uuid_generate') || colDefault.includes('gen_random_uuid'))) depends = true;
            }

            if (depends) {
                relationships.push({
                    id: `${extSchema}.${extName}->${tableSchema}.${tableName}`,
                    source: { schema: extSchema, table: extName },
                    target: { schema: tableSchema, table: tableName },
                    type: 'DEPENDS_ON',
                    cardinality: 'ONE_TO_MANY',
                    confidence: 1.0,
                    metadata: { matchMethod: 'parser_match' },
                    annotations: [`extension:${extName}`, `provides:${tableName}`]
                });
            }
        }

        // 2. Check indexes for dependencies
        for (const idx of context.indexes.values()) {
            const idxSchema = idx.schema || context.currentSchema;
            const idxName = idx.name.includes('.') ? idx.name.split('.').pop()! : idx.name;
            const idxType = (idx.type || '').toLowerCase();
            const idxMethod = (idx.method || '').toLowerCase();
            let depends = false;

            if (extNameLower === 'btree_gist' && (idxType === 'gist' || idxMethod === 'gist')) depends = true;
            if (extNameLower === 'btree_gin' && (idxType === 'gin' || idxMethod === 'gin')) depends = true;
            if (extNameLower === 'pg_trgm' && (
                idxName.toLowerCase().includes('trgm') ||
                idx.columns.some(c => (c.operatorClass && c.operatorClass.toLowerCase().includes('trgm')) || (c.column && c.column.toLowerCase().includes('trgm')))
            )) depends = true;
            if (extNameLower === 'postgis' && (idxType === 'gist' || idxMethod === 'gist')) {
                const tableObj = context.tables.get(idx.table);
                if (tableObj && tableObj.columns.some(c => c.type.toLowerCase().includes('geometry') || c.type.toLowerCase().includes('geography'))) {
                    depends = true;
                }
            }

            if (depends) {
                relationships.push({
                    id: `${extSchema}.${extName}->${idxSchema}.${idxName}`,
                    source: { schema: extSchema, table: extName },
                    target: { schema: idxSchema, table: idxName },
                    type: 'DEPENDS_ON',
                    cardinality: 'ONE_TO_MANY',
                    confidence: 1.0,
                    metadata: { matchMethod: 'parser_match' },
                    annotations: [`extension:${extName}`, `provides:${idxName}`]
                });
            }
        }

        // 3. Extension dependency on schema
        if (extension.schema) {
            relationships.push({
                id: `extension.${extName}->schema.${extension.schema}`,
                source: { schema: extension.schema, table: extName },
                target: { table: extension.schema },
                type: 'DEPENDS_ON',
                cardinality: 'ONE_TO_MANY',
                confidence: 1.0,
                metadata: { matchMethod: 'parser_match' },
                annotations: [`extension:${extName}`, `schema:${extension.schema}`]
            });
        }
    }
    
    return relationships;
}
