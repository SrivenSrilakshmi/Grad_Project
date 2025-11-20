import { Request } from 'express';
import { ApolloContext } from './types';
import { verifyToken } from './auth/jwt';

export const createContext = ({ req }: { req: Request }): ApolloContext => {
    const token = req.headers.authorization || '';
    let user = null;

    if (token) {
        try {
            user = verifyToken(token.replace('Bearer ', ''));
        } catch (err) {
            console.error('Invalid token', err);
        }
    }

    return { user };
};