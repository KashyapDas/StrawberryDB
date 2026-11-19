"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PostgresReader = require("./readers/PostgresReader");
const MongooseGenerator = require("./generators/MongooseSchemaGenerator");
const MongooseConnector = require("./generators/MongooseConnector");
async function postgresToMongoose(sourceUrl, destinationUrl, tables = [], databaseName = "test", migrateData = false) {
    const postgresReader = new PostgresReader(sourceUrl);
    const mongooseConnector = new MongooseConnector();
    try {
        // Step 1: Read PostgreSQL schema metadata
        const metadata = await postgresReader.readSchema(tables);
        // Step 2: Connect to MongoDB
        await mongooseConnector.connect(destinationUrl, databaseName);
        // Step 3: Generate Mongoose schemas and register models
        const schemaGenerator = new MongooseGenerator();
        const models = await mongooseConnector.createModels(metadata.tables, schemaGenerator);
        const migrationResults = {};
        // Step 4: Migrate records if enabled
        if (migrateData) {
            for (const table of metadata.tables) {
                // Read PostgreSQL records
                const records = await postgresReader.readRecords(table.tableName);
                // Convert PostgreSQL records into MongoDB documents
                const documents = schemaGenerator.convertRecords(records, table);
                // Insert documents into MongoDB
                const result = await mongooseConnector.insertRecords(models[table.tableName], documents);
                migrationResults[table.tableName] = result;
            }
        }
        return {
            success: true,
            database: databaseName,
            tables: Object.keys(models),
            dataMigrated: migrateData,
            migrationResults,
            models,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`PostgreSQL to MongoDB migration failed: ${message}`);
    }
    finally {
        await Promise.allSettled([
            postgresReader.close(),
            mongooseConnector.close(),
        ]);
    }
}
module.exports = postgresToMongoose;
//# sourceMappingURL=postgresToMongoose.js.map