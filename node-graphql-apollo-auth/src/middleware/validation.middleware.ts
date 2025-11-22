import { Request, Response, NextFunction } from 'express';
import * as validator from 'express-validator';

const { body, validationResult } = validator;

const validateUserInput = [
    body('username').isString().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

export default validateUserInput;