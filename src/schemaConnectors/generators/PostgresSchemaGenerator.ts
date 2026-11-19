
class PostgresSchemaGenerator {
  inferTableSchema(collectionName: string, records: any[]) {
    const fields = new Set<string>();

    // Collect all fields across the collection's documents
    for (const record of records) {
      for (const field of Object.keys(record)) {
        fields.add(field);
      }
    }

    const columns = Array.from(fields).map((field) => {
      const values = records
        .map((record) => record[field])
        .filter((value) => value !== null && value !== undefined);

      return {
        sourceField: field,

        // MongoDB _id becomes PostgreSQL id
        columnName: field === "_id" ? "id" : field,

        dataType: this.inferDataType(values),

        isPrimaryKey: field === "_id",

        nullable: field !== "_id",
      };
    });

    return {
      tableName: collectionName,
      columns,
    };
  }

  private inferDataType(values: any[]) {
    if (values.length === 0) {
      return "JSONB";
    }

    const types = new Set(
      values.map((value) => {
        if (value?._bsontype === "ObjectId") return "OBJECTID";
        if (value instanceof Date) return "DATE";
        if (Array.isArray(value)) return "ARRAY";
        if (value === null) return "NULL";
        if (typeof value === "number") {
          return Number.isInteger(value) ? "INTEGER" : "FLOAT";
        }

        return typeof value;
      })
    );

    if (types.size === 1) {
      const type = Array.from(types)[0];

      switch (type) {
        case "OBJECTID":
        case "string":
          return "TEXT";

        case "DATE":
          return "TIMESTAMP";

        case "INTEGER":
          return "BIGINT";

        case "FLOAT":
          return "DOUBLE PRECISION";

        case "boolean":
          return "BOOLEAN";

        case "ARRAY":
        case "object":
          return "JSONB";

        default:
          return "JSONB";
      }
    }

    // Integer and floating-point values can share a numeric column
    if (
      [...types].every(
        (type) => type === "INTEGER" || type === "FLOAT"
      )
    ) {
      return "DOUBLE PRECISION";
    }

    // Mixed types are preserved using JSONB
    return "JSONB";
  }
}

module.exports = PostgresSchemaGenerator;
