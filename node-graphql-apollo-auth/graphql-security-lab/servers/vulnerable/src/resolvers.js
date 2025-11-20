// Deliberately vulnerable resolvers. Each function includes comments explaining the vulnerability.

// In-memory data to make running the vulnerable server simple and safe
const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com' }
];

const posts = [
  { id: '1', title: 'Hello World', body: 'This is my first post', authorId: '1' },
  { id: '2', title: 'GraphQL is Amazing', body: 'Learning GraphQL security', authorId: '2' },
  { id: '3', title: 'Security Matters', body: 'Always validate your queries', authorId: '3' }
];

const comments = [
  { id: '1', text: 'Great post!', authorId: '2', postId: '1' },
  { id: '2', text: 'Very informative', authorId: '3', postId: '2' },
  { id: '3', text: 'Thanks for sharing', authorId: '1', postId: '2' }
];

const resolvers = {
  Query: {
    me: (_, __, ctx) => {
      // VULNERABILITY: No authentication check — returns a user even if not logged in
      console.log('🔍 Query: me (no auth check)');
      return users[0];
    },
    users: () => {
      // VULNERABILITY: Exposes all user data without authorization
      console.log('🔍 Query: users (no auth required)');
      return users;
    },
    posts: () => {
      console.log('🔍 Query: posts');
      return posts.map(p => ({ ...p, author: users.find(u => u.id === p.authorId) }));
    },
    postsByEmail: (_, args) => {
      // VULNERABILITY: Exposes posts by arbitrary email without auth checks
      console.log(`🔍 Query: postsByEmail for ${args.email} (no auth check)`);
      const user = users.find(u => u.email === args.email);
      if (!user) return [];
      return posts.filter(p => p.authorId === user.id).map(p => ({ ...p, author: user }));
    }
  },
  
  Mutation: {
    deleteUser: (_, args) => {
      // VULNERABILITY: No authorization check. Anyone can call deleteUser.
      console.log(`🚨 DANGEROUS: deleteUser called for ID ${args.id} (no auth!)`);
      const idx = users.findIndex(u => u.id === args.id);
      if (idx === -1) return false;
      users.splice(idx, 1);
      return true;
    },
    addPost: (_, args) => {
      // VULNERABILITY: No input validation, allows overly large payloads or script content
      console.log(`🔍 Mutation: addPost "${args.title}" (no validation)`);
      const newPost = { 
        id: String(posts.length + 1), 
        title: args.title, 
        body: args.body || '', 
        authorId: args.authorId 
      };
      posts.push(newPost);
      return { ...newPost, author: users.find(u => u.id === args.authorId) };
    }
  },
  
  User: {
    posts: (user) => {
      console.log(`🔍 Resolving posts for user ${user.id}`);
      return posts.filter(p => p.authorId === user.id);
    }
  },
  
  Post: {
    author: (post) => {
      console.log(`🔍 Resolving author for post ${post.id}`);
      return users.find(u => u.id === post.authorId);
    },
    comments: (post) => {
      console.log(`🔍 Resolving comments for post ${post.id}`);
      return comments.filter(c => c.postId === post.id)
        .map(c => ({ ...c, author: users.find(u => u.id === c.authorId) }));
    }
  },
  
  Comment: {
    author: (comment) => {
      console.log(`🔍 Resolving author for comment ${comment.id}`);
      return users.find(u => u.id === comment.authorId);
    }
  }
};

module.exports = { resolvers };

// Note: This vulnerable server intentionally omits depth limiting, complexity analysis,
// input validation, and authorization checks to be used as a training target in a closed lab.