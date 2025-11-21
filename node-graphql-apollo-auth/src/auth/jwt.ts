import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const EXPIRES_IN = '7d';

export const signToken = (user: { id: string; role: string }) => {
    return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: EXPIRES_IN });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: string; iat: number; exp: number };
};