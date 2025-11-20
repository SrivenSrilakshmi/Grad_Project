import { validateInput } from '../../src/middleware/validation.middleware';

describe('Input Validation Middleware', () => {
    it('should return true for valid input', () => {
        const input = { username: 'validUser', password: 'SecurePass123!' };
        const result = validateInput(input);
        expect(result).toBe(true);
    });

    it('should throw an error for invalid input', () => {
        const input = { username: '', password: '123' };
        expect(() => validateInput(input)).toThrow('Invalid input');
    });

    it('should throw an error for malicious input', () => {
        const input = { username: 'admin"; DROP TABLE users; --', password: 'password' };
        expect(() => validateInput(input)).toThrow('Invalid input');
    });
});