import { GraphQLError } from 'graphql';
import { MiddlewareFn } from 'type-graphql';

const MAX_DEPTH = 5;

const getDepth = (node: any, depth: number = 0): number => {
  if (!node || typeof node !== 'object') return depth;
  return Math.max(depth, ...Object.values(node).map(child => getDepth(child, depth + 1)));
};

export const depthLimitMiddleware: MiddlewareFn = async ({ args, info }, next) => {
  const depth = getDepth(args);
  if (depth > MAX_DEPTH) {
    throw new GraphQLError(`Query exceeds maximum depth of ${MAX_DEPTH}`);
  }
  return next();
};