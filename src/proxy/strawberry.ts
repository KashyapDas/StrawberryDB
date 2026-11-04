const { strawberryCore } = require("../core/strawberryCore");

type SchemaAPI = {
    createSchema: (
        schemaDefination: Record<string, any>,
        returnValue?: boolean
    ) => Promise<any>;

    createRelation: (
        table2: string,
        addedProperties: string,
        returnValue?: boolean
    ) => Promise<any>;

    insertRecord: (
        schemaProperty: Record<string, any>
    ) => Promise<any>;

    updateRecord: (
        conditionString: string,
        updateProps: Record<string, any>
    ) => Promise<any>;
};

type StrawberryAPI = {
    [schemaName: string]: SchemaAPI;
} & {
    connectSandBox: (url: string) => Promise<void>;
};

const strawberry = new Proxy(strawberryCore, {
    get(target: any, prop: string | symbol) {
        if (prop in target) {
            return target[prop];
        }

        return {
            createSchema: (
                schemaDefination: Record<string, any>,
                returnValue?: boolean
            ) => target.createSchema(prop, schemaDefination, returnValue),

            createRelation: (
                table2: string,
                addedProperties: string,
                returnValue?: boolean
            ) => target.createRelation(prop, table2, addedProperties, returnValue),

            insertRecord: (schemaProperty: Record<string, any>) =>
                target.insertRecord(prop, schemaProperty),

            updateRecord: (
                conditionString: string,
                updateProps: Record<string, any>
            ) => target.updateRecord(prop, conditionString, updateProps)
        };
    }
}) as StrawberryAPI;

const connectSandBox: (url: string) => Promise<void> =
    strawberryCore.connectSandBox;

export = {
    strawberry,
    connectSandBox
};