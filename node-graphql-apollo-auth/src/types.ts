export interface User {
  id: string;
  role: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface ApolloContext {
  user?: User | null;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}