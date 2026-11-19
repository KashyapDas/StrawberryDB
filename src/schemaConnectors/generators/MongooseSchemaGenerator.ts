
class MongooseGenerator {
  
  generateSchema(tableMetadata: any) {
    const schemaDefinition: Record<string, any> = {};
    const primaryKeys = tableMetadata.primaryKeys || [];

    if (primaryKeys.length > 1) {
      throw new Error(
        `Composite primary keys are not supported yet: ${tableMetadata.tableName}`
      );
    }

    for (const column of tableMetadata.columns) {
      // Map the PostgreSQL primary key to MongoDB _id
      const fieldName = column.isPrimaryKey
        ? "_id"
        : column.name;

      schemaDefinition[fieldName] = {
        type: this.mapDataType(column.dataType),
        required: !column.nullable || column.isPrimaryKey,
      };

      if (column.defaultValue !== null) {
        schemaDefinition[fieldName].default =
          this.mapDefaultValue(column.defaultValue);
      }

      // MongoDB _id is inherently unique
      if (column.isUnique && !column.isPrimaryKey) {
        schemaDefinition[fieldName].unique = true;
      }
    }

    return schemaDefinition;
  }


  private mapDataType(dataType: string) {
    switch (dataType) {
      case "VARCHAR":
      case "TEXT":
      case "UUID":
        return String;

      case "INTEGER":
      case "SMALLINT":
      case "BIGINT":
      case "DOUBLE PRECISION":
      case "NUMERIC":
        return Number;

      case "BOOLEAN":
        return Boolean;

      case "DATE":
      case "TIMESTAMP":
        return Date;

      case "JSON":
      case "JSONB":
        return Object;

      case "ARRAY":
        return Array;

      default:
        return String;
    }
  }

  private mapDefaultValue(value: string) {
    if (value === "true") return true;
    if (value === "false") return false;

    const numericValue = Number(value);

    if (value !== "" && !Number.isNaN(numericValue)) {
      return numericValue;
    }

    return value;
  }


  convertRecords(records: any[], tableMetadata: any) {
    const primaryKeys = tableMetadata.primaryKeys || [];

    return records.map((record) => {
      const document: Record<string, any> = { ...record };

      // Map a single PostgreSQL primary key to MongoDB _id
      if (primaryKeys.length === 1) {
        const primaryKey = primaryKeys[0];

        document._id = document[primaryKey];

        if (primaryKey !== "_id") {
          delete document[primaryKey];
        }
      }

      // Composite primary keys are not handled yet
      if (primaryKeys.length > 1) {
        throw new Error(
          `Composite primary keys are not supported yet in table: ${tableMetadata.tableName}`
        );
      }

      return document;
    });
  }

}

module.exports = MongooseGenerator;
