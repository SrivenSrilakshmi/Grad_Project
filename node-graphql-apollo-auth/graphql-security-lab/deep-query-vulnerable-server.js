const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');

// Schema with deep nested relationships - VULNERABLE to depth attacks
const typeDefs = gql`
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
    relatedPosts: [Post!]!
  }

  type Comment {
    id: ID!
    text: String!
    author: User!
    post: Post!
    replies: [Comment!]!
    likes: [User!]!
  }

  type Query {
    users: [User!]!
    posts: [Post!]!
    comments: [Comment!]!
  }
`;

// Mock data generators
const users = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com' }
];

const posts = [
  { id: '1', title: 'First Post', content: 'This is the first post', authorId: '1' },
  { id: '2', title: 'Second Post', content: 'This is the second post', authorId: '2' },
  { id: '3', title: 'Third Post', content: 'This is the third post', authorId: '3' }
];

const comments = [
  { id: '1', text: 'Great post!', authorId: '2', postId: '1' },
  { id: '2', text: 'I agree!', authorId: '3', postId: '1' },
  { id: '3', text: 'Nice work!', authorId: '1', postId: '2' }
];

const resolvers = {
  Query: {
    users: () => {
      console.log('🔍 Query: users requested');
      return users;
    },
    posts: () => {
      console.log('🔍 Query: posts requested');
      return posts;
    },
    comments: () => {
      console.log('🔍 Query: comments requested');
      return comments;
    }
  },

  User: {
    posts: (user) => {
      console.log(`🔍 Resolving posts for user ${user.id}`);
      return posts.filter(post => post.authorId === user.id);
    },
    friends: (user) => {
      console.log(`🔍 Resolving friends for user ${user.id} - EXPENSIVE OPERATION!`);
      // Simulate expensive database operation
      return users.filter(u => u.id !== user.id);
    }
  },

  Post: {
    author: (post) => {
      console.log(`🔍 Resolving author for post ${post.id}`);
      return users.find(user => user.id === post.authorId);
    },
    comments: (post) => {
      console.log(`🔍 Resolving comments for post ${post.id}`);
      return comments.filter(comment => comment.postId === post.id);
    },
    relatedPosts: (post) => {
      console.log(`🔍 Resolving related posts for post ${post.id} - EXPENSIVE OPERATION!`);
      // Simulate expensive recommendation algorithm
      return posts.filter(p => p.id !== post.id);
    }
  },

  Comment: {
    author: (comment) => {
      console.log(`🔍 Resolving author for comment ${comment.id}`);
      return users.find(user => user.id === comment.authorId);
    },
    post: (comment) => {
      console.log(`🔍 Resolving post for comment ${comment.id}`);
      return posts.find(post => post.id === comment.postId);
    },
    replies: (comment) => {
      console.log(`🔍 Resolving replies for comment ${comment.id} - EXPENSIVE OPERATION!`);
      // Simulate nested replies
      return comments.filter(c => c.id !== comment.id).slice(0, 2);
    },
    likes: (comment) => {
      console.log(`🔍 Resolving likes for comment ${comment.id} - EXPENSIVE OPERATION!`);
      // Simulate user likes
      return users.slice(0, 2);
    }
  }
};

async function startVulnerableServer() {
  const app = express();
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // VULNERABILITY: No depth limiting
    introspection: true,
    playground: true,
    context: ({ req }) => {
      if (req.body?.query) {
        const queryDepth = (req.body.query.match(/{/g) || []).length;
        console.log(`📊 Query depth detected: ${queryDepth} levels`);
        
        if (queryDepth > 5) {
          console.log('🚨 DEEP QUERY ATTACK DETECTED!');
          console.log('🔥 This could cause server overload!');
        }
      }
      return {};
    }
  });

  await server.start();
  server.applyMiddleware({ app });

  const port = 4002; // Different port to avoid conflicts
  app.listen(port, () => {
    console.log('🚨 VULNERABLE Deep Query Server Started');
    console.log('==========================================');
    console.log(`🔗 GraphQL Endpoint: http://localhost:${port}${server.graphqlPath}`);
    console.log(`🎮 GraphQL Playground: http://localhost:${port}${server.graphqlPath}`);
    console.log('');
    console.log('⚠️  SECURITY ISSUES:');
    console.log('   • NO depth limiting');
    console.log('   • Expensive nested resolvers');
    console.log('   • Circular references possible');
    console.log('   • No query complexity analysis');
    console.log('');
    console.log('🎯 Try deep query attacks:');
    console.log('   users { posts { comments { author { posts { comments } } } } }');
    console.log('');
    console.log('📊 Watch the console for resolver execution logs');
  });
}

startVulnerableServer().catch(error => {
  console.error('Error starting server:', error);
});