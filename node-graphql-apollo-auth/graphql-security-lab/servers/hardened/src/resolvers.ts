import { IResolvers } from '@graphql-tools/utils';
import { z } from 'zod';

// Sample in-memory store for the hardened server as well. In real deployments use parameterized queries/ORM.
const users = [
  { id: '1', name: 'Alice', email: 'alice@example.com' },
  { id: '2', name: 'Bob', email: 'bob@example.com' }
];

const posts = [
  { id: '1', title: 'Hello', body: 'World', authorId: '1' },
  { id: '2', title: 'GraphQL is fun', body: '...', authorId: '2' }
];

const commentList = [
  { id: '1', text: 'Nice', authorId: '2', postId: '1' }
];

// Input validators using zod
const emailSchema = z.object({ email: z.string().email() });
const addPostSchema = z.object({ title: z.string().min(1).max(300), body: z.string().max(2000), authorId: z.string() });

// Very simple auth check helper
function requireAuth(ctx: any) {
  if (!ctx.user) throw new Error('Not authenticated');
}

export const resolvers: IResolvers = {
  Query: {
    me: (_: any, __: any, ctx: any) => {
      // requires authentication
      requireAuth(ctx);
      return users.find(u => u.id === ctx.user.id);
    },
    users: (_: any, __: any, ctx: any) => {
      requireAuth(ctx);
      return users;
    },
    posts: () => posts.map(p => ({ ...p, author: users.find(u => u.id === p.authorId) })),
    postsByEmail: (_: any, args: any) => {
      // validate input
      const parsed = emailSchema.safeParse(args);
      if (!parsed.success) throw new Error('Invalid email');
      const user = users.find(u => u.email === parsed.data.email);
      if (!user) return [];
      return posts.filter(p => p.authorId === user.id).map(p => ({ ...p, author: user }));
    }
  },
  Mutation: {
    deleteUser: (_: any, args: { id: string }, ctx: any) => {
      // authorization: only admin or user owning the account
      requireAuth(ctx);
      if (ctx.user.role !== 'admin' && ctx.user.id !== args.id) throw new Error('Forbidden');
      const idx = users.findIndex(u => u.id === args.id);
      if (idx === -1) return false;
      users.splice(idx, 1);
      return true;
    },
    addPost: (_: any, args: any, ctx: any) => {
      requireAuth(ctx);
      const parsed = addPostSchema.safeParse(args);
      if (!parsed.success) throw new Error('Invalid input');
      // Here we would use parameterized queries or an ORM to avoid SQL injection.
      const newPost = { id: String(posts.length + 1), title: parsed.data.title, body: parsed.data.body || '', authorId: parsed.data.authorId };
      posts.push(newPost);
      return { ...newPost, author: users.find(u => u.id === newPost.authorId) };
    }
  },
  Post: {
    author: (post: any) => users.find(u => u.id === post.authorId),
    comments: (post: any) => commentList.filter(c => c.postId === post.id).map(c => ({ ...c, author: users.find(u => u.id === c.authorId) }))
  },
  Comment: {
    author: (c: any) => users.find(u => u.id === c.authorId)
  }
};

// Comments: this hardened server includes input validation, resolver-level auth, and notes
// about using parameterized DB queries/ORMs in production.
