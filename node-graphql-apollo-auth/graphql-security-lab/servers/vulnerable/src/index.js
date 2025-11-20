const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const cors = require('cors');

// Import type definitions from common schema
const { typeDefs } = require('../../common/schema/typeDefs.js');
const { resolvers } = require('./resolvers.js');

async function start() {
  const app = express();
  app.use(cors());

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // VULNERABILITIES INTENTIONALLY LEFT:
    introspection: true,     // ❌ Schema introspection enabled
    playground: true,        // ❌ GraphQL Playground enabled
    // ❌ No depth limiting
    // ❌ No complexity analysis
    // ❌ No rate limiting
    context: ({ req }) => {
      // Log potential attacks
      if (req.body?.query) {
        const query = req.body.query;
        
        if (query.includes('__schema')) {
          console.log('🚨 INTROSPECTION ATTACK DETECTED!');
        }
        
        const depth = (query.match(/{/g) || []).length;
        if (depth > 5) {
          console.log(`🚨 DEEP QUERY ATTACK DETECTED! Depth: ${depth}`);
        }
        
        if (query.length > 2000) {
          console.log(`🚨 LARGE QUERY DETECTED! Size: ${query.length} chars`);
        }
      }
      return {};
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log('🚨 VULNERABLE GraphQL Server Started');
    console.log('====================================');
    console.log(`🔗 Endpoint: http://localhost:${port}${server.graphqlPath}`);
    console.log(`🎮 Playground: http://localhost:${port}${server.graphqlPath}`);
    console.log('');
    console.log('⚠️  SECURITY VULNERABILITIES:');
    console.log('   ❌ Introspection enabled');
    console.log('   ❌ No depth limiting');
    console.log('   ❌ No complexity analysis');
    console.log('   ❌ No authentication required');
    console.log('   ❌ GraphQL Playground in production');
    console.log('');
    console.log('🎯 This server is INTENTIONALLY vulnerable for educational purposes');
  });
}

start().catch(error => {
  console.error('Error starting vulnerable server:', error);
});