
const MongoReader = require("./readers/MongoReader");
const PostgresSchemaGenerator = require("./generators/PostgresSchemaGenerator");
const PostgresConnector = require("./generators/PostgresConnector");

async function mongoToPostgres(
  sourceUrl: string,
  destinationUrl: string,
  collections: string[] = [],
  databaseName: string = "test",
  migrateData: boolean = false
) {
  const mongoReader = new MongoReader();
  const postgresConnector = new PostgresConnector();

  try {
    // Step 1: Connect to MongoDB
    await mongoReader.connect(sourceUrl, databaseName);

    // Step 2: Discover collections
    const availableCollections = await mongoReader.getCollections();

    const selectedCollections =
      collections.length === 0
        ? availableCollections
        : collections;

    // Validate requested collections
    const missingCollections = selectedCollections.filter(
      (name: string) => !availableCollections.includes(name)
    );

    if (missingCollections.length > 0) {
      throw new Error(
        `Collections not found: ${missingCollections.join(", ")}`
      );
    }

    // Step 3: Connect to PostgreSQL
    await postgresConnector.connect(destinationUrl);

    const schemaGenerator = new PostgresSchemaGenerator();

    const migrationResults: Record<string, any> = {};
    const tableSchemas: any[] = [];
    const skippedCollections: string[] = [];

    // Step 4: Read records and infer schemas
    for (const collectionName of selectedCollections) {
      const records = await mongoReader.readRecords(collectionName);

      // Skip empty collections
      if (records.length === 0) {
        skippedCollections.push(collectionName);

        migrationResults[collectionName] = {
          sourceRecords: 0,
          insertedCount: 0,
          status: "skipped",
          reason: "Cannot infer schema from an empty collection",
        };

        continue;
      }

      // Infer PostgreSQL schema
      const tableSchema = schemaGenerator.inferTableSchema(
        collectionName,
        records
      );

      tableSchemas.push(tableSchema);

      migrationResults[collectionName] = {
        sourceRecords: records.length,
        insertedCount: 0,
        status: migrateData ? "pending" : "schema_created",
      };

      // Retain records for the insertion stage
      migrationResults[collectionName].records = records;
    }

    // Step 5: Create PostgreSQL tables
    await postgresConnector.createTables(tableSchemas);

    // Step 6: Migrate records if enabled
    if (migrateData) {
      for (const table of tableSchemas) {
        const records = migrationResults[table.tableName].records;

        const result = await postgresConnector.insertRecords(
          table,
          records
        );

        migrationResults[table.tableName].insertedCount =
          result.insertedCount;

        migrationResults[table.tableName].status = "completed";
      }
    }

    // Step 7: Remove temporary record arrays
    for (const collectionName of selectedCollections) {
      delete migrationResults[collectionName].records;
    }

    return {
      success: true,
      database: databaseName,
      tables: tableSchemas.map((table: any) => table.tableName),
      dataMigrated: migrateData,
      skippedCollections,
      migrationResults,
    };

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    throw new Error(
      `MongoDB to PostgreSQL migration failed: ${message}`
    );

  } finally {
    await Promise.allSettled([
      mongoReader.close(),
      postgresConnector.close(),
    ]);
  }
}

module.exports = mongoToPostgres;
