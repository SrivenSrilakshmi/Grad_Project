import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from '../../common/schema/typeDefs';
import { resolvers } from './resolvers';
import cors from 'cors';

async function start() {
  const app: express.Application = express();
  app.use(cors());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // Introspection left enabled intentionally (vulnerable)
    introspection: true,
    // no depth limit, no complexity analysis
  } as any);

  await server.start();
  server.applyMiddleware({ app: app as any });

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`VULNERABLE server running at http://localhost:${port}${server.graphqlPath}`));
}

start();
