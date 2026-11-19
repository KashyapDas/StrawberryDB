"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
class MongooseConnector {
    connection;
    async connect(connectionString, databaseName = "test") {
        this.connection = await mongoose.createConnection(connectionString, {
            dbName: databaseName,
        }).asPromise();
        return this.connection;
    }
    async createModels(tables, schemaGenerator) {
        const models = {};
        for (const table of tables) {
            const schemaDefinition = schemaGenerator.generateSchema(table);
            const schema = new mongoose.Schema(schemaDefinition, {
                collection: table.tableName,
                timestamps: false,
            });
            const model = this.connection.model(table.tableName, schema);
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
    async insertRecords(model, records) {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
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
//# sourceMappingURL=MongooseConnector.js.map