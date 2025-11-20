"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depthLimitMiddleware = void 0;
const graphql_1 = require("graphql");
const MAX_DEPTH = 5;
const getDepth = (node, depth = 0) => {
    if (!node || typeof node !== 'object')
        return depth;
    return Math.max(depth, ...Object.values(node).map(child => getDepth(child, depth + 1)));
};
const depthLimitMiddleware = async ({ args, info }, next) => {
    const depth = getDepth(args);
    if (depth > MAX_DEPTH) {
        throw new graphql_1.GraphQLError(`Query exceeds maximum depth of ${MAX_DEPTH}`);
    }
    return next();
};
exports.depthLimitMiddleware = depthLimitMiddleware;
