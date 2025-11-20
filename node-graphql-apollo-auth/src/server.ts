import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema/typeDefs';
import { resolvers } from './schema/resolvers';
import { createContext } from './context';
import { depthLimit } from './middleware/depthLimit.middleware';
import { costAnalysis } from './middleware/costAnalysis.middleware';
import { validationMiddleware } from './middleware/validation.middleware';
import { authenticate } from './auth/auth.middleware';
import { config } from './config';

const app = express();

// Middleware
app.use(validationMiddleware);
app.use(authenticate);

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
  validationRules: [depthLimit(5), costAnalysis],
});

// Apply Apollo GraphQL middleware
server.applyMiddleware({ app });

// Start the server
const PORT = config.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
});