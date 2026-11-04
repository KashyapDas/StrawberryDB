"use strict";
const { strawberryCore } = require("../core/strawberryCore");
const strawberry = new Proxy(strawberryCore, {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        return {
            createSchema: (schemaDefination, returnValue) => target.createSchema(prop, schemaDefination, returnValue),
            createRelation: (table2, addedProperties, returnValue) => target.createRelation(prop, table2, addedProperties, returnValue),
            insertRecord: (schemaProperty) => target.insertRecord(prop, schemaProperty),
            updateRecord: (conditionString, updateProps) => target.updateRecord(prop, conditionString, updateProps)
        };
    }
});
const connectSandBox = strawberryCore.connectSandBox;
module.exports = {
    strawberry,
    connectSandBox
};
//# sourceMappingURL=strawberry.js.map