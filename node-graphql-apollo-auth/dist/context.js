"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const jwt_1 = require("./auth/jwt");
const createContext = ({ req }) => {
    const token = req.headers.authorization || '';
    let user = null;
    if (token) {
        try {
            user = (0, jwt_1.verifyToken)(token.replace('Bearer ', ''));
        }
        catch (err) {
            console.error('Invalid token', err);
        }
    }
    return { user };
};
exports.createContext = createContext;
