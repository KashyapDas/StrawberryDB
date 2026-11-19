
const mongoose = require("mongoose");

class MongoReader {
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

  async getCollections() {
    const collections = await this.connection.db
      .listCollections({}, { nameOnly: true })
      .toArray();

    return collections.map((collection: any) => collection.name);
  }

  async readRecords(collectionName: string) {
    try {
      const collection = this.connection.db.collection(collectionName);

      return await collection.find({}).toArray();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      throw new Error(
        `Failed to read records from ${collectionName}: ${message}`
      );
    }
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

module.exports = MongoReader;
