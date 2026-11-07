const { Pool } = require("pg");

// TypeScript type-only references. These are erased during compilation,
// so the runtime module system remains CommonJS (require/module.exports).
type DatabaseMetadata = import("../types/SchemaMetadata").DatabaseMetadata;
type TableMetadata = import("../types/SchemaMetadata").TableMetadata;
type ColumnMetadata = import("../types/SchemaMetadata").ColumnMetadata;
type PrimaryKeyMetadata = import("../types/SchemaMetadata").PrimaryKeyMetadata;
type ForeignKeyMetadata = import("../types/SchemaMetadata").ForeignKeyMetadata;
type UniqueConstraintMetadata = import("../types/SchemaMetadata").UniqueConstraintMetadata;
type CheckConstraintMetadata = import("../types/SchemaMetadata").CheckConstraintMetadata;
type IndexMetadata = import("../types/SchemaMetadata").IndexMetadata;

class PostgresReader {
    /**
     * Reads schema metadata from PostgreSQL.
     *
     * @param connectionString PostgreSQL connection URL.
     * @param tableNames Tables to read. An empty array reads all ordinary
     *                   tables in the public schema.
     *
     * Table names can be "users" or schema-qualified, e.g. "public.users".
     */
    static async readDatabase(
        connectionString: string,
        tableNames: string[] = []
    ): Promise<DatabaseMetadata> {
        if (!connectionString || typeof connectionString !== "string") {
            throw new Error("A valid PostgreSQL connection string is required.");
        }
        if(!connectionString.startsWith("postgresql")){
            throw new Error("Invaid Postgresql connection string");
        }

        if (!Array.isArray(tableNames)) {
            throw new Error("tableNames must be an array.");
        }

        const pool = new Pool({ connectionString });

        try {
            await pool.query("SELECT 1");

            const selectedTables = await this.getTables(pool, tableNames);

            if (selectedTables.length === 0) {
                throw new Error("No eligible PostgreSQL tables found.");
            }

            const schemas = selectedTables.map((table: any) => table.schemaName);
            const names = selectedTables.map((table: any) => table.tableName);

            const [columns, enumValues, constraints, indexes] = await Promise.all([
                this.getColumns(pool, schemas, names),
                this.getEnumValues(pool, schemas, names),
                this.getConstraints(pool, schemas, names),
                this.getIndexes(pool, schemas, names)
            ]);

            const tables: TableMetadata[] = selectedTables.map((table: any) => {
                const tableKey = `${table.schemaName}.${table.tableName}`;

                const tableColumns: ColumnMetadata[] = columns
                    .filter((column: any) =>
                        column.schemaName === table.schemaName &&
                        column.tableName === table.tableName
                    )
                    .map((column: any) => {
                        const typeKey = `${column.udtSchema}.${column.udtName}`;

                        const metadata: ColumnMetadata = {
                            columnName: column.columnName,
                            dataType: this.normalizeDataType(
                                column.dataType,
                                column.typeKind
                            ),
                            udtName: column.udtName,
                            isNullable: column.isNullable === "YES",
                            isIdentity: column.isIdentity === "YES",
                            isGenerated: column.isGenerated === "ALWAYS"
                        };

                        if (column.maxLength !== null) {
                            metadata.maxLength = Number(column.maxLength);
                        }

                        if (column.precision !== null) {
                            metadata.precision = Number(column.precision);
                        }

                        if (column.scale !== null) {
                            metadata.scale = Number(column.scale);
                        }

                        if (Number(column.arrayDimensions) > 0) {
                            metadata.arrayDimensions = Number(column.arrayDimensions);
                        }

                        if (column.defaultExpression !== null) {
                            metadata.defaultExpression = column.defaultExpression;
                        }

                        if (column.identityGeneration) {
                            metadata.identityGeneration = column.identityGeneration;
                        }

                        if (column.generatedExpression) {
                            metadata.generatedExpression = column.generatedExpression;
                        }

                        if (enumValues.has(typeKey)) {
                            const values = enumValues.get(typeKey);
                            if (values !== undefined) {
                                metadata.enumValues = values;
                            }
                        }

                        return metadata;
                    });

                const tableConstraints = constraints.get(tableKey) || {
                    foreignKeys: [],
                    uniqueConstraints: [],
                    checkConstraints: []
                };

                return {
                    schemaName: table.schemaName,
                    tableName: table.tableName,
                    columns: tableColumns,
                    constraints: tableConstraints,
                    indexes: indexes.get(tableKey) || []
                };
            });

            return {
                databaseType: "postgresql",
                tables
            };
        } catch (error: any) {
            throw new Error(
                `PostgreSQL schema reading failed: ${
                    error && error.message ? error.message : String(error)
                }`
            );
        } finally {
            await pool.end();
        }
    }

    /**
     * Finds the requested ordinary tables.
     * An empty tableNames array means all ordinary tables in public.
     */
    private static async getTables(
        pool: any,
        tableNames: string[]
    ): Promise<{ schemaName: string; tableName: string }[]> {
        if (tableNames.length === 0) {
            const result = await pool.query(`
                SELECT
                    table_schema AS "schemaName",
                    table_name AS "tableName"
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `);

            return result.rows;
        }

        const requested = tableNames.map((name: string) => {
            if (typeof name !== "string" || !name.trim()) {
                throw new Error(`Invalid table name: ${String(name)}`);
            }

            const parts = name.split(".");

            if (
                parts.length > 2 ||
                parts.some((part: string) => !part.trim())
            ) {
                throw new Error(`Invalid table name: ${name}`);
            }

            return {
                schemaName: parts.length === 2 ? parts[0] : "public",
                tableName: parts.length === 2 ? parts[1] : parts[0]
            };
        });

        const uniqueNames = new Set(
            requested.map((table: any) =>
                `${table.schemaName}.${table.tableName}`
            )
        );

        if (uniqueNames.size !== requested.length) {
            throw new Error("Duplicate table names were provided.");
        }

        const result = await pool.query(
            `
            SELECT
                t.table_schema AS "schemaName",
                t.table_name AS "tableName"
            FROM information_schema.tables AS t
            JOIN unnest($1::text[], $2::text[])
                AS requested(schema_name, table_name)
              ON t.table_schema = requested.schema_name
             AND t.table_name = requested.table_name
            WHERE t.table_type = 'BASE TABLE'
            ORDER BY t.table_schema, t.table_name;
            `,
            [
                requested.map((table: any) => table.schemaName),
                requested.map((table: any) => table.tableName)
            ]
        );

        if (result.rows.length !== requested.length) {
            const found = new Set(
                result.rows.map((row: any) =>
                    `${row.schemaName}.${row.tableName}`
                )
            );

            const missing = requested
                .filter((table: any) =>
                    !found.has(`${table.schemaName}.${table.tableName}`)
                )
                .map((table: any) =>
                    `${table.schemaName}.${table.tableName}`
                );

            throw new Error(
                `Tables not found or not ordinary tables: ${missing.join(", ")}`
            );
        }

        return result.rows;
    }

    /**
     * Reads column names, PostgreSQL types, nullability, defaults,
     * identity/generated properties, length, precision and scale.
     */
    private static async getColumns(
        pool: any,
        schemas: string[],
        names: string[]
    ): Promise<any[]> {
        const result = await pool.query(
            `
            SELECT
                c.table_schema AS "schemaName",
                c.table_name AS "tableName",
                c.column_name AS "columnName",
                c.data_type AS "dataType",
                c.udt_name AS "udtName",
                c.udt_schema AS "udtSchema",
                c.character_maximum_length AS "maxLength",
                c.numeric_precision AS "precision",
                c.numeric_scale AS "scale",
                c.is_nullable AS "isNullable",
                c.column_default AS "defaultExpression",
                c.is_identity AS "isIdentity",
                c.identity_generation AS "identityGeneration",
                c.is_generated AS "isGenerated",
                c.generation_expression AS "generatedExpression",
                t.typtype AS "typeKind",
                a.attndims AS "arrayDimensions"
            FROM information_schema.columns AS c
            JOIN pg_namespace AS ns
              ON ns.nspname = c.table_schema
            JOIN pg_class AS tbl
              ON tbl.relnamespace = ns.oid
             AND tbl.relname = c.table_name
            JOIN pg_attribute AS a
              ON a.attrelid = tbl.oid
             AND a.attname = c.column_name
             AND a.attnum > 0
             AND NOT a.attisdropped
            JOIN pg_type AS t
              ON t.oid = a.atttypid
            WHERE (c.table_schema, c.table_name) IN (
                SELECT *
                FROM unnest($1::text[], $2::text[])
            )
            ORDER BY
                c.table_schema,
                c.table_name,
                c.ordinal_position;
            `,
            [schemas, names]
        );

        return result.rows;
    }

    /**
     * Reads enum labels for enum types used by the selected tables.
     */
    private static async getEnumValues(
        pool: any,
        schemas: string[],
        names: string[]
    ): Promise<Map<string, string[]>> {
        const result = await pool.query(
            `
            SELECT
                ns.nspname AS "typeSchema",
                t.typname AS "typeName",
                e.enumlabel AS "enumValue"
            FROM pg_type AS t
            JOIN pg_namespace AS ns
              ON ns.oid = t.typnamespace
            JOIN pg_enum AS e
              ON e.enumtypid = t.oid
            WHERE EXISTS (
                SELECT 1
                FROM information_schema.columns AS c
                WHERE (c.table_schema, c.table_name) IN (
                    SELECT *
                    FROM unnest($1::text[], $2::text[])
                )
                  AND c.udt_schema = ns.nspname
                  AND c.udt_name = t.typname
            )
            ORDER BY ns.nspname, t.typname, e.enumsortorder;
            `,
            [schemas, names]
        );

        const enumMap = new Map<string, string[]>();

        for (const row of result.rows) {
            const key = `${row.typeSchema}.${row.typeName}`;

            if (!enumMap.has(key)) {
                enumMap.set(key, []);
            }

            enumMap.get(key)!.push(row.enumValue);
        }

        return enumMap;
    }

    /**
     * Reads primary keys, foreign keys, unique constraints and check constraints.
     */
    private static async getConstraints(
        pool: any,
        schemas: string[],
        names: string[]
    ): Promise<Map<string, TableMetadata["constraints"]>> {
        const result = await pool.query(
            `
            WITH selected_tables AS (
                SELECT *
                FROM unnest($1::text[], $2::text[])
                    AS selected(schema_name, table_name)
            )
            SELECT
                con.oid AS "constraintId",
                con.conname AS "constraintName",
                con.contype AS "constraintType",
                ns.nspname AS "schemaName",
                tbl.relname AS "tableName",
                ref_ns.nspname AS "referencedSchema",
                ref_tbl.relname AS "referencedTable",
                array_agg(att.attname ORDER BY key_col.ordinality)
                    FILTER (WHERE att.attname IS NOT NULL) AS columns,
                array_agg(ref_att.attname ORDER BY key_col.ordinality)
                    FILTER (WHERE ref_att.attname IS NOT NULL) AS "referencedColumns",
                pg_get_constraintdef(con.oid) AS definition,
                con.confupdtype AS "onUpdate",
                con.confdeltype AS "onDelete",
                con.condeferrable AS "isDeferrable",
                con.condeferred AS "initiallyDeferred"
            FROM pg_constraint AS con
            JOIN pg_class AS tbl
              ON tbl.oid = con.conrelid
            JOIN pg_namespace AS ns
              ON ns.oid = tbl.relnamespace
            JOIN selected_tables AS selected
              ON selected.schema_name = ns.nspname
             AND selected.table_name = tbl.relname
            LEFT JOIN pg_class AS ref_tbl
              ON ref_tbl.oid = con.confrelid
            LEFT JOIN pg_namespace AS ref_ns
              ON ref_ns.oid = ref_tbl.relnamespace
            LEFT JOIN LATERAL
                unnest(con.conkey) WITH ORDINALITY
                AS key_col(attnum, ordinality)
              ON true
            LEFT JOIN pg_attribute AS att
              ON att.attrelid = con.conrelid
             AND att.attnum = key_col.attnum
            LEFT JOIN LATERAL
                unnest(con.confkey) WITH ORDINALITY
                AS ref_key(attnum, ordinality)
              ON ref_key.ordinality = key_col.ordinality
            LEFT JOIN pg_attribute AS ref_att
              ON ref_att.attrelid = con.confrelid
             AND ref_att.attnum = ref_key.attnum
            WHERE con.contype IN ('p', 'f', 'u', 'c')
            GROUP BY
                con.oid,
                ns.nspname,
                tbl.relname,
                ref_ns.nspname,
                ref_tbl.relname
            ORDER BY ns.nspname, tbl.relname, con.conname;
            `,
            [schemas, names]
        );

        const constraintMap = new Map<
            string,
            TableMetadata["constraints"]
        >();

        const actionMap: Record<string, string> = {
            a: "NO ACTION",
            r: "RESTRICT",
            c: "CASCADE",
            n: "SET NULL",
            d: "SET DEFAULT"
        };

        for (const row of result.rows) {
            const key = `${row.schemaName}.${row.tableName}`;

            if (!constraintMap.has(key)) {
                constraintMap.set(key, {
                    foreignKeys: [],
                    uniqueConstraints: [],
                    checkConstraints: []
                });
            }

            const current = constraintMap.get(key)!;

            switch (row.constraintType) {
                case "p": {
                    const primaryKey: PrimaryKeyMetadata = {
                        constraintName: row.constraintName,
                        columns: row.columns || []
                    };

                    current.primaryKey = primaryKey;
                    break;
                }

                case "f": {
                    const foreignKey: ForeignKeyMetadata = {
                        constraintName: row.constraintName,
                        columns: row.columns || [],
                        referencedSchema: row.referencedSchema,
                        referencedTable: row.referencedTable,
                        referencedColumns: row.referencedColumns || [],
                        onUpdate: actionMap[row.onUpdate] || "NO ACTION",
                        onDelete: actionMap[row.onDelete] || "NO ACTION",
                        isDeferrable: row.isDeferrable,
                        initiallyDeferred: row.initiallyDeferred
                    };

                    current.foreignKeys.push(foreignKey);
                    break;
                }

                case "u": {
                    const uniqueConstraint: UniqueConstraintMetadata = {
                        constraintName: row.constraintName,
                        columns: row.columns || []
                    };

                    current.uniqueConstraints.push(uniqueConstraint);
                    break;
                }

                case "c": {
                    const checkConstraint: CheckConstraintMetadata = {
                        constraintName: row.constraintName,
                        expression: row.definition
                    };

                    current.checkConstraints.push(checkConstraint);
                    break;
                }
            }
        }

        return constraintMap;
    }

    /**
     * Reads standalone indexes. Indexes backing primary-key or unique
     * constraints are excluded because those are already represented
     * in the constraints metadata.
     */
    private static async getIndexes(
        pool: any,
        schemas: string[],
        names: string[]
    ): Promise<Map<string, IndexMetadata[]>> {
        const result = await pool.query(
            `
            SELECT
                ns.nspname AS "schemaName",
                tbl.relname AS "tableName",
                idx.relname AS "indexName",
                ARRAY(
                    SELECT pg_get_indexdef(
                        i.indexrelid,
                        position,
                        true
                    )
                    FROM generate_series(1, i.indnkeyatts) AS position
                    ORDER BY position
                ) AS columns,
                i.indisunique AS "isUnique",
                am.amname AS method,
                pg_get_indexdef(i.indexrelid) AS definition
            FROM pg_index AS i
            JOIN pg_class AS tbl
              ON tbl.oid = i.indrelid
            JOIN pg_namespace AS ns
              ON ns.oid = tbl.relnamespace
            JOIN pg_class AS idx
              ON idx.oid = i.indexrelid
            JOIN pg_am AS am
              ON am.oid = idx.relam
            WHERE (ns.nspname, tbl.relname) IN (
                SELECT *
                FROM unnest($1::text[], $2::text[])
            )
              AND NOT i.indisprimary
              AND NOT EXISTS (
                  SELECT 1
                  FROM pg_constraint AS con
                  WHERE con.conindid = i.indexrelid
              )
            ORDER BY ns.nspname, tbl.relname, idx.relname;
            `,
            [schemas, names]
        );

        const indexMap = new Map<string, IndexMetadata[]>();

        for (const row of result.rows) {
            const key = `${row.schemaName}.${row.tableName}`;

            if (!indexMap.has(key)) {
                indexMap.set(key, []);
            }

            const index: IndexMetadata = {
                indexName: row.indexName,
                columns: row.columns || [],
                isUnique: row.isUnique,
                method: row.method,
                definition: row.definition
            };

            indexMap.get(key)!.push(index);
        }

        return indexMap;
    }

    /**
     * Normalizes PostgreSQL's information_schema data_type value.
     */
    private static normalizeDataType(
        dataType: string,
        typeKind: string
    ): ColumnMetadata["dataType"] {
        const normalized = dataType.toLowerCase();

        if (normalized === "array") {
            return "array";
        }

        if (normalized === "user-defined") {
            return typeKind === "e" ? "enum" : "user-defined";
        }

        const supportedTypes: ColumnMetadata["dataType"][] = [
            "smallint",
            "integer",
            "bigint",
            "numeric",
            "real",
            "double precision",
            "boolean",
            "character",
            "character varying",
            "text",
            "uuid",
            "date",
            "time",
            "time without time zone",
            "time with time zone",
            "timestamp",
            "timestamp with time zone",
            "timestamp without time zone",
            "json",
            "jsonb",
            "bytea"
        ];

        if (
            supportedTypes.includes(
                normalized as ColumnMetadata["dataType"]
            )
        ) {
            return normalized as ColumnMetadata["dataType"];
        }

        return "other";
    }
}

module.exports = { PostgresReader };
