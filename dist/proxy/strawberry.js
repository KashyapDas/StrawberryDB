"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { strawberryCore } = require("../core/strawberryCore");
const strawberry = new Proxy(strawberryCore, {
    get(target, prop) {
        // If the property exists statically on the class, return it
        if (prop in target) {
            return target[prop];
        }
        // If not exists then, convert the user syntax to the core syntax
        return {
            createSchema: (schemaDefination, returnValue) => {
                return target.createSchema(prop, schemaDefination, returnValue);
            },
            createRelation: (table2, addedProperties) => {
                return target.createRelation(prop, table2, addedProperties);
            }
        };
    }
});
module.exports = {
    strawberry,
    connectSandBox: strawberryCore.connectSandBox
};
//# sourceMappingURL=strawberry.js.map