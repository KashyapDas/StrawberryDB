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
        return {};
    }
});
module.exports = {
    strawberry,
    connectSandBox: strawberryCore.connectSandBox
};
//# sourceMappingURL=strawberry.js.map