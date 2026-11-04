import pg = require("pg");
import mongoose = require("mongoose");
const Pool = pg.Pool;
const {queryTracker} = require("../feature/queryTracker");
const {strawberryReusable} = require("../reusable/strawberryReusable");

// strawberry datatype
type StrawberryType = "string" | "int" | "float" | "boolean" | "date" | "array" | "object";

// strawberry datatype array
const strawberryType: StrawberryType[] = [
    "string",
    "int",
    "float",
    "boolean",
    "date",
    "array",
    "object",
];

// strawberry value properties
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


class strawberryCore extends strawberryReusable{
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
                            throwError(`Default value of "${fieldName}" must be a date`);
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
            const query = `
                mongoose.Schema(${JSON.stringify(mongooseSchemaDefinition, null, 2)})

                mongoose.model("${schemaName}", schema)
                `;
            // call the tracking features 
            queryTracker.trackQuery(query, "create",strawberryCore.databaseType);
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
                    // check for both varchar and text
                    if(field.maxLength !== undefined){
                        if(typeof field.maxLength !== "number"){
                            throw new Error(`field.maxLength of "${fieldname} must be a number"`);
                        }
                        postgresType = `VARCHAR(${field.maxLength})`;
                    }
                    else postgresType = "TEXT";
                    if(field.minLength !== undefined){
                        if(typeof field.minLength !== "number"){
                            throw new Error(`field.minLength of "${fieldname} must be a number"`);
                        }
                        postgresType += ` CHECK (length("${fieldname}") >= ${field.minLength})`;
                    }   
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
            queryTracker.trackQuery(query,"create",strawberryCore.databaseType);
            if(typeof returnValue !== "boolean"){
                throw new Error("Third Parameter of createSchmea() must be boolean");
            }
            if(returnValue === true){
                return result;
            }
        }
    }

    static async createRelation(table1 : string, table2 : string, addedProperties : string, returnValue : boolean = false){
        // check the databaseType 
        if(this.isConnected == true && strawberryCore.databaseType === "mongodb"){
            // Check if the table1 exists or not.
            const firstModel = mongoose.models[table1];
            if(!firstModel){
                throw new Error(`Table ${table1} doesn't exist.`)
            }
            // Check if the table2 exists or not.
            const secondModel = mongoose.models[table2];
            if(!secondModel){
                throw new Error(`Table ${table1} doesn't exist.`)
            }
            // add the property to the first table
            firstModel.schema.add({
                [addedProperties] : {
                    type : mongoose.Schema.Types.ObjectId,
                    ref : table2
                }
            });             
            
            if(typeof returnValue !== "boolean"){
                throw new Error("Third Parameter of createSchmea() must be boolean");
            }
            if(returnValue === true){
                return `${addedProperties} from ${table2} successfully added to ${table1}`;
            }
        }
        if (this.isConnected === true && strawberryCore.databaseType === "postgresql") 
            {
            try {
                // Check the third parameter
                if (typeof returnValue !== "boolean") {
                    throw new Error(
                        "Third parameter of createRelation() must be boolean."
                    );
                }

                const pool: pg.Pool =
                    strawberryCore.databaseURL as pg.Pool;

                // Check whether table1 exists
                const firstTable = await pool.query(
                    `
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                    AND table_name = $1
                    `,
                    [table1]
                );

                if (firstTable.rowCount === 0) {
                    throw new Error(
                        `Table "${table1}" doesn't exist.`
                    );
                }

                // Check whether table2 exists
                const secondTable = await pool.query(
                    `
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                    AND table_name = $1
                    `,
                    [table2]
                );

                if (secondTable.rowCount === 0) {
                    throw new Error(
                        `Table "${table2}" doesn't exist.`
                    );
                }

                // Add the property to table1 if it doesn't exist
                const addColumnQuery = `
                    ALTER TABLE "${table1}"
                    ADD COLUMN IF NOT EXISTS "${addedProperties}" UUID;
                `;

                await pool.query(addColumnQuery);

                queryTracker.trackQuery(
                    addColumnQuery,
                    `create_relation_add_column ${table1}.${addedProperties}`,
                    strawberryCore.databaseType
                );

                // Generate the foreign key constraint name
                const constraintName =
                    `${table1}_${addedProperties}_fkey`;

                // Check whether the foreign key already exists
                const constraint = await pool.query(
                    `
                    SELECT
                        tc.constraint_name,
                        ccu.table_name AS referenced_table,
                        ccu.column_name AS referenced_column
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                        AND tc.constraint_schema = kcu.constraint_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON tc.constraint_name = ccu.constraint_name
                        AND tc.constraint_schema = ccu.constraint_schema
                    WHERE tc.constraint_schema = current_schema()
                        AND tc.table_name = $1
                        AND tc.constraint_name = $2
                        AND tc.constraint_type = 'FOREIGN KEY'
                        AND kcu.column_name = $3
                    LIMIT 1
                    `,
                    [table1, constraintName, addedProperties]
                );

                // Verify the existing foreign key
                if (constraint.rowCount && constraint.rowCount > 0) {
                    const existingConstraint = constraint.rows[0];

                    if (
                        existingConstraint.referenced_table !== table2 ||
                        existingConstraint.referenced_column !== "_id"
                    ) {
                        throw new Error(
                            `Foreign key "${constraintName}" already exists but references ` +
                            `"${existingConstraint.referenced_table}"."${existingConstraint.referenced_column}" ` +
                            `instead of "${table2}"."_id".`
                        );
                    }
                } else {
                    // Add the foreign key only if it doesn't exist
                    const addConstraintQuery = `
                        ALTER TABLE "${table1}"
                        ADD CONSTRAINT "${constraintName}"
                        FOREIGN KEY ("${addedProperties}")
                        REFERENCES "${table2}" ("_id");
                    `;

                    await pool.query(addConstraintQuery);

                    queryTracker.trackQuery(
                        addConstraintQuery,
                        `create_relation ${table1} - ${table2}`,
                        strawberryCore.databaseType
                    );
                }

                // Return a success message only when requested
                if (returnValue === true) {
                    return (
                        `${addedProperties} from ${table2} table ` +
                        `successfully added to ${table1} table`
                    );
                }

            } catch (error) {
                throw error;
            }
        }
    }

    static async insertRecord(schemaName : string, schemaProperty : Record<string, any>){
        if (strawberryCore.isConnected === true && strawberryCore.databaseType === "mongodb") {

            const model = mongoose.models[schemaName];

            if (!model) {
                throw new Error(
                    `StrawberryDB: Schema '${schemaName}' does not exist.`
                );
            }

            const result = await model.create(schemaProperty);


            queryTracker.trackQuery(
                `await model.create(${schemaProperty})`,
                "insert",
                this.databaseType
            );
            return result;

        }
        if (strawberryCore.isConnected === true && strawberryCore.databaseType === "postgresql"){
            const pool: pg.Pool = strawberryCore.databaseURL as pg.Pool;
            try {
                // Generate UUID for the _id field
                const { randomUUID } = require("crypto");
                const id = randomUUID();

                // Get all the properties and values
                const properties = Object.keys(schemaProperty); // ['name','email']
                const values = Object.values(schemaProperty); // ['ram','ram@gamil.com']


                // Check reserved properties
                if (properties.includes("_id") || properties.includes("id")) {
                    throw new Error('"id" and "_id" are reserved by StrawberryDB.');
                }

                // Check whether the object contains data
                if (properties.length === 0) {
                    throw new Error("Cannot insert an empty record.");
                }

                // Escape SQL identifiers
                const escapeIdentifier = (identifier: string) =>
                    `"${identifier.replace(/"/g, '""')}"`;

                const tableName = escapeIdentifier(schemaName);

                const columns = [
                    escapeIdentifier("_id"),
                    ...properties.map(escapeIdentifier)
                ];

                // Convert arrays into JSON strings for PostgreSQL JSONB
                const formattedValues = values.map(value =>
                    Array.isArray(value) ? JSON.stringify(value) : value
                );

                // Generate parameter placeholders
                const placeholders = [
                    "$1",
                    ...properties.map((_, index) => `$${index + 2}`)
                ];

                // Generate INSERT query
                const query = `
                    INSERT INTO ${tableName}
                    (${columns.join(", ")})
                    VALUES (${placeholders.join(", ")})
                    RETURNING *;
                `;

                // Execute PostgreSQL query
                const result = await pool.query(query, [
                    id,
                    ...formattedValues
                ]);
                
                // Track the query
                queryTracker.trackQuery(
                    query,
                    "insert",
                    strawberryCore.databaseType
                );

                // Return inserted record
                return result.rows[0];

            } catch (error: any) {

                // PostgreSQL error normalization
                if (error.code === "23505") {
                    throw new Error("A record with this unique value already exists.");
                }

                if (error.code === "23502") {
                    throw new Error("A required field cannot be empty.");
                }

                if (error.code === "23503") {
                    throw new Error("Referenced record does not exist.");
                }

                if (error.code === "22P02") {
                    throw new Error("Invalid data format supplied.");
                }

                throw error;
            }
        }

    
    }

    static async updateRecord(schemaName : string, conditionString : string, updateProps : Record<string, any>){
        if(this.isConnected === true && strawberryCore.databaseType === "mongodb"){
            try {
                // Validate condition - check weather the string is not empty
                if (!conditionString || !conditionString.trim()){
                    throw new Error("StrawberryDB: Condition cannot be empty.");
                }

                // Validate update properties - check is it empty or not
                if (!updateProps || typeof updateProps !== "object" || Object.keys(updateProps).length === 0){
                    throw new Error("StrawberryDB: Update properties cannot be empty.");
                }

                // Convert condition string into tokens
                const tokens = this.tokenizeCondition(conditionString);

                // Convert tokens into MongoDB filter
                const filter = this.parseWhere(tokens);

                // Get MongoDB model
                const model = mongoose.model(schemaName);

                // Prepare update query
                const updateQuery = {
                    $set: updateProps
                };

                // Execute the query
                const result = await model.updateMany(filter, updateQuery);

                return result;

            }catch(error : any){
                throw new Error(`StrawberryDB updateRecord(): ${error.message}`);
            }
        }
        if (this.isConnected === true && strawberryCore.databaseType === "postgresql") 
        {
            try {
                // filter condition can't be empty
                if (!conditionString || !conditionString.trim()) {
                    throw new Error("StrawberryDB: Condition cannot be empty.");
                }
                // update props can't be empty
                if (!updateProps || typeof updateProps !== "object" || Object.keys(updateProps).length === 0){
                    throw new Error("StrawberryDB: Update properties cannot be empty.");
                }

                const pool: pg.Pool = strawberryCore.databaseURL as pg.Pool;

                // Get update properties.
                const updateEntries = Object.entries(updateProps);

                const updateValues: any[] = [];
                const setExpressions: string[] = [];

                let parameterIndex = 1;

                // Generate SET expressions.
                for (const [key, value] of updateEntries) {

                    const safeColumn = `"${key.split('"').join('""')}"`;

                    setExpressions.push(
                        `${safeColumn} = $${parameterIndex++}`
                    );

                    updateValues.push(value);
                }

                // Convert WHERE condition.
                const convertedWhere = this.convertPostgresWhere(
                    conditionString,
                    updateEntries.length
                );

                // Generate table identifier.
                const safeTable = `"${schemaName.split('"').join('""')}"`;

                // Generate final UPDATE query.
                let query = `
                    UPDATE ${safeTable}
                    SET ${setExpressions.join(", ")}
                    ${convertedWhere.query}
                `;

                // Combine SET values and WHERE values.
                const values = [
                    ...updateValues,
                    ...convertedWhere.values
                ];               
                // excuted the query
                const result = await pool.query(query, values);
                return result;

            } catch (error: any) {
                throw new Error(
                    `StrawberryDB updateRecord(): ${error.message}`
                );
            }
        }   
        
    }
}

module.exports = {strawberryCore};


