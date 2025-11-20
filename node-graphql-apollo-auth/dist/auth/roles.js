"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGuest = exports.isUser = exports.isAdmin = exports.hasRole = exports.Roles = void 0;
exports.Roles = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    GUEST: 'GUEST',
};
const hasRole = (userRoles, requiredRole) => {
    return userRoles.includes(requiredRole);
};
exports.hasRole = hasRole;
const isAdmin = (userRoles) => {
    return (0, exports.hasRole)(userRoles, exports.Roles.ADMIN);
};
exports.isAdmin = isAdmin;
const isUser = (userRoles) => {
    return (0, exports.hasRole)(userRoles, exports.Roles.USER);
};
exports.isUser = isUser;
const isGuest = (userRoles) => {
    return (0, exports.hasRole)(userRoles, exports.Roles.GUEST);
};
exports.isGuest = isGuest;
