type SchemaAPI = {
    createSchema: (schemaDefination: Record<string, any>, returnValue?: boolean) => Promise<any>;
    createRelation: (table2: string, addedProperties: string, returnValue?: boolean) => Promise<any>;
    insertRecord: (schemaProperty: Record<string, any>) => Promise<any>;
    updateRecord: (conditionString: string, updateProps: Record<string, any>) => Promise<any>;
};
type StrawberryAPI = {
    [schemaName: string]: SchemaAPI;
} & {
    connectSandBox: (url: string) => Promise<void>;
};
declare const _default: {
    strawberry: StrawberryAPI;
    connectSandBox: (url: string) => Promise<void>;
};
export = _default;
//# sourceMappingURL=strawberry.d.ts.map