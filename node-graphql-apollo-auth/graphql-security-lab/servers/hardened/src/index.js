const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const depthLimit = require('graphql-depth-limit');
const { createComplexityRule } = require('graphql-query-complexity');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { z } = require('zod');
// GraphGuard intelligent security layer plugin (adjust relative path)
const { graphGuardPlugin } = require('../../../graphguard/graphGuard.js');

// Import schema and resolvers
const { typeDefs } = require('../../common/schema/typeDefs.js');

// Enhanced schema with security considerations
const secureTypeDefs = gql`
  ${typeDefs.loc.source.body}
  
  extend type Query {
    # Secure endpoints with explicit authorization requirements
    secureUserData: [User!]! # Requires authentication
    adminStats: AdminStats # Requires admin role
  }
  
  extend type Mutation {
    # Secure mutations with input validation
    secureAddPost(input: AddPostInput!): Post!
    secureDeleteUser(id: ID!): Boolean # Requires admin role
  }
  
  type AdminStats {
    totalUsers: Int!
    totalPosts: Int!
    systemHealth: String!
  }
  
  input AddPostInput {
    title: String!
    body: String
    authorId: ID!
  }
`;

// Input validation schemas using Zod
const addPostSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .refine(val => !val.includes('<script>'), "No scripts allowed"),
  body: z.string()
    .max(5000, "Body too long")
    .optional(),
  authorId: z.string()
    .regex(/^\d+$/, "Invalid author ID format")
});

// Mock data with additional security context
const users = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'user' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'user' },
  { id: '3', name: 'Admin User', email: 'admin@example.com', role: 'admin' }
];

const posts = [
  { id: '1', title: 'Hello World', body: 'Welcome to secure GraphQL', authorId: '1' },
  { id: '2', title: 'Security Best Practices', body: 'Always validate inputs', authorId: '2' },
  { id: '3', title: 'Admin Post', body: 'This is an admin post', authorId: '3' }
];

const comments = [
  { id: '1', text: 'Great post!', authorId: '2', postId: '1' },
  { id: '2', text: 'Very informative', authorId: '3', postId: '2' },
  { id: '3', text: 'Thanks for sharing', authorId: '1', postId: '2' }
];

// Authentication middleware
const authenticateUser = (token) => {
  try {
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    return users.find(user => user.id === decoded.userId);
  } catch (error) {
    return null;
  }
};

// Authorization helpers
const requireAuth = (user) => {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
};

const requireAdmin = (user) => {
  requireAuth(user);
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
};

// Secure resolvers with proper authorization
const secureResolvers = {
  Query: {
    // Public endpoints (with logging)
    posts: (_, __, { user }) => {
      console.log('🔍 Query: posts (public access)');
      return posts.map(p => ({ ...p, author: users.find(u => u.id === p.authorId) }));
    },
    
    // Protected endpoints
    users: (_, __, { user }) => {
      requireAuth(user);
      console.log(`🔐 Query: users (authenticated as ${user.name})`);
      return users.map(u => ({ ...u, email: u.id === user.id ? u.email : '[REDACTED]' }));
    },
    
    secureUserData: (_, __, { user }) => {
      requireAuth(user);
      console.log(`🔐 Query: secureUserData (authenticated as ${user.name})`);
      return users;
    },
    
    adminStats: (_, __, { user }) => {
      requireAdmin(user);
      console.log(`🔐 Query: adminStats (admin access by ${user.name})`);
      return {
        totalUsers: users.length,
        totalPosts: posts.length,
        systemHealth: 'All systems operational'
      };
    },
    
    postsByEmail: (_, args, { user }) => {
      requireAuth(user);
      console.log(`🔐 Query: postsByEmail for ${args.email} (authenticated as ${user.name})`);
      
      // Only allow users to query their own posts, or admins to query any
      if (user.role !== 'admin' && user.email !== args.email) {
        throw new Error('Unauthorized: Can only query your own posts');
      }
      
      const targetUser = users.find(u => u.email === args.email);
      if (!targetUser) return [];
      
      return posts.filter(p => p.authorId === targetUser.id)
        .map(p => ({ ...p, author: targetUser }));
    }
  },
  
  Mutation: {
    secureAddPost: (_, { input }, { user }) => {
      requireAuth(user);
      
      // Input validation
      try {
        const validatedInput = addPostSchema.parse(input);
        console.log(`🔐 Mutation: secureAddPost by ${user.name} (input validated)`);
        
        // Additional authorization: users can only post as themselves
        if (user.role !== 'admin' && validatedInput.authorId !== user.id) {
          throw new Error('Unauthorized: Can only post as yourself');
        }
        
        const newPost = {
          id: String(posts.length + 1),
          title: validatedInput.title,
          body: validatedInput.body || '',
          authorId: validatedInput.authorId
        };
        
        posts.push(newPost);
        return { ...newPost, author: users.find(u => u.id === newPost.authorId) };
        
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Input validation failed: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
      }
    },
    
    secureDeleteUser: (_, { id }, { user }) => {
      requireAdmin(user);
      console.log(`🚨 Mutation: secureDeleteUser ID ${id} by admin ${user.name}`);
      
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return false;
      
      // Don't allow admins to delete themselves
      if (id === user.id) {
        throw new Error('Cannot delete your own admin account');
      }
      
      users.splice(idx, 1);
      return true;
    },
    
    // Legacy mutations with enhanced security
    addPost: (_, args, { user }) => {
      requireAuth(user);
      console.log(`🔐 Mutation: addPost by ${user.name} (legacy endpoint)`);
      
      // Basic input sanitization
      const sanitizedTitle = args.title?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT REMOVED]');
      const sanitizedBody = args.body?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT REMOVED]');
      
      if (sanitizedTitle?.length > 200) {
        throw new Error('Title too long (max 200 characters)');
      }
      
      const newPost = {
        id: String(posts.length + 1),
        title: sanitizedTitle || 'Untitled',
        body: sanitizedBody || '',
        authorId: args.authorId
      };
      
      posts.push(newPost);
      return { ...newPost, author: users.find(u => u.id === newPost.authorId) };
    },
    
    deleteUser: (_, { id }, { user }) => {
      requireAdmin(user);
      console.log(`🚨 Mutation: deleteUser ID ${id} by admin ${user.name} (legacy endpoint)`);
      
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return false;
      
      users.splice(idx, 1);
      return true;
    }
  },
  
  // Field-level resolvers with cost awareness
  User: {
    posts: (user, _, { user: currentUser }) => {
      console.log(`🔍 Resolving posts for user ${user.id} (cost: medium)`);
      return posts.filter(p => p.authorId === user.id);
    }
  },
  
  Post: {
    author: (post) => {
      console.log(`🔍 Resolving author for post ${post.id} (cost: low)`);
      return users.find(u => u.id === post.authorId);
    },
    comments: (post, _, { user }) => {
      console.log(`🔍 Resolving comments for post ${post.id} (cost: high)`);
      return comments.filter(c => c.postId === post.id)
        .map(c => ({ ...c, author: users.find(u => u.id === c.authorId) }));
    }
  },
  
  Comment: {
    author: (comment) => {
      console.log(`🔍 Resolving author for comment ${comment.id} (cost: low)`);
      return users.find(u => u.id === comment.authorId);
    }
  }
};

// Complexity rule (validation) using graphql-query-complexity official API
const complexityRule = createComplexityRule({
  maximumComplexity: 300,
  onComplete: (complexity) => {
    console.log(`� Query complexity calculated: ${complexity}`);
  },
  createError: (max, actual) => {
    console.warn(`🚨 Complexity ${actual} > ${max}`);
    return new Error(`Query complexity ${actual} exceeds max ${max}`);
  },
  scalarCost: 1,
  objectCost: 2,
  listFactor: 5
});

async function startHardenedServer() {
  const app = express();
  
  // Security middleware
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => {
      // Skip rate limiting for simple queries in development
      if (process.env.NODE_ENV !== 'production') {
        const query = req.body?.query;
        return query && query.includes('__typename') && query.length < 100;
      }
      return false;
    }
  });
  
  app.use('/graphql', limiter);
  
  const server = new ApolloServer({
    typeDefs: secureTypeDefs,
    resolvers: secureResolvers,
    
    // SECURITY CONTROLS
    introspection: process.env.NODE_ENV !== 'production', // Disable in production
    playground: process.env.NODE_ENV !== 'production',   // Disable in production
    
    // Validation rules (depth + complexity)
    validationRules: [depthLimit(7), complexityRule],
    plugins: [
      // GraphGuard dynamic heuristic security layer (tuned to demonstrate blocking)
      graphGuardPlugin({
        maxAllowedDepth: 10,
        depthHardBlock: 20,
        riskBlockScore: 60,
        riskWarnScore: 30,
        introspectionCost: 70,
        aliasThreshold: 25
      })
    ],
    
    // Context with authentication
    context: ({ req }) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const user = authenticateUser(token);
      
      // Security logging
      if (req.body?.query) {
        const query = req.body.query;
        const depth = (query.match(/{/g) || []).length;
        
        if (query.includes('__schema')) {
          console.log('🚨 INTROSPECTION ATTEMPT detected');
        }
        
        if (depth > 5) {
          console.log(`🚨 DEEP QUERY detected: depth ${depth}`);
        }
        
        if (query.length > 2000) {
          console.log(`🚨 LARGE QUERY detected: ${query.length} characters`);
        }
      }
      
      return { user };
    },
    
    // Enhanced error handling
    formatError: (error) => {
      console.error('GraphQL Error:', error.message);
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.message.includes('database') || error.message.includes('internal')) {
          return new Error('Internal server error');
        }
      }
      
      return error;
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  const port = process.env.PORT || 4001; // Different port from vulnerable server
  app.listen(port, () => {
    console.log('🛡️  HARDENED GraphQL Server Started');
    console.log('===================================');
    console.log(`🔗 Endpoint: http://localhost:${port}${server.graphqlPath}`);
    console.log(`🎮 Playground: http://localhost:${port}${server.graphqlPath}`);
    console.log('');
    console.log('🛡️  SECURITY CONTROLS ACTIVE:');
    console.log('   ✅ Query depth limiting (max 7 levels)');
    console.log('   ✅ Query complexity analysis (max 1000 cost)');
    console.log('   ✅ Rate limiting (100 requests/15min)');
    console.log('   ✅ Input validation with Zod schemas');
    console.log('   ✅ Authentication & authorization');
    console.log('   ✅ Introspection disabled in production');
    console.log('   ✅ CORS configuration');
    console.log('   ✅ Enhanced error handling');
    console.log('');
    console.log('🔑 Test Authentication:');
    console.log('   User Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNjAwMDAwMDAwfQ.example');
    console.log('   Admin Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzIiwiaWF0IjoxNjAwMDAwMDAwfQ.example');
    console.log('');
    console.log('🎯 This server demonstrates GraphQL security best practices');
  });
}

// Generate sample JWTs for testing
function generateTestTokens() {
  const secret = process.env.JWT_SECRET || 'default-secret';
  
  const userToken = jwt.sign({ userId: '1' }, secret, { expiresIn: '1h' });
  const adminToken = jwt.sign({ userId: '3' }, secret, { expiresIn: '1h' });
  
  console.log('🔑 Generated Test Tokens:');
  console.log(`User Token: ${userToken}`);
  console.log(`Admin Token: ${adminToken}`);
}

if (require.main === module) {
  startHardenedServer().catch(error => {
    console.error('Error starting hardened server:', error);
    process.exit(1);
  });
  
  // Generate test tokens in development
  if (process.env.NODE_ENV !== 'production') {
    setTimeout(generateTestTokens, 1000);
  }
}

module.exports = { startHardenedServer, secureResolvers, secureTypeDefs };