"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Pool } = require("pg");
class PostgresReader {
    pool;
    constructor(connectionString) {
        this.pool = new Pool({
            connectionString,
        });
    }
    async readSchema(selectedTables = []) {
        try {
            // 1. Get all tables from the public schema.
            const tableResult = await this.pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
            const availableTables = tableResult.rows.map((row) => row.table_name);
            // 2. Select requested tables or all tables.
            const tablesToRead = selectedTables.length === 0
                ? availableTables
                : selectedTables;
            // 3. Validate requested tables.
            const invalidTables = tablesToRead.filter((table) => !availableTables.includes(table));
            if (invalidTables.length > 0) {
                throw new Error(`Tables not found: ${invalidTables.join(", ")}`);
            }
            const tables = [];
            // 4. Extract metadata for each table.
            for (const tableName of tablesToRead) {
                const columnResult = await this.pool.query(`
          SELECT
            c.column_name,
            c.data_type,
            c.udt_name,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,

            EXISTS (
              SELECT 1
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
               AND tc.table_name = kcu.table_name
              WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = c.table_schema
                AND tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
            ) AS is_primary_key,

            EXISTS (
              SELECT 1
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
               AND tc.table_schema = kcu.table_schema
               AND tc.table_name = kcu.table_name
              WHERE tc.constraint_type = 'UNIQUE'
                AND tc.table_schema = c.table_schema
                AND tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
            ) AS is_unique

          FROM information_schema.columns c

          WHERE c.table_schema = 'public'
            AND c.table_name = $1

          ORDER BY c.ordinal_position;
          `, [tableName]);
                // 5. Map PostgreSQL datatypes.
                const columns = columnResult.rows.map((row) => {
                    const dataType = this.mapDataType(row.data_type, row.udt_name);
                    return {
                        name: row.column_name,
                        dataType,
                        nullable: row.is_nullable === "YES",
                        defaultValue: row.column_default,
                        maxLength: row.character_maximum_length,
                        precision: row.numeric_precision,
                        scale: row.numeric_scale,
                        isPrimaryKey: row.is_primary_key,
                        isUnique: row.is_unique || row.is_primary_key,
                    };
                });
                // 6. Extract primary keys.
                const primaryKeys = columns
                    .filter((column) => column.isPrimaryKey)
                    .map((column) => column.name);
                // 7. Extract foreign keys.
                const foreignKeyResult = await this.pool.query(`
          SELECT
            kcu.column_name,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column

          FROM information_schema.table_constraints tc

          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema

          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
           AND tc.table_schema = ccu.table_schema

          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = $1;
          `, [tableName]);
                const foreignKeys = foreignKeyResult.rows.map((row) => ({
                    columnName: row.column_name,
                    referencedTable: row.referenced_table,
                    referencedColumn: row.referenced_column,
                }));
                // 8. Store table metadata.
                tables.push({
                    tableName,
                    columns,
                    primaryKeys,
                    foreignKeys,
                });
            }
            return { tables };
        }
        catch (error) {
            throw new Error(`PostgreSQL schema extraction failed: ${error.message || String(error)}`);
        }
    }
    // 9. Convert PostgreSQL datatypes.
    mapDataType(dataType, udtName) {
        if (dataType === "character varying")
            return "VARCHAR";
        if (dataType === "character")
            return "VARCHAR";
        if (dataType === "text")
            return "TEXT";
        if (dataType === "integer")
            return "INTEGER";
        if (dataType === "smallint")
            return "SMALLINT";
        if (dataType === "bigint")
            return "BIGINT";
        if (dataType === "double precision") {
            return "DOUBLE PRECISION";
        }
        if (dataType === "numeric")
            return "NUMERIC";
        if (dataType === "boolean")
            return "BOOLEAN";
        if (dataType === "date")
            return "DATE";
        if (dataType === "timestamp without time zone" ||
            dataType === "timestamp with time zone") {
            return "TIMESTAMP";
        }
        if (dataType === "json")
            return "JSON";
        if (dataType === "jsonb")
            return "JSONB";
        if (dataType === "uuid")
            return "UUID";
        if (dataType === "ARRAY" || udtName.startsWith("_")) {
            return "ARRAY";
        }
        return "UNKNOWN";
    }
    async readRecords(tableName) {
        try {
            // Escape the table name as a PostgreSQL identifier
            const escapedTableName = tableName.replace(/"/g, '""');
            const result = await this.pool.query(`SELECT * FROM "public"."${escapedTableName}"`);
            return result.rows;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to read records from ${tableName}: ${message}`);
        }
    }
    // 10. Close PostgreSQL connection.
    async close() {
        await this.pool.end();
    }
}
module.exports = PostgresReader;
//# sourceMappingURL=PostgresReader.js.map