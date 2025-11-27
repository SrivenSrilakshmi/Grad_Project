// GraphGuard Universal Demo: GraphQL Yoga Implementation
// This demonstrates how GraphGuard 2.0 can be implemented in ANY GraphQL framework

const { createYoga, createSchema } = require('graphql-yoga');
const { UniversalGraphGuard, createYogaPlugin } = require('./universal-graphguard');

// Sample schema for testing
const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    friends: [User!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
    createPost(title: String!, content: String!, authorId: ID!): Post!
  }
`;

// Mock data
const mockUsers = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' }
];

const mockPosts = [
  { id: '1', title: 'Hello World', content: 'First post', authorId: '1' },
  { id: '2', title: 'GraphQL Security', content: 'Security matters', authorId: '2' }
];

const mockComments = [
  { id: '1', content: 'Great post!', authorId: '2', postId: '1' },
  { id: '2', content: 'Thanks!', authorId: '1', postId: '1' }
];

// Resolvers
const resolvers = {
  Query: {
    users: () => mockUsers,
    user: (_, { id }) => mockUsers.find(u => u.id === id),
    posts: () => mockPosts,
    post: (_, { id }) => mockPosts.find(p => p.id === id),
  },
  Mutation: {
    createUser: (_, { name, email }) => {
      const user = { id: String(mockUsers.length + 1), name, email };
      mockUsers.push(user);
      return user;
    },
    createPost: (_, { title, content, authorId }) => {
      const post = { id: String(mockPosts.length + 1), title, content, authorId };
      mockPosts.push(post);
      return post;
    }
  },
  User: {
    posts: (user) => mockPosts.filter(p => p.authorId === user.id),
    friends: (user) => mockUsers.filter(u => u.id !== user.id), // Simple mock
  },
  Post: {
    author: (post) => mockUsers.find(u => u.id === post.authorId),
    comments: (post) => mockComments.filter(c => c.postId === post.id),
  },
  Comment: {
    author: (comment) => mockUsers.find(u => u.id === comment.authorId),
    post: (comment) => mockPosts.find(p => p.id === comment.postId),
  }
};

// Create schema
const schema = createSchema({
  typeDefs,
  resolvers
});

// Configure GraphGuard with custom settings
const graphGuardConfig = {
  maxAllowedDepth: 6,           // Lower limit for demo
  depthHardBlock: 10,
  aliasThreshold: 15,
  riskBlockScore: 60,           // Lower threshold for demo
  riskWarnScore: 30,
  enableLogging: true,
  customPatterns: [
    /admin/i,                   // Block admin-related queries
    /delete/i,                  // Suspicious delete operations
    /system/i                   // System-related queries
  ]
};

// Create Yoga server with GraphGuard
const yoga = createYoga({
  schema,
  plugins: [
    createYogaPlugin(graphGuardConfig)
  ],
  context: ({ request }) => ({
    // Add any context you need
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  }),
  // Enable GraphiQL for testing
  graphiql: {
    title: 'GraphGuard Universal Demo - GraphQL Yoga',
    headerEditorEnabled: true,
  }
});

// Test queries for demonstration
const testQueries = {
  // SAFE: Simple query (should pass)
  safe: `
    query SafeQuery {
      users {
        id
        name
        email
      }
    }
  `,

  // RISKY: Deep nested query (should warn)
  risky: `
    query RiskyQuery {
      users {
        friends {
          friends {
            posts {
              comments {
                author {
                  name
                }
              }
            }
          }
        }
      }
    }
  `,

  // DANGEROUS: Very deep + many aliases (should block)
  dangerous: `
    query DangerousQuery {
      u1: users {
        f1: friends {
          f2: friends {
            f3: friends {
              p1: posts {
                c1: comments {
                  a1: author {
                    fr1: friends {
                      pr1: posts {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      u2: users {
        f4: friends {
          f5: friends {
            p2: posts {
              c2: comments {
                content
              }
            }
          }
        }
      }
    }
  `,

  // BLOCKED: Contains suspicious patterns
  malicious: `
    query MaliciousQuery {
      users {
        admin_panel
        system_info
        delete_all_data
      }
    }
  `,

  // INTROSPECTION: Should have higher cost
  introspection: `
    query IntrospectionQuery {
      __schema {
        types {
          name
          fields {
            name
            type {
              name
            }
          }
        }
      }
    }
  `
};

// Demo function to test different queries
async function demonstrateGraphGuard() {
  console.log('\n🛡️  GraphGuard Universal Demo - GraphQL Yoga Implementation\n');
  
  // Create a direct guard instance for testing
  const guard = new UniversalGraphGuard(graphGuardConfig);
  const { parse } = require('graphql');
  
  for (const [name, query] of Object.entries(testQueries)) {
    console.log(`\n--- Testing ${name.toUpperCase()} query ---`);
    console.log(query.trim());
    
    try {
      const document = parse(query);
      const result = guard.analyzeQuery(document, query);
      
      console.log(`✅ Result: ${result.action} (Risk: ${result.risk})`);
      if (result.warnings.length > 0) {
        console.log(`⚠️  Warnings: ${result.warnings.join(', ')}`);
      }
      console.log(`📊 Metrics: depth=${result.metrics.depth}, selections=${result.metrics.selections}, aliases=${result.metrics.aliases}`);
      
    } catch (error) {
      console.log(`🚫 BLOCKED: ${error.message}`);
    }
  }
  
  console.log('\n--- Server Information ---');
  console.log('🚀 GraphQL Yoga server with GraphGuard Universal');
  console.log('🔧 Custom configuration applied');
  console.log('📍 Available at: http://localhost:4000/graphql');
  console.log('🎮 GraphiQL interface enabled for testing');
}

// Export for use in other files
module.exports = {
  yoga,
  testQueries,
  demonstrateGraphGuard,
  graphGuardConfig
};

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateGraphGuard();
  
  // Start server
  const server = require('http').createServer(yoga);
  server.listen(4000, () => {
    console.log('\n🚀 GraphQL Yoga + GraphGuard Universal running at http://localhost:4000/graphql');
    console.log('🎮 Try the test queries in GraphiQL!');
  });
}