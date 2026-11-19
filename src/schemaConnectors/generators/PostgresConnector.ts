
const { Pool } = require("pg");

class PostgresConnector {
  private pool: InstanceType<typeof Pool>;

  constructor() {
    this.pool = null as any;
  }

  async connect(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });

    await this.pool.query("SELECT 1");

    return this.pool;
  }

  async createTables(tables: any[]) {
    for (const table of tables) {
      if (!table.columns || table.columns.length === 0) {
        throw new Error(
          `Cannot create table ${table.tableName}: no columns were inferred.`
        );
      }

      const columnDefinitions = table.columns.map((column: any) => {
        const columnName = `"${column.columnName.replace(/"/g, '""')}"`;

        return `${columnName} ${column.dataType}${
          column.nullable ? "" : " NOT NULL"
        }`;
      });

      const primaryKey = table.columns.find(
        (column: any) => column.isPrimaryKey
      );

      if (primaryKey) {
        const primaryKeyName =
          `"${primaryKey.columnName.replace(/"/g, '""')}"`;

        columnDefinitions.push(
          `PRIMARY KEY (${primaryKeyName})`
        );
      }

      const tableName =
        `"${table.tableName.replace(/"/g, '""')}"`;

      const query = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          ${columnDefinitions.join(", ")}
        )
      `;

      await this.pool.query(query);
    }
  }


    async insertRecords(table: any, records: any[]) {
    try {
        if (records.length === 0) {
        return {
            insertedCount: 0,
        };
        }

        const tableName =
        `"${table.tableName.replace(/"/g, '""')}"`;

        const columns = table.columns;

        let insertedCount = 0;

        for (const record of records) {
        const columnNames = columns.map(
            (column: any) =>
            `"${column.columnName.replace(/"/g, '""')}"`
        );

        const values = columns.map((column: any) => {
            const value = record[column.sourceField];

            if (value === undefined || value === null) {
            return null;
            }

            // Convert ObjectId to its string representation
            if (value?._bsontype === "ObjectId") {
            return value.toString();
            }

            // Convert objects and arrays into JSON strings for JSONB
            if (
            column.dataType === "JSONB" &&
            typeof value === "object"
            ) {
            return JSON.stringify(value);
            }

            return value;
        });

        const placeholders = values.map(
            (_: any, index: number) => `$${index + 1}`
        );

        const query = `
            INSERT INTO ${tableName}
            (${columnNames.join(", ")})
            VALUES (${placeholders.join(", ")})
        `;

        await this.pool.query(query, values);

        insertedCount++;
        }

        return {
        insertedCount,
        };
    } catch (error) {
        const message =
        error instanceof Error ? error.message : String(error);

        throw new Error(
        `Failed to insert records into ${table.tableName}: ${message}`
        );
    }
    }


  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = PostgresConnector;
