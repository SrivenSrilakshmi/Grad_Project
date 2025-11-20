// Deliberately vulnerable resolvers. Each function includes comments explaining the vulnerability.
import { IResolvers } from '@graphql-tools/utils';

// In-memory data to make running the vulnerable server simple and safe
const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' }
];

const posts = [
  { id: '1', title: 'Hello', body: 'World', authorId: '1' },
  { id: '2', title: 'GraphQL is fun', body: '...', authorId: '2' }
];

const comments = [
  { id: '1', text: 'Nice', authorId: '2', postId: '1' }
];

export const resolvers: IResolvers = {
  Query: {
    me: (_: any, __: any, ctx: any) => {
      // Vulnerability: no authentication check — returns a user even if not logged in
      return users[0];
    },
    users: () => users,
    posts: () => posts.map(p => ({ ...p, author: users.find(u => u.id === p.authorId) })),
    postsByEmail: (_: any, args: { email: string }) => {
      // Vulnerability: exposes posts by arbitrary email without auth checks
      const user = users.find(u => u.email === args.email);
      if (!user) return [];
      return posts.filter(p => p.authorId === user.id).map(p => ({ ...p, author: user }));
    }
  },
  Mutation: {
    deleteUser: (_: any, args: { id: string }) => {
      // Vulnerability: no authorization check. Anyone can call deleteUser.
      const idx = users.findIndex(u => u.id === args.id);
      if (idx === -1) return false;
      users.splice(idx, 1);
      return true;
    },
    addPost: (_: any, args: { title: string; body?: string; authorId: string }) => {
      // Vulnerability: no input validation, allows overly large payloads or script content
      const newPost = { id: String(posts.length + 1), title: args.title, body: args.body || '', authorId: args.authorId };
      posts.push(newPost);
      return { ...newPost, author: users.find(u => u.id === args.authorId) };
    }
  },
  Post: {
    author: (post: any) => users.find(u => u.id === post.authorId),
    comments: (post: any) => comments.filter(c => c.postId === post.id).map(c => ({ ...c, author: users.find(u => u.id === c.authorId) }))
  },
  Comment: {
    author: (c: any) => users.find(u => u.id === c.authorId)
  }
};

// Note: This vulnerable server intentionally omits depth limiting, complexity analysis,
// input validation, and authorization checks to be used as a training target in a closed lab.
