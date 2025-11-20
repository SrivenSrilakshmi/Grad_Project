"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_model_1 = require("./user.model");
const apollo_server_express_1 = require("apollo-server-express");
const roles_1 = require("../../auth/roles");
const userResolvers = {
    Query: {
        getUser: async (_, { id }, context) => {
            if (!context.user) {
                throw new apollo_server_express_1.AuthenticationError('You must be logged in');
            }
            const user = await user_model_1.User.findById(id);
            if (!user) {
                throw new apollo_server_express_1.ForbiddenError('User not found');
            }
            return user;
        },
        getAllUsers: async (_, __, context) => {
            if (!context.user || context.user.role !== roles_1.Role.ADMIN) {
                throw new apollo_server_express_1.ForbiddenError('You do not have permission to access this resource');
            }
            return await user_model_1.User.find();
        },
    },
    Mutation: {
        createUser: async (_, { input }, context) => {
            if (!context.user || context.user.role !== roles_1.Role.ADMIN) {
                throw new apollo_server_express_1.ForbiddenError('You do not have permission to perform this action');
            }
            const newUser = new user_model_1.User(input);
            return await newUser.save();
        },
        updateUser: async (_, { id, input }, context) => {
            if (!context.user) {
                throw new apollo_server_express_1.AuthenticationError('You must be logged in');
            }
            const user = await user_model_1.User.findByIdAndUpdate(id, input, { new: true });
            if (!user) {
                throw new apollo_server_express_1.ForbiddenError('User not found');
            }
            return user;
        },
        deleteUser: async (_, { id }, context) => {
            if (!context.user || context.user.role !== roles_1.Role.ADMIN) {
                throw new apollo_server_express_1.ForbiddenError('You do not have permission to perform this action');
            }
            const user = await user_model_1.User.findByIdAndDelete(id);
            if (!user) {
                throw new apollo_server_express_1.ForbiddenError('User not found');
            }
            return user;
        },
    },
};
exports.default = userResolvers;
