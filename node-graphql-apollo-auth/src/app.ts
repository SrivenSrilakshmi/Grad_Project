import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { createContext } from './context';
import { authMiddleware } from './auth/auth.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { depthLimitMiddleware } from './middleware/depthLimit.middleware';
import { costAnalysisMiddleware } from './middleware/costAnalysis.middleware';

const app = express();

// Middleware
app.use(authMiddleware);
app.use(validationMiddleware);
app.use(depthLimitMiddleware);
app.use(costAnalysisMiddleware);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
  // Additional Apollo Server configurations can be added here
});

server.applyMiddleware({ app });

export default app;