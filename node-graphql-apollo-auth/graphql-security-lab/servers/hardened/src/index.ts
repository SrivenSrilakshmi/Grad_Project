import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-query-complexity';
import { typeDefs } from '../../common/schema/typeDefs';
import { resolvers } from './resolvers';
import rateLimit from 'express-rate-limit';
const GraphGuard = require('../../../graphguard/graphGuard');

async function start() {
  const app: express.Application = express();
  app.use(cors());
  app.use(express.json());

  // Basic rate limiting at Express level
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  // Initialize GraphGuard with comprehensive security configuration
  const graphGuard = new GraphGuard({
    maxDepth: 5,
    maxComplexity: 1000,
    maxAliases: 15,
    enableIntrospection: process.env.NODE_ENV !== 'production',
    enableLogging: true,
    logDirectory: './logs',
    fieldPermissions: {
      // Example: restrict sensitive fields to admin role
      'deleteUser': ['admin'],
      'updateUser': ['admin', 'user'],
      'secretData': ['admin'],
      'adminPanel': ['admin']
    },
    roles: {
      anonymous: 0,
      user: 1,
      admin: 2
    }
  });

  // Apply GraphGuard middleware BEFORE Apollo Server
  app.use('/graphql', graphGuard.middleware());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production', // turn off in production
    validationRules: [depthLimit(5) as any]
  } as any);

  await server.start();
  server.applyMiddleware({ app: app as any });

  const port = process.env.PORT || 4001;
  app.listen(port, () => console.log(`HARDENED server running at http://localhost:${port}${server.graphqlPath}`));
}

start();
