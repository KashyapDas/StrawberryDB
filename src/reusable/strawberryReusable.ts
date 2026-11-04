// strawberry types 

// Clause types
type StrawberryClause =
    | "WHERE"
    | "GROUP BY"
    | "ORDER BY"
    | "HAVING"
    | "LIMIT"
    | "FROM";

// Comparison operators
type StrawberryUpdateOperator =
    | "="
    | "!="
    | "<>"
    | ">"
    | ">="
    | "<"
    | "<="
    | "BETWEEN"
    | "IN"
    | "NOT IN";

// Logical operators
type StrawberryLogicalOperators =
    | "AND"
    | "OR"
    | "NOT";

// Token type
type StrawberryToken = string;

// starwberry arrays


// Clauses
const strawberryClauses: StrawberryClause[] = [
    "WHERE",
    "GROUP BY",
    "ORDER BY",
    "HAVING",
    "LIMIT",
    "FROM"
];

// Comparison operators
const strawberryUpdateOperators: StrawberryUpdateOperator[] = [
    "=",
    "!=",
    "<>",
    ">",
    ">=",
    "<",
    "<=",
    "BETWEEN",
    "IN",
    "NOT IN"
];

// Logical operators
const strawberryLogicalOperators: StrawberryLogicalOperators[] = [
    "AND",
    "OR",
    "NOT"
];


// class that hold the reusable method inside it for further use
class strawberryReusable {
    // tokenizeCondition() => convert the condition string into token
    protected static tokenizeCondition(condition: string): StrawberryToken[]
    {

        const tokens: StrawberryToken[] = [];

        let position = 0;

        while (position < condition.length) {

            const char = condition[position];
            if (char === undefined) {
                break;
            }

            // Skip whitespace
            if ( char === " " || char === "\n" || char === "\t" || char === "\r") {
                position++;
                continue;
            }

            // Handle quoted strings
            if (char === "'" || char === '"') {

                const quote = char;

                let value = quote;
                let closed = false;

                position++;

                while (position < condition.length) {

                    const current = condition[position];

                    // Handle escape sequences
                    if (current === "\\") {

                        if (position + 1 >= condition.length) {
                            throw new Error(
                                "StrawberryDB: Invalid escape sequence."
                            );
                        }

                        value += current + condition[position + 1];

                        position += 2;

                        continue;
                    }

                    value += current;

                    position++;

                    if (current === quote) {
                        closed = true;
                        break;
                    }
                }

                if (!closed) {
                    throw new Error(
                        "StrawberryDB: Unclosed string value."
                    );
                }

                tokens.push(value);

                continue;
            }

            // Handle comparison operators
            if ("=<>!".includes(char)) {

                let operator = char;

                if (position + 1 < condition.length) {

                    const nextTwo = condition.substring(
                        position,
                        position + 2
                    );

                    if (
                        nextTwo === ">=" ||
                        nextTwo === "<=" ||
                        nextTwo === "!=" ||
                        nextTwo === "<>"
                    ) {
                        operator = nextTwo;
                        position += 2;
                    } else {
                        position++;
                    }

                } else {
                    position++;
                }

                if (
                    !strawberryUpdateOperators.includes(
                        operator as StrawberryUpdateOperator
                    )
                ) {
                    throw new Error(
                        `StrawberryDB: Invalid operator '${operator}'.`
                    );
                }

                tokens.push(operator);

                continue;
            }

            // Handle parentheses and commas
            if ( char === "(" || char === ")" || char === ",") {
                tokens.push(char);

                position++;

                continue;
            }

            // Handle words and values
            let value = "";

            while (position < condition.length) {

                const current = condition[position];

                if(current == undefined){
                    break;
                }

                if( current === " " || current === "\n" || current === "\t" || current === "\r" || current === "(" || current === ")" || current === "," || "=<>!'\"".includes(current)){
                    break;
                }

                value += current;

                position++;
            }

            if (!value) {
                throw new Error(
                    `StrawberryDB: Invalid character '${condition[position]}'.`
                );
            }

            tokens.push(value);
        }

        return tokens;
    }

    // parserValue() => convert token value into javascript value
    protected static parseValue(token: StrawberryToken): any {
        // Handle quoted strings
        if ((token.startsWith("'") && token.endsWith("'")) || (token.startsWith('"') && token.endsWith('"'))){

            const quote = token[0];

            let value = "";

            for (let i = 1; i < token.length - 1; i++) {

                const char = token[i];

                if (char === "\\" && i + 1 < token.length - 1) {

                    const next = token[i + 1];

                    if (next === quote || next === "\\") {
                        value += next;
                    } else {
                        value += char + next;
                    }

                    i++;

                    continue;
                }

                value += char;
            }

            return value;
        }

        const normalized = token.toUpperCase();

        if (normalized === "TRUE") return true;

        if (normalized === "FALSE") return false;

        if (normalized === "NULL") return null;

        const numberValue = Number(token);

        if (token !== "" && Number.isFinite(numberValue)) {
            return numberValue;
        }

        return token;
    }

    // parseWhere() => Convert the token into Mongodb compatible filter
    protected static parseWhere(tokens: StrawberryToken[]): Record<string, any> {

        let position = 0;

        const peek = () => tokens[position];

        const consume = (): string => {

            if (position >= tokens.length) {
                throw new Error(
                    "StrawberryDB: Unexpected end of condition."
                );
            }

            const token = tokens[position++];

            if (token === undefined) {
                throw new Error("StrawberryDB: Unexpected end of condition.");
            }

            return token;
        };

        const expect = (expected: string) => {

            const actual = consume();

            if (actual.toUpperCase() !== expected) {
                throw new Error(
                    `StrawberryDB: Expected '${expected}', received '${actual}'.`
                );
            }
        };


        // Parse IN / NOT IN values
        const parseList = (): any[] => {

            expect("(");

            const values: any[] = [];

            while (peek() !== ")") {

                if (position >= tokens.length) {
                    throw new Error(
                        "StrawberryDB: Missing closing parenthesis."
                    );
                }

                values.push(
                    this.parseValue(consume())
                );

                if (peek() === ",") {
                    consume();
                } else if (peek() !== ")") {
                    throw new Error(
                        "StrawberryDB: Expected ',' or ')'."
                    );
                }
            }

            expect(")");

            if (values.length === 0) {
                throw new Error(
                    "StrawberryDB: IN requires at least one value."
                );
            }

            return values;
        };


        // Parse field comparison
        const parseComparison = (): Record<string, any> => {

            const field = consume();

            if (
                [
                    "AND",
                    "OR",
                    "NOT",
                    "WHERE",
                    "(",
                    ")",
                    ","
                ].includes(field.toUpperCase())
            ) {
                throw new Error(
                    `StrawberryDB: Invalid field '${field}'.`
                );
            }

            let operator = consume().toUpperCase();


            // Handle NOT IN
            if (operator === "NOT") {

                expect("IN");

                operator = "NOT IN";
            }


            // Handle BETWEEN
            if (operator === "BETWEEN") {

                const minimum = this.parseValue(consume());

                expect("AND");

                const maximum = this.parseValue(consume());

                return {
                    [field]: {
                        $gte: minimum,
                        $lte: maximum
                    }
                };
            }


            // Handle IN / NOT IN
            if (
                operator === "IN" ||
                operator === "NOT IN"
            ) {

                const values = parseList();

                return {
                    [field]: {
                        [operator === "IN" ? "$in" : "$nin"]: values
                    }
                };
            }


            // Handle ordinary comparison operators
            const value = this.parseValue(consume());

            const operatorMap: Record<string, string> = {
                "=": "$eq",
                "!=": "$ne",
                "<>": "$ne",
                ">": "$gt",
                ">=": "$gte",
                "<": "$lt",
                "<=": "$lte"
            };

            const mongoOperator = operatorMap[operator];

            if (!mongoOperator) {
                throw new Error(
                    `StrawberryDB: Unsupported operator '${operator}'.`
                );
            }

            return {
                [field]: {
                    [mongoOperator]: value
                }
            };
        };


        // Handle parentheses
        const parsePrimary = (): Record<string, any> => {

            if (peek() === "(") {

                consume();

                const result = parseOr();

                expect(")");

                return result;
            }

            return parseComparison();
        };


        // Handle NOT
        const parseUnary = (): Record<string, any> => {

            if (peek()?.toUpperCase() === "NOT") {

                consume();

                return {
                    $nor: [parseUnary()]
                };
            }

            return parsePrimary();
        };


        // Handle AND
        const parseAnd = (): Record<string, any> => {

            let left = parseUnary();

            while (peek()?.toUpperCase() === "AND") {

                consume();

                const right = parseUnary();

                left = {
                    $and: [left, right]
                };
            }

            return left;
        };


        // Handle OR
        const parseOr = (): Record<string, any> => {

            let left = parseAnd();

            while (peek()?.toUpperCase() === "OR") {

                consume();

                const right = parseAnd();

                left = {
                    $or: [left, right]
                };
            }

            return left;
        };


        // Remove WHERE keyword
        if (peek()?.toUpperCase() === "WHERE") {
            consume();
        }

        const result = parseOr();


        // Check remaining tokens
        if (position !== tokens.length) {
            throw new Error(
                `StrawberryDB: Unexpected token '${peek()}'.`
            );
        }

        return result;
    }

    // parser to handle sql injection in postgresql
    
    
    protected static convertPostgresWhere(condition: string,updateLength: number){
        const values: any[] = [];
        let parameterIndex = updateLength + 1;
        let tokenIndex = 0;

        if (!condition || !condition.trim()) {
            throw new Error("StrawberryDB: Condition cannot be empty.");
        }

        if (!Number.isInteger(updateLength) || updateLength < 0) {
            throw new Error("StrawberryDB: Invalid update parameter length.");
        }

        const tokens = this.tokenizeCondition(condition);

        if (!tokens[0] || tokens[0].toUpperCase() !== "WHERE") {
            throw new Error("StrawberryDB: Condition must start with WHERE.");
        }

        // Remove WHERE from the token list.
        tokenIndex = 1;

        const currentToken = () => tokens[tokenIndex];

        const match = (token: string) => {
            const value = currentToken();

            if (value !== undefined && value.toUpperCase() === token) {
                tokenIndex++;
                return true;
            }

            return false;
        };

        const quoteIdentifier = (column: string) => {
            return column
                .split(".")
                .map(part => {
                    const identifier = part.replace(/^"|"$/g, "");
                    return `"${identifier.split('"').join('""')}"`;
                })
                .join(".");
        };

        const getValue = () => {
            const token = currentToken();

            if (token === undefined) {
                throw new Error("StrawberryDB: Expected a value.");
            }

            tokenIndex++;

            return this.parseValue(token);
        };

        const createPlaceholder = (value: any) => {
            values.push(value);
            return `$${parameterIndex++}`;
        };

        // Comparison: column operator value
        const parseComparison = (): string => {
            const column = currentToken();

            if (!column || column === "(" || column === ")" || column === ",") {
                throw new Error("StrawberryDB: Invalid column name.");
            }

            tokenIndex++;

            const safeColumn = quoteIdentifier(column);

            // NOT IN
            if (
                currentToken()?.toUpperCase() === "NOT" &&
                tokens[tokenIndex + 1]?.toUpperCase() === "IN"
            ) {
                tokenIndex += 2;

                if (!match("(")) {
                    throw new Error("StrawberryDB: Expected '(' after NOT IN.");
                }

                const placeholders: string[] = [];

                while (currentToken() !== ")") {
                    if (currentToken() === undefined) {
                        throw new Error("StrawberryDB: Invalid NOT IN expression.");
                    }

                    placeholders.push(createPlaceholder(getValue()));

                    if (!match(",")) break;
                }

                if (!match(")") || placeholders.length === 0) {
                    throw new Error("StrawberryDB: Invalid NOT IN expression.");
                }

                return `${safeColumn} NOT IN (${placeholders.join(", ")})`;
            }

            // IN
            if (match("IN")) {
                if (!match("(")) {
                    throw new Error("StrawberryDB: Expected '(' after IN.");
                }

                const placeholders: string[] = [];

                while (currentToken() !== ")") {
                    if (currentToken() === undefined) {
                        throw new Error("StrawberryDB: Invalid IN expression.");
                    }

                    placeholders.push(createPlaceholder(getValue()));

                    if (!match(",")) break;
                }

                if (!match(")") || placeholders.length === 0) {
                    throw new Error("StrawberryDB: Invalid IN expression.");
                }

                return `${safeColumn} IN (${placeholders.join(", ")})`;
            }

            // BETWEEN
            if (match("BETWEEN")) {
                const firstValue = getValue();

                if (!match("AND")) {
                    throw new Error("StrawberryDB: BETWEEN requires AND.");
                }

                const secondValue = getValue();

                const firstPlaceholder = createPlaceholder(firstValue);
                const secondPlaceholder = createPlaceholder(secondValue);

                return `${safeColumn} BETWEEN ${firstPlaceholder} AND ${secondPlaceholder}`;
            }

            // Normal comparison operators
            const operator = currentToken();

            const operatorMap: Record<string, string> = {
                "=": "=",
                "!=": "<>",
                "<>": "<>",
                ">": ">",
                ">=": ">=",
                "<": "<",
                "<=": "<="
            };

            if (!operator || !operatorMap[operator]) {
                throw new Error("StrawberryDB: Unsupported comparison operator.");
            }

            tokenIndex++;

            const value = getValue();
            const placeholder = createPlaceholder(value);

            return `${safeColumn} ${operatorMap[operator]} ${placeholder}`;
        };

        // Primary: comparison or parenthesized expression
        const parsePrimary = (): string => {
            if (match("(")) {
                const expression = parseOr();

                if (!match(")")) {
                    throw new Error("StrawberryDB: Missing closing parenthesis.");
                }

                return `(${expression})`;
            }

            return parseComparison();
        };

        // NOT
        const parseNot = (): string => {
            if (match("NOT")) {
                return `NOT ${parseNot()}`;
            }

            return parsePrimary();
        };

        // AND
        const parseAnd = (): string => {
            let expression = parseNot();

            while (match("AND")) {
                expression += ` AND ${parseNot()}`;
            }

            return expression;
        };

        // OR
        const parseOr = (): string => {
            let expression = parseAnd();

            while (match("OR")) {
                expression += ` OR ${parseAnd()}`;
            }

            return expression;
        };

        const convertedCondition = parseOr();

        if (tokenIndex !== tokens.length) {
            throw new Error(
                `StrawberryDB: Unexpected token '${currentToken()}'.`
            );
        }

        return {
            query: `WHERE ${convertedCondition}`,
            values
        };
    }



}


// ecport happen here
module.exports = {
    strawberryReusable,
    strawberryClauses,
    strawberryUpdateOperators,
    strawberryLogicalOperators
};