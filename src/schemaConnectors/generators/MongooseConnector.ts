
const mongoose = require("mongoose");

class MongooseConnector {
  private connection: any;

  
  async connect(connectionString: string, databaseName: string = "test") {
    this.connection = await mongoose.createConnection(
      connectionString,
      {
        dbName: databaseName,
      }
    ).asPromise();

    return this.connection;
  }


  
  async createModels(tables: any[], schemaGenerator: any) {
    const models: Record<string, any> = {};

    for (const table of tables) {
      const schemaDefinition = schemaGenerator.generateSchema(table);

      const schema = new mongoose.Schema(schemaDefinition, {
        collection: table.tableName,
        timestamps: false,
      });

      const model = this.connection.model(
        table.tableName,
        schema
      );

      models[table.tableName] = model;

      // Check whether the collection already exists
      const collectionExists = await this.connection.db
        .listCollections({ name: table.tableName })
        .hasNext();

      // Create an empty collection if it does not exist
      if (!collectionExists) {
        await model.createCollection();
      }
    }

    return models;
  }



  async insertRecords(model: any, records: any[]) {
    try {
      if (records.length === 0) {
        return {
          insertedCount: 0,
        };
      }

      // ordered: true stops insertion when a duplicate or
      // another insertion error occurs.
      const insertedRecords = await model.insertMany(records, {
        ordered: true,
      });

      return {
        insertedCount: insertedRecords.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      throw new Error(`MongoDB record insertion failed: ${message}`);
    }
  }



  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = MongooseConnector;
