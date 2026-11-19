export type PostgresDataType = "VARCHAR" | "TEXT" | "INTEGER" | "SMALLINT" | "BIGINT" | "DOUBLE PRECISION" | "NUMERIC" | "BOOLEAN" | "DATE" | "TIMESTAMP" | "JSON" | "JSONB" | "UUID" | "ARRAY" | "UNKNOWN";
export interface ColumnMetadata {
    name: string;
    dataType: PostgresDataType;
    nullable: boolean;
    defaultValue: string | null;
    maxLength: number | null;
    precision: number | null;
    scale: number | null;
    isPrimaryKey: boolean;
    isUnique: boolean;
}
export interface ForeignKeyMetadata {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
}
export interface TableMetadata {
    tableName: string;
    columns: ColumnMetadata[];
    primaryKeys: string[];
    foreignKeys: ForeignKeyMetadata[];
}
export interface DatabaseMetadata {
    tables: TableMetadata[];
}
//# sourceMappingURL=SchemaMetadata.d.ts.map