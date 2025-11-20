import jwt from 'jsonwebtoken';

const SECRET = process.env.LAB_JWT_SECRET || 'lab-secret';

export function signToken(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}
