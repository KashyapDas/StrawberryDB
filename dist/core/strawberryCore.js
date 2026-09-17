"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg = require("pg");
const mongoose = require("mongoose");
const Pool = pg.Pool;
class strawberryCore {
    // hold the database name the user need to use in their appliaction
    static databaseType;
    static databaseURL;
    static isConnected = false;
    // fuinctionality - user just provide connection url and it should be connect automatically 
    static async connectSandBox(url) {
        // check what database did the user need to connect 
        if (url.startsWith("mongodb")) {
            try {
                strawberryCore.databaseURL = await mongoose.connect(url);
                if (strawberryCore.databaseURL.connection.readyState === 1) {
                    strawberryCore.databaseType = "mongodb";
                    strawberryCore.isConnected = true;
                    console.log("mongodb database connected..");
                }
            }
            catch (error) {
                console.log('Connection failed...', error);
                strawberryCore.isConnected = false;
            }
        }
        else if (url.startsWith("postgresql")) {
            try {
                strawberryCore.databaseURL = new Pool({
                    connectionString: url
                });
                await strawberryCore.databaseURL.query("SELECT 1");
                strawberryCore.databaseType = "postgresql";
                strawberryCore.isConnected = true;
                console.log("postgresql database connected..");
            }
            catch (error) {
                console.log('Connection failed');
                strawberryCore.isConnected = false;
            }
        }
    }
}
module.exports = { strawberryCore };
//# sourceMappingURL=strawberryCore.js.map