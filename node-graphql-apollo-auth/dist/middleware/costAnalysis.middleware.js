"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@apollo/server");
const graphql_validation_complexity_1 = require("graphql-validation-complexity");
const complexityLimitRule = (0, graphql_validation_complexity_1.createComplexityLimitRule)(100, {
    onCost: (cost) => {
        console.log(`Query cost: ${cost}`);
    },
});
const costAnalysisMiddleware = {
    async requestDidStart() {
        return {
            async didResolveOperation({ request, document }) {
                const complexity = complexityLimitRule(document);
                if (complexity > 100) {
                    throw new Error(`Query is too complex: ${complexity}`);
                }
            },
        };
    },
};
exports.default = costAnalysisMiddleware;
