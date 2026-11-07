/**
 * Represents metadata extracted from a database.
 * This metadata is shared by SQL and Mongoose schema generators.
 */
export type PostgreSQLDataType = "smallint" | "integer" | "bigint" | "numeric" | "real" | "double precision" | "boolean" | "character" | "character varying" | "text" | "uuid" | "date" | "time" | "time with time zone" | "time without time zone" | "timestamp" | "timestamp with time zone" | "timestamp without time zone" | "json" | "jsonb" | "bytea" | "array" | "enum" | "user-defined" | "other";
export interface ColumnMetadata {
    columnName: string;
    dataType: PostgreSQLDataType;
    udtName: string;
    maxLength?: number;
    precision?: number;
    scale?: number;
    arrayDimensions?: number;
    isNullable: boolean;
    defaultExpression?: string;
    isIdentity: boolean;
    identityGeneration?: "ALWAYS" | "BY DEFAULT";
    isGenerated: boolean;
    generatedExpression?: string;
    enumValues?: string[];
}
export interface PrimaryKeyMetadata {
    constraintName: string;
    columns: string[];
}
export interface ForeignKeyMetadata {
    constraintName: string;
    columns: string[];
    referencedSchema: string;
    referencedTable: string;
    referencedColumns: string[];
    onUpdate: string;
    onDelete: string;
    isDeferrable: boolean;
    initiallyDeferred: boolean;
}
export interface UniqueConstraintMetadata {
    constraintName: string;
    columns: string[];
}
export interface CheckConstraintMetadata {
    constraintName: string;
    expression: string;
}
export interface IndexMetadata {
    indexName: string;
    columns: string[];
    isUnique: boolean;
    method: string;
    definition?: string;
}
export interface TableConstraints {
    primaryKey?: PrimaryKeyMetadata;
    foreignKeys: ForeignKeyMetadata[];
    uniqueConstraints: UniqueConstraintMetadata[];
    checkConstraints: CheckConstraintMetadata[];
}
export interface TableMetadata {
    schemaName: string;
    tableName: string;
    columns: ColumnMetadata[];
    constraints: TableConstraints;
    indexes: IndexMetadata[];
}
export interface DatabaseMetadata {
    databaseType: "postgresql";
    tables: TableMetadata[];
}
//# sourceMappingURL=SchemaMetadata.d.ts.map