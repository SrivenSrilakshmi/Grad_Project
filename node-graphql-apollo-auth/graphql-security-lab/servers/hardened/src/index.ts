import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-query-complexity';
import { typeDefs } from '../../common/schema/typeDefs';
import { resolvers } from './resolvers';
import rateLimit from 'express-rate-limit';

async function start() {
  const app: express.Application = express();
  app.use(cors());

  // Basic rate limiting at Express level
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production', // turn off in production
    validationRules: [depthLimit(5) as any]
  } as any);

  await server.start();
  server.applyMiddleware({ app });

  const port = process.env.PORT || 4001;
  app.listen(port, () => console.log(`HARDENED server running at http://localhost:${port}${server.graphqlPath}`));
}

start();
