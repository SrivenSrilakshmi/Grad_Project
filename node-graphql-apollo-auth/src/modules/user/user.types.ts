export interface User {
    id: string;
    username: string;
    email: string;
    password: string; // Consider using a hashed password
    role: UserRole;
}

export enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    role?: UserRole; // Optional, defaults to USER
}

export interface UpdateUserInput {
    id: string;
    username?: string;
    email?: string;
    password?: string; // Consider using a hashed password
    role?: UserRole;
}