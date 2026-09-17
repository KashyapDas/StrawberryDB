import pg = require("pg");
import mongoose = require("mongoose");
const Pool = pg.Pool;

class strawberryCore{
    // data members of the class
    private static databaseType  : string | undefined;
    private static databaseURL : typeof mongoose | pg.Pool | undefined;
    private static isConnected : boolean = false;
    // member functions of the class
    static async connectSandBox(url : string){
        // check what database did the user need to connect 
        if(url.startsWith("mongodb")){
            try{
                strawberryCore.databaseURL = await mongoose.connect(url);
                if(strawberryCore.databaseURL.connection.readyState === 1){
                    strawberryCore.databaseType = "mongodb";  
                    strawberryCore.isConnected = true;
                }
            }catch(error){
                console.log('Connection failed...',error);
                    strawberryCore.isConnected = false;
            }
        }
        else if(url.startsWith("postgresql")){
            try{
                strawberryCore.databaseURL = new Pool({
                    connectionString : url
                });
                await strawberryCore.databaseURL.query("SELECT 1");
                strawberryCore.databaseType = "postgresql";
                strawberryCore.isConnected = true;
                console.log("postgresql database connected..");
            }catch(error){
                console.log('Connection failed');
            }
        } 
        else {
            console.log("Unsupported database URL");
            strawberryCore.isConnected = false;
        }
    }
}

module.exports = {strawberryCore};


