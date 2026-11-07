
/**
 * Represents metadata extracted from a database.
 * This metadata is shared by SQL and Mongoose schema generators.
 */

// Supported PostgreSQL column types
export type PostgreSQLDataType =
    | "smallint"
    | "integer"
    | "bigint"
    | "numeric"
    | "real"
    | "double precision"
    | "boolean"
    | "character"
    | "character varying"
    | "text"
    | "uuid"
    | "date"
    | "time"
    | "time with time zone"
    | "time without time zone"
    | "timestamp"
    | "timestamp with time zone"
    | "timestamp without time zone"
    | "json"
    | "jsonb"
    | "bytea"
    | "array"
    | "enum"
    | "user-defined"
    | "other";

// Column metadata
export interface ColumnMetadata {
    columnName: string;

    // Original PostgreSQL datatype
    dataType: PostgreSQLDataType;
    udtName: string;

    // Type properties
    maxLength?: number;
    precision?: number;
    scale?: number;
    arrayDimensions?: number;

    // Constraints and defaults
    isNullable: boolean;
    defaultExpression?: string;

    // Identity / generated columns
    isIdentity: boolean;
    identityGeneration?: "ALWAYS" | "BY DEFAULT";

    isGenerated: boolean;
    generatedExpression?: string;

    // Enum information
    enumValues?: string[];
}

// Primary key metadata
export interface PrimaryKeyMetadata {
    constraintName: string;
    columns: string[];
}

// Foreign key metadata
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

// Unique constraint metadata
export interface UniqueConstraintMetadata {
    constraintName: string;
    columns: string[];
}

// Check constraint metadata
export interface CheckConstraintMetadata {
    constraintName: string;
    expression: string;
}

// Index metadata
export interface IndexMetadata {
    indexName: string;
    columns: string[];
    isUnique: boolean;
    method: string;
    definition?: string;
}

// All table constraints
export interface TableConstraints {
    primaryKey?: PrimaryKeyMetadata;

    foreignKeys: ForeignKeyMetadata[];

    uniqueConstraints: UniqueConstraintMetadata[];

    checkConstraints: CheckConstraintMetadata[];
}

// Complete table metadata
export interface TableMetadata {
    schemaName: string;
    tableName: string;

    columns: ColumnMetadata[];

    constraints: TableConstraints;

    indexes: IndexMetadata[];
}

// Complete database metadata
export interface DatabaseMetadata {
    databaseType: "postgresql";

    tables: TableMetadata[];
}
