import jwt from 'jsonwebtoken';
import { UserDocument } from '../modules/user/user.model';

const JWT_SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = '7d';

export const signToken = (user: { id: string; role: string }) => {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: EXPIRES_IN });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string; iat: number; exp: number };
};