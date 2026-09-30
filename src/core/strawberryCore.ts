import pg = require("pg");
import mongoose = require("mongoose");
const Pool = pg.Pool;

type StrawberryType = "string" | "int" | "float" | "boolean" | "date" | "objectId" | "array" | "object";

const strawberryType: StrawberryType[] = [
    "string",
    "int",
    "float",
    "boolean",
    "date",
    "objectId",
    "array",
    "object"
];

type strawberryField = {
    type : StrawberryType,
    required? : boolean,
    default? : boolean,
    unique? : boolean,
    min? : number,
    max? : number,
    minLength? : number,
    maxLength? : number,
    uppercase? : boolean,
    lowercase? : boolean 
    ref? : string
}

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

    static async createSchema(schemaName : string, schemaDefination: Record<string, any>){
        // create schema for mongodb
        if(this.isConnected == true && strawberryCore.databaseType === "mongodb"){
            // here the schemaDefination is an object - {name : {}, age : {}, email: {} }
            const mongooseSchemaDefinition: Record<string, any> = {};

            for(const fieldName in schemaDefination)
            {
                const field = schemaDefination[fieldName];
                let mongooseType;
                // check the type of each specific field
                if(!strawberryType.includes(field.type)){
                    console.log("Type not match");
                    return;
                }
                else if(field.type === "string"){
                    mongooseType = String;
                }
                else if(field.type === "int"){
                    mongooseType = Number;
                }
                else if(field.type === "float"){
                    mongooseType = Number;
                }
                else if(field.type === "boolean"){
                    mongooseType = Boolean;
                }
                else if(field.type === "date"){
                    mongooseType = Date;
                }
                else if(field.type === "objectId"){
                    mongooseType = mongoose.Schema.Types.ObjectId;
                }
                else if(field.type === "array"){
                    mongooseType = Array;
                }
                else if(field.type === "object"){
                    mongooseType = Object;
                }

                 // create the mongoose field object
                mongooseSchemaDefinition[fieldName] = {
                    type: mongooseType,

                    required: field.required,

                    default: field.default,

                    unique: field.unique,

                    min: field.min,

                    max: field.max,

                    minlength: field.minLength,

                    maxlength: field.maxLength,

                    uppercase: field.uppercase,

                    lowercase: field.lowercase
                };
            }
             // create real mongoose schema
            const newSchema = new mongoose.Schema(
                mongooseSchemaDefinition
            );

            // create mongoose model dynamically
            const newModel = mongoose.model(
                schemaName,
                newSchema
            );
            // return the created model
            return newModel;
        }
        // create table for postgresql
        if(this.isConnected == true && strawberryCore.databaseType === "postgresql"){
            console.log(schemaDefination);
        }

    }
}

module.exports = {strawberryCore};


