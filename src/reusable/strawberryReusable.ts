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
    static tokenizeCondition(condition: string): StrawberryToken[]
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
    static parseValue(token: StrawberryToken): any {

        // Handle quoted strings
        if (
            (token.startsWith("'") && token.endsWith("'")) ||
            (token.startsWith('"') && token.endsWith('"'))
        ) {

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
    static parseWhere(tokens: StrawberryToken[]): Record<string, any> {

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

}


// ecport happen here
module.exports = {
    strawberryReusable,
    strawberryClauses,
    strawberryUpdateOperators,
    strawberryLogicalOperators
};