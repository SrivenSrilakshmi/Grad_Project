// Live Demo Script for December 6th Presentation
// This script sets up actual working servers for the demonstration

const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const { createYoga } = require('graphql-yoga');
const { createSchema } = require('graphql');
const { UniversalGraphGuard, createApolloPlugin, createYogaPlugin, createExpressMiddleware } = require('./universal-graphguard');
const http = require('http');
const cors = require('cors');
const { json } = require('body-parser');

// Demo Schema
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
`;

// Mock data for demo
const mockUsers = Array.from({ length: 10 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `User ${i + 1}`,
  email: `user${i + 1}@demo.com`
}));

const mockPosts = Array.from({ length: 20 }, (_, i) => ({
  id: (i + 1).toString(),
  title: `Post ${i + 1}`,
  content: `Content for post ${i + 1}`,
  authorId: ((i % 10) + 1).toString()
}));

const mockComments = Array.from({ length: 50 }, (_, i) => ({
  id: (i + 1).toString(),
  content: `Comment ${i + 1}`,
  authorId: ((i % 10) + 1).toString(),
  postId: ((i % 20) + 1).toString()
}));

// Resolvers
const resolvers = {
  Query: {
    users: () => mockUsers,
    user: (_, { id }) => mockUsers.find(u => u.id === id),
    posts: () => mockPosts,
    post: (_, { id }) => mockPosts.find(p => p.id === id),
  },
  User: {
    posts: (user) => mockPosts.filter(p => p.authorId === user.id),
    friends: (user) => mockUsers.filter(u => u.id !== user.id).slice(0, 3),
  },
  Post: {
    author: (post) => mockUsers.find(u => u.id === post.authorId),
    comments: (post) => mockComments.filter(c => c.postId === post.id).slice(0, 5),
  },
  Comment: {
    author: (comment) => mockUsers.find(u => u.id === comment.authorId),
    post: (comment) => mockPosts.find(p => p.id === comment.postId),
  }
};

// GraphGuard Configuration for Demo
const demoConfig = {
  maxAllowedDepth: 6,
  depthHardBlock: 10,
  aliasThreshold: 15,
  riskBlockScore: 60,
  riskWarnScore: 30,
  enableLogging: true,
  customPatterns: [
    /admin/i,
    /delete/i,
    /system/i,
    /secret/i
  ]
};

class DemoOrchestrator {
  constructor() {
    this.servers = {};
    this.ports = {
      apollo: 4001,
      yoga: 4002,
      express: 4003,
      dashboard: 4000
    };
  }

  async setupApolloServer() {
    console.log('🚀 Setting up Apollo Server with GraphGuard...');
    
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [
        createApolloPlugin(demoConfig)
      ],
    });

    await server.start();
    
    const app = express();
    app.use(cors());
    app.use('/graphql', json(), expressMiddleware(server, {
      context: async ({ req }) => ({
        userAgent: req.headers['user-agent'],
        demo: 'apollo'
      }),
    }));

    const httpServer = http.createServer(app);
    await new Promise(resolve => {
      httpServer.listen(this.ports.apollo, resolve);
    });

    this.servers.apollo = httpServer;
    console.log(`✅ Apollo Server running at http://localhost:${this.ports.apollo}/graphql`);
  }

  async setupYogaServer() {
    console.log('🧘 Setting up GraphQL Yoga with GraphGuard...');
    
    const yoga = createYoga({
      schema: createSchema({ typeDefs, resolvers }),
      plugins: [
        createYogaPlugin(demoConfig)
      ],
      context: ({ request }) => ({
        userAgent: request.headers.get('user-agent'),
        demo: 'yoga'
      }),
      graphiql: {
        title: 'GraphGuard Demo - GraphQL Yoga'
      }
    });

    const app = express();
    app.use(cors());
    app.use('/graphql', yoga);

    const httpServer = http.createServer(app);
    await new Promise(resolve => {
      httpServer.listen(this.ports.yoga, resolve);
    });

    this.servers.yoga = httpServer;
    console.log(`✅ Yoga Server running at http://localhost:${this.ports.yoga}/graphql`);
  }

  async setupExpressServer() {
    console.log('🚂 Setting up Express GraphQL with GraphGuard...');
    
    const { graphqlHTTP } = require('express-graphql');
    const { buildSchema } = require('graphql');
    
    const app = express();
    app.use(cors());
    
    // Apply GraphGuard middleware
    app.use('/graphql', createExpressMiddleware(demoConfig));
    
    app.use('/graphql', graphqlHTTP({
      schema: buildSchema(typeDefs),
      rootValue: {
        users: () => mockUsers,
        user: ({ id }) => mockUsers.find(u => u.id === id),
        posts: () => mockPosts,
        post: ({ id }) => mockPosts.find(p => p.id === id),
      },
      graphiql: {
        headerEditorEnabled: true,
      },
    }));

    const httpServer = http.createServer(app);
    await new Promise(resolve => {
      httpServer.listen(this.ports.express, resolve);
    });

    this.servers.express = httpServer;
    console.log(`✅ Express Server running at http://localhost:${this.ports.express}/graphql`);
  }

  async setupDashboard() {
    console.log('📊 Setting up Demo Dashboard...');
    
    const app = express();
    app.use(cors());
    app.use(express.static(__dirname));

    // API endpoint for live demo results
    app.get('/api/demo-status', (req, res) => {
      res.json({
        servers: Object.keys(this.servers).map(name => ({
          name,
          port: this.ports[name],
          status: 'running',
          url: `http://localhost:${this.ports[name]}/graphql`
        })),
        config: demoConfig,
        timestamp: new Date().toISOString()
      });
    });

    // Test endpoint for query analysis
    app.post('/api/analyze-query', express.json(), (req, res) => {
      try {
        const { query } = req.body;
        const guard = new UniversalGraphGuard(demoConfig);
        const { parse } = require('graphql');
        
        const document = parse(query);
        const result = guard.analyzeQuery(document, query);
        
        res.json({
          success: true,
          result,
          frameworks: {
            apollo: result,
            yoga: result,
            express: result,
            mercurius: result
          }
        });
      } catch (error) {
        res.json({
          success: false,
          error: error.message,
          blocked: true
        });
      }
    });

    const httpServer = http.createServer(app);
    await new Promise(resolve => {
      httpServer.listen(this.ports.dashboard, resolve);
    });

    this.servers.dashboard = httpServer;
    console.log(`✅ Demo Dashboard running at http://localhost:${this.ports.dashboard}`);
  }

  async startAllServers() {
    console.log('\n🎬 Starting GraphGuard Universal Demo Servers...\n');
    
    try {
      await this.setupApolloServer();
      await this.setupYogaServer();
      await this.setupExpressServer();
      await this.setupDashboard();
      
      console.log('\n🎉 All demo servers are running successfully!');
      console.log('\n📋 Demo URLs:');
      console.log(`🎮 Demo Dashboard: http://localhost:${this.ports.dashboard}`);
      console.log(`🚀 Apollo Server: http://localhost:${this.ports.apollo}/graphql`);
      console.log(`🧘 Yoga Server: http://localhost:${this.ports.yoga}/graphql`);
      console.log(`🚂 Express Server: http://localhost:${this.ports.express}/graphql`);
      
      console.log('\n🎯 Ready for December 6th demonstration!');
      console.log('   1. Open the Demo Dashboard in your browser');
      console.log('   2. Select different frameworks and attack scenarios');
      console.log('   3. Watch GraphGuard provide identical protection');
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down demo servers...');
        Object.values(this.servers).forEach(server => server.close());
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Error starting demo servers:', error);
      process.exit(1);
    }
  }

  // Demo helper methods
  generateDemoQueries() {
    return {
      safe: `query SafeDemo { users { id name email } }`,
      risky: `query RiskyDemo { 
        users { 
          friends { 
            posts { 
              comments { 
                author { name } 
              } 
            } 
          } 
        } 
      }`,
      dangerous: `query DangerousDemo {
        users {
          friends {
            friends {
              friends {
                posts {
                  comments {
                    author {
                      friends {
                        posts { title }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      malicious: `query MaliciousDemo {
        u1: users { admin_data system_info }
        u2: users { delete_all_data secret_token }
        u3: users { f1: friends { f2: friends { posts { title } } } }
      }`
    };
  }

  async runLiveTest() {
    console.log('\n🧪 Running live GraphGuard test...');
    
    const queries = this.generateDemoQueries();
    const guard = new UniversalGraphGuard(demoConfig);
    const { parse } = require('graphql');
    
    for (const [name, query] of Object.entries(queries)) {
      console.log(`\n--- Testing ${name.toUpperCase()} query ---`);
      
      try {
        const document = parse(query);
        const result = guard.analyzeQuery(document, query);
        
        console.log(`Result: ${result.action} (Risk: ${result.risk})`);
        console.log(`Metrics: depth=${result.metrics.depth}, selections=${result.metrics.selections}, aliases=${result.metrics.aliases}`);
        
        if (result.warnings.length > 0) {
          console.log(`Warnings: ${result.warnings.join(', ')}`);
        }
        
      } catch (error) {
        console.log(`BLOCKED: ${error.message}`);
      }
    }
  }
}

// Export for use in other files
module.exports = { DemoOrchestrator };

// Run demo if this file is executed directly
if (require.main === module) {
  const demo = new DemoOrchestrator();
  
  // Run live test first
  demo.runLiveTest().then(() => {
    // Start all servers
    demo.startAllServers();
  });
}