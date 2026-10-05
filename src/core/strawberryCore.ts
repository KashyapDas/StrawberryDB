import pg = require("pg");
import mongoose = require("mongoose");
const Pool = pg.Pool;

type StrawberryType = "string" | "int" | "float" | "boolean" | "date" | "array" | "object";

const strawberryType: StrawberryType[] = [
    "string",
    "int",
    "float",
    "boolean",
    "date",
    "array",
    "object"
];

type strawberryField = {
    type : StrawberryType,
    required? : boolean,
    default? : any,
    unique? : boolean,
    min? : number,
    max? : number,
    minLength? : number,
    maxLength? : number,
    uppercase? : boolean,
    lowercase? : boolean 
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

    static async createSchema(schemaName : string, schemaDefination: Record<string, any>, returnValue : boolean = false){
        // create schema for mongodb
        if(this.isConnected == true && strawberryCore.databaseType === "mongodb"){
            // here the schemaDefination is an object - {name : {}, age : {}, email: {} }
            const mongooseSchemaDefinition: Record<string, any> = {};
            for(const fieldName in schemaDefination)
            {
                const throwError = (msg: string): never => { throw new Error(msg); };
                const field : strawberryField = schemaDefination[fieldName];
                let mongooseType;
                // check if it doesnot contain _id or id field in the output
                for(const fieldname in schemaDefination){
                    if(fieldname === "_id"){
                        throw new Error(`"${fieldname}" is reserved by the strawberry class and cannot be used`);
                    }
                    if(fieldname === "id"){
                        throw new Error(`"${fieldname}" is reserved by the strawberry class and cannot be used`);
                    }
                }
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
                else if(field.type === "object"){
                    mongooseType = Object;
                }
                else if(field.type === "array"){
                    mongooseType = Array;
                }
                // the required field consist only two value - true or false
                let mongooseRequired : boolean = false;
                if(field.required !== undefined) {
                    if(typeof field.required !== "boolean") {
                        throwError(
                            `field.required of "${fieldName}" must be a boolean (true or false)`
                        );
                    }
                    mongooseRequired = field.required;
                }
                //  the default field must contain only two vaue - true or false
                let mongooseDefault: any = undefined;
                if(field.default !== undefined) {

                    if(field.type === "string") {
                        if(typeof field.default !== "string") {
                            throwError(`Default value of "${fieldName}" must be a string`);
                        }
                        mongooseDefault = field.default;
                    }
                    else if(field.type === "int") {
                        if(typeof field.default !== "number" || !Number.isInteger(field.default)) {
                            throwError(`Default value of "${fieldName}" must be an integer`);
                        }
                        mongooseDefault = field.default;
                    }
                    else if(field.type === "float") {
                        if(typeof field.default !== "number") {
                            throwError(`Default value of "${fieldName}" must be a number`);
                        }
                        mongooseDefault = field.default;
                    }
                    else if(field.type === "boolean") {
                        if(typeof field.default !== "boolean") {
                            throwError(`Default value of "${fieldName}" must be a boolean`);
                        }
                        mongooseDefault = field.default;
                    }
                    else if(field.type === "date") {
                        if(!(field.default instanceof Date)) {
                            throwError(`Default value of "${fieldName}" must be a Date`);
                        }
                        mongooseDefault = field.default;
                    }
                    else if(field.type === "array") {
                        if(!Array.isArray(field.default)) {
                            throwError(`Default value of "${fieldName}" must be an array`);
                        }
                        mongooseDefault = field.default;
                    }
                    else if(field.type === "object") {
                        if(typeof field.default !== "object" || field.default === null || Array.isArray(field.default)
                        ){
                            throwError(`Default value of "${fieldName}" must be an object`);
                        }
                        mongooseDefault = field.default;
                    }
                }
                //  the unique field must contain only two vaue - true or false
                let mongooseUnique : boolean = false;
                if(field.unique !== undefined) {
                    if(typeof field.unique !== "boolean") {
                        throwError(
                            `field.unique of "${fieldName}" must be a boolean (true or false)`
                        );
                    }
                    mongooseUnique = field.unique;
                }
                //  the min field must be a number
                let mongooseMin : number | undefined = undefined;
                if(field.min !== undefined) {
                    if(typeof field.min !== "number") {
                        throwError(`field.min of "${fieldName}" must be a number`);
                    }
                    mongooseMin = field.min;
                }
                //  the max field must be a number
                let mongooseMax : number | undefined = undefined;
                if(field.max !== undefined){
                    if(typeof field.max !="number"){
                        throwError(`field.max of "${fieldName}" must be a number`);
                    }
                    mongooseMax = field.max;
                }
                //  the minLength field must be a number
                let mongooseMinLength : number | undefined = undefined;
                if(field.minLength !== undefined) {
                    if(typeof field.minLength !== "number") {
                        throwError(`field.minLength of "${fieldName}" must be a number`);
                    }
                    mongooseMinLength = field.minLength;
                }
                // the maxLength field must be a number
                let mongooseMaxLength : number | undefined = undefined;
                if(field.maxLength !== undefined) {
                    if(typeof field.maxLength !== "number") {
                        throwError(`field.maxLength of "${fieldName}" must be a number`);
                    }
                    mongooseMaxLength = field.maxLength;
                }
                // the uppercase field must contain only two vaue - true or false
                let mongooseUpperCase : boolean = false;
                if(field.uppercase !== undefined) {
                    if(typeof field.uppercase !== "boolean") {
                        throwError(`field.uppercase of "${fieldName}" must be a boolean`);
                    }
                    mongooseUpperCase = field.uppercase;
                }
                // the lowercase field must contain only two vaue - true or false
                let mongooseLowerCase : boolean = false;
                if(field.lowercase !== undefined) {
                    if(typeof field.lowercase !== "boolean") {
                        throwError(`field.lowercase of "${fieldName}" must be a boolean`);
                    }
                    mongooseLowerCase = field.lowercase;
                }

                 // create the mongoose field object
                mongooseSchemaDefinition[fieldName] = {
                    type: mongooseType,

                    required: mongooseRequired,

                    default: mongooseDefault,

                    unique: mongooseUnique,

                    min: mongooseMin,

                    max: mongooseMax,

                    minlength: mongooseMinLength,

                    maxlength: mongooseMaxLength,

                    uppercase: mongooseUpperCase,

                    lowercase: mongooseLowerCase
                };
            }
            // console.log(mongooseSchemaDefinition);
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
            if(typeof returnValue !== "boolean"){
                throw new Error("Third Parameter of createSchmea() must be boolean");
            }
            if(returnValue === true){
                return newModel;
            }
        }
        // create table for postgresql
        if(this.isConnected == true && strawberryCore.databaseType === "postgresql"){
            const pool : pg.Pool = strawberryCore.databaseURL as pg.Pool;
            // traverse all the field
            for(const fieldname in schemaDefination){
                if(fieldname === "_id"){
                    throw new Error(`"${fieldname}" is reserved by the strawberry class and cannot be used`);
                }
                if(fieldname === "id"){
                    throw new Error(`"${fieldname}" is reserved by the strawberry class and cannot be used`);
                }
            }
            // do table creation task
            const columns : string[] = [];
            // by default the id was push in the table
            columns.push(`"_id" UUID PRIMARY KEY`);
            // traverse through all the field 
            for(const fieldname in schemaDefination){
                const field = schemaDefination[fieldname];
                // check if all type must be in strawberry list
                let postgresType : string; 
                // convert the type of the object
                if(!strawberryType.includes(field.type)){
                    throw new Error(`"${field.type} is not supported`);
                } 
                if(field.type === "string"){
                    postgresType = "TEXT";
                }
                else if(field.type === "int"){
                    postgresType = "INTEGER";
                }
                else if(field.type === "float"){
                    postgresType = "DOUBLE PRECISION";
                }
                else if(field.type === "boolean"){
                    postgresType = "BOOLEAN";
                }
                else if(field.type === "date"){
                    postgresType = "TIMESTAMP";
                }
                else if(field.type === "object"){
                    postgresType = "JSONB";
                }
                else if(field.type === "array"){
                    postgresType = "JSONB";
                }
                else {
                    throw new Error(`Unsupported type for "${fieldname}"`);
                }
                // eg - ("name" text)
                let columnDefinition = `"${fieldname}" ${postgresType}`;
                // handle the requied field
                if(field.required !== undefined){
                    if(typeof field.required !== "boolean"){
                        throw new Error(`field.required of "${fieldname}" must be boolean`);
                    }
                    if(field.required === true){
                        columnDefinition += " NOT NULL";
                    }
                }
                // handle the unique field
                if(field.unique !== undefined){
                    if(typeof field.required !== "boolean"){
                        throw new Error(`field.unique of "${fieldname} must be boolean"`)
                    }
                    if(field.unique === true){
                        columnDefinition += " UNIQUE"; 
                    }
                }
                // handle the default
                if(field.default !== undefined){
                    // handle the default value if its in 
                    if(field.type === "string"){
                        if(typeof field.default !== "string"){
                            throw new Error(`Default value of "${fieldname}" must be a string`);
                        }
                        columnDefinition += ` DEFAULT '${field.default}'`;
                    }
                    // handle the default value if its in 
                    else if(field.type === "int"){
                        if(typeof field.default !== "number"){
                            throw new Error(`Default value of "${fieldname}" must be a integer`);
                        }
                        columnDefinition += ` DEFAULT '${field.default}'`;
                    }
                    // handle the default value if its in 
                    else if(field.type === "float"){
                        if(typeof field.default !== "number"){
                            throw new Error(`Default value of "${fieldname}" must be a float`);
                        }
                        columnDefinition += ` DEFAULT '${field.default}'`;
                    }
                    // handle the default value if its in 
                    else if(field.type === "boolean"){
                        if(typeof field.default !== "boolean"){
                            throw new Error(`Default value of "${fieldname}" must be a boolean`);
                        }
                        columnDefinition += ` DEFAULT '${field.default}'`;
                    }
                    // handle the default value if its in 
                    else if(field.type === "date"){
                        if(!(field.default instanceof Date)){
                            throw new Error(`Default value of "${fieldname}" must be a date`);
                        }
                        columnDefinition += ` DEFAULT '${field.default.toISOString()}'`;
                    }
                    // handle the default value if its in 
                    else if(field.type === "array"){
                        if(!Array.isArray(field.default)){
                            throw new Error(`Default value of "${fieldname}" must be a array`);
                        }
                        columnDefinition += ` DEFAULT '${JSON.stringify(field.default)}'::jsonb`;
                    }
                    // handle the default value if its in 
                    else if(field.type === "object"){
                        if(typeof field.default !== "object" || field.default === null || Array.isArray(field.default)){
                            throw new Error(`Default value of "${fieldname}" must be a object`);
                        }
                        columnDefinition += ` DEFAULT '${JSON.stringify(field.default)}'::jsonb`;
                    }
                }
                columns.push(columnDefinition);
            }
            const query = `CREATE TABLE IF NOT EXISTS "${schemaName}" (${columns.join(",\n")})`;
            const result = await pool.query(query);
            if(typeof returnValue !== "boolean"){
                throw new Error("Third Parameter of createSchmea() must be boolean");
            }
            if(returnValue === true){
                return result;
            }
        }
    }

    static async createRelation(table1 : string, table2 : string, addedProperties : string){
        // check the databaseType 
        if(this.isConnected == true && strawberryCore.databaseType === "mongodb"){
            const firstModel = mongoose.models[table1];
            if(!firstModel){
                throw new Error(`Table ${table1} doesn't exist.`)
            }
            // add the property to the first table
            firstModel.schema.add({
                [addedProperties] : {
                    type : mongoose.Schema.Types.ObjectId,
                    ref : table2
                }
            });
            return firstModel.schema.paths;
        }
        if(this.isConnected == true && strawberryCore.databaseType === "postgresql"){
            console.log("PostgreSQL relationship is not implemented yet");
        }
    }

}

module.exports = {strawberryCore};


