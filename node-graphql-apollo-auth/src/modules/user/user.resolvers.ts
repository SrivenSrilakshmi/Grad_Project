import { User } from './user.model';
import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { Context } from '../../context';
import { Role } from '../../auth/roles';

const userResolvers = {
  Query: {
    getUser: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }
      const user = await User.findById(id);
      if (!user) {
        throw new ForbiddenError('User not found');
      }
      return user;
    },
    getAllUsers: async (_: any, __: any, context: Context) => {
      if (!context.user || context.user.role !== Role.ADMIN) {
        throw new ForbiddenError('You do not have permission to access this resource');
      }
      return await User.find();
    },
  },
  Mutation: {
    createUser: async (_: any, { input }: { input: any }, context: Context) => {
      if (!context.user || context.user.role !== Role.ADMIN) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }
      const newUser = new User(input);
      return await newUser.save();
    },
    updateUser: async (_: any, { id, input }: { id: string; input: any }, context: Context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }
      const user = await User.findByIdAndUpdate(id, input, { new: true });
      if (!user) {
        throw new ForbiddenError('User not found');
      }
      return user;
    },
    deleteUser: async (_: any, { id }: { id: string }, context: Context) => {
      if (!context.user || context.user.role !== Role.ADMIN) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }
      const user = await User.findByIdAndDelete(id);
      if (!user) {
        throw new ForbiddenError('User not found');
      }
      return user;
    },
  },
};

export default userResolvers;