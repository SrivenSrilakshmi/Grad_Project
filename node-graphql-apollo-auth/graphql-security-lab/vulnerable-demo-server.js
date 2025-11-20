const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

// More comprehensive schema for demonstration
const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    profile: UserProfile
    posts: [Post!]!
  }

  type UserProfile {
    firstName: String
    lastName: String
    bio: String
    avatar: String
  }

  type Post {
    id: ID!
    title: String!
    content: String
    author: User!
    createdAt: String!
    tags: [String!]!
  }

  type Query {
    # Public queries
    hello: String
    posts: [Post!]!
    
    # Sensitive queries that should be hidden
    users: [User!]!
    adminStats: AdminStats
    secretData: String
  }

  type Mutation {
    createPost(title: String!, content: String!): Post
    deleteUser(id: ID!): Boolean
    adminAction(action: String!): String
  }

  # Sensitive admin type
  type AdminStats {
    totalUsers: Int!
    totalPosts: Int!
    systemHealth: String!
    secretMetrics: [String!]!
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello World! This is a vulnerable GraphQL server.',
    posts: () => [
      {
        id: '1',
        title: 'My First Post',
        content: 'This is my first post content',
        author: { id: '1', username: 'john_doe', email: 'john@example.com' },
        createdAt: new Date().toISOString(),
        tags: ['demo', 'graphql']
      }
    ],
    users: () => {
      // This exposes sensitive user data
      return [
        {
          id: '1',
          username: 'john_doe',
          email: 'john@example.com',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            bio: 'GraphQL enthusiast',
            avatar: 'avatar1.jpg'
          }
        },
        {
          id: '2',
          username: 'admin',
          email: 'admin@company.com',
          profile: {
            firstName: 'Admin',
            lastName: 'User',
            bio: 'System administrator',
            avatar: 'admin.jpg'
          }
        }
      ];
    },
    adminStats: () => ({
      totalUsers: 150,
      totalPosts: 1200,
      systemHealth: 'All systems operational',
      secretMetrics: ['CPU: 45%', 'Memory: 78%', 'DB Connections: 23']
    }),
    secretData: () => 'This is super secret information that should not be exposed!'
  },
  
  Mutation: {
    createPost: (_, { title, content }) => ({
      id: Math.random().toString(),
      title,
      content,
      author: { id: '1', username: 'john_doe', email: 'john@example.com' },
      createdAt: new Date().toISOString(),
      tags: []
    }),
    deleteUser: (_, { id }) => {
      console.log(`⚠️  DANGEROUS: Attempting to delete user ${id}`);
      return true;
    },
    adminAction: (_, { action }) => {
      console.log(`🚨 ADMIN ACTION: ${action}`);
      return `Executed admin action: ${action}`;
    }
  },

  User: {
    posts: (user) => [
      {
        id: '1',
        title: `Post by ${user.username}`,
        content: 'Sample content',
        author: user,
        createdAt: new Date().toISOString(),
        tags: ['user-post']
      }
    ]
  }
};

async function startVulnerableServer() {
  const app = express();
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // VULNERABILITY: Introspection enabled in production
    introspection: true,
    // VULNERABILITY: GraphQL Playground enabled in production
    playground: true,
    // Additional context for demonstration
    context: ({ req }) => {
      console.log(`📡 GraphQL Request: ${req.body?.operationName || 'Anonymous'}`);
      if (req.body?.query?.includes('__schema')) {
        console.log('🚨 INTROSPECTION ATTACK DETECTED!');
      }
      return {};
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  const port = 4001; // Using different port to avoid conflicts
  app.listen(port, () => {
    console.log('🚨 VULNERABLE GraphQL Server Started');
    console.log('=====================================');
    console.log(`🔗 GraphQL Endpoint: http://localhost:${port}${server.graphqlPath}`);
    console.log(`🎮 GraphQL Playground: http://localhost:${port}${server.graphqlPath}`);
    console.log('');
    console.log('⚠️  SECURITY ISSUES:');
    console.log('   • Introspection ENABLED (exposes schema)');
    console.log('   • GraphQL Playground ENABLED (not for production)');
    console.log('   • Sensitive admin queries exposed');
    console.log('   • No authentication required');
    console.log('');
    console.log('🎯 Try these attacks:');
    console.log('   1. Open the playground in your browser');
    console.log('   2. Use the schema explorer (right panel)');
    console.log('   3. Run introspection queries');
    console.log('   4. Access sensitive data without authentication');
  });
}

startVulnerableServer().catch(error => {
  console.error('Error starting server:', error);
});