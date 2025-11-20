"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const validateUserInput = [
    (0, express_validator_1.body)('username').isString().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Email must be a valid email address'),
    (0, express_validator_1.body)('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
exports.default = validateUserInput;
