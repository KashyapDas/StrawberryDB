const fs = require("fs");
const path = require("path");

class queryTracker {

    static trackQuery(query: string, operation: string, databaseType : string): void {

        if (!databaseType) {
            throw new Error(
                "StrawberryDB: Database is not connected."
            );
        }

        // Client project's current working directory
        const clientProjectPath = process.cwd();

        // track_files directory
        const trackFilesPath = path.join(
            clientProjectPath,
            "strawberry"
        );

        // Create track_files if it does not exist
        if (!fs.existsSync(trackFilesPath)) {
            fs.mkdirSync(trackFilesPath, {
                recursive: true
            });
        }

        // Select log file according to database
        let logFileName: string;

        if (databaseType === "mongodb") {
            logFileName = "mongodb.log";
        }
        else if (databaseType === "postgresql") {
            logFileName = "postgresql.log";
        }
        else {
            throw new Error(
                `StrawberryDB: Unsupported database type '${databaseType}'.`
            );
        }

        const logFilePath = path.join(
            trackFilesPath,
            logFileName
        );

        // Current timestamp
        const timestamp = new Date()
            .toISOString()
            .replace("T", " ")
            .replace("Z", "");

        // Log content
        const log = `
Timestamp : ${timestamp}
Database  : ${databaseType.toUpperCase()}
Operation : ${operation.toUpperCase()}
Query : ${query}

==================================================

`;

        // Create file if it doesn't exist,
        // otherwise append to existing file
        fs.appendFileSync(
            logFilePath,
            log,
            "utf8"
        );
    }
}

module.exports = {
    queryTracker
}