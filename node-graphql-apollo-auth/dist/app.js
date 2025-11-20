"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const apollo_server_express_1 = require("apollo-server-express");
const typeDefs_1 = require("./schema/typeDefs");
const resolvers_1 = require("./schema/resolvers");
const context_1 = require("./context");
const auth_middleware_1 = require("./auth/auth.middleware");
const validation_middleware_1 = require("./middleware/validation.middleware");
const depthLimit_middleware_1 = require("./middleware/depthLimit.middleware");
const costAnalysis_middleware_1 = require("./middleware/costAnalysis.middleware");
const app = (0, express_1.default)();
// Middleware
app.use(auth_middleware_1.authMiddleware);
app.use(validation_middleware_1.validationMiddleware);
app.use(depthLimit_middleware_1.depthLimitMiddleware);
app.use(costAnalysis_middleware_1.costAnalysisMiddleware);
const server = new apollo_server_express_1.ApolloServer({
    typeDefs: typeDefs_1.typeDefs,
    resolvers: resolvers_1.resolvers,
    context: context_1.createContext,
    // Additional Apollo Server configurations can be added here
});
server.applyMiddleware({ app });
exports.default = app;
