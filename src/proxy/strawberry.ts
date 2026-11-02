const {strawberryCore} = require("../core/strawberryCore");

const strawberry = new Proxy(strawberryCore, {
    get(target, prop ){
        // If the property exists statically on the class, return it
        if(prop in target){
            return target[prop];
        }
        // If not exists then, convert the user syntax to the core syntax
        return {
            createSchema : (schemaDefination : object, returnValue : boolean)=>{
                return target.createSchema(prop, schemaDefination, returnValue);
            },
            createRelation : (table2 : string, addedProperties : string, returnValue : boolean)=>{
                return target.createRelation(prop, table2, addedProperties, returnValue);
            },
            insertRecord : (schemaProperty : Record<string, any>)=>{
                return target.insertRecord(prop, schemaProperty);
            },
            updateRecord : (filterMehod : Record<string,any>, updateProps : Record<string, any>, updateSingle : boolean)=>{
                return target.updateRecord(prop, filterMehod, updateProps, updateSingle);
            }
        }
    }
});

module.exports = {
    strawberry,
    connectSandBox: strawberryCore.connectSandBox
};