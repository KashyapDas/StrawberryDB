"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class strawberryCore {
    // hold the database name the user need to use in their appliaction
    static databaseType;
    // fuinctionality - user just provide connection url and it should be connect automatically 
    static connectSandBox(url) {
        // check what database did the user need to connect 
        if (url.startsWith("mongodb")) {
            console.log("user passed the mongodb connection string..."); // actuall logic will be applied
            strawberryCore.databaseType = "mongodb";
        }
        else if (url.startsWith("postgresql")) {
            console.log("user passed the postgresql connection string..."); // actual logic will be applied
            strawberryCore.databaseType = "postgresql";
        }
    }
    // functionality - function that let the user to create table in mongodb (NOSQL) or postgresql (SQL)
    static createSchema(modelName, schemaDefination) {
        const dtype = strawberryCore.databaseType;
        if (dtype === "mongodb") {
            console.log("Create the table in the Mongodb..."); // Replace this using actual logic
        }
        else if (dtype === "postgresql") {
            console.log("Create the table in the Postgresql..."); // Replace this using actual logic
        }
    }
    static insertRecord(modelName, record) {
        // logic of insert records in the table will be implemented...
    }
}
module.exports = { strawberryCore };
//# sourceMappingURL=strawberryCore.js.map