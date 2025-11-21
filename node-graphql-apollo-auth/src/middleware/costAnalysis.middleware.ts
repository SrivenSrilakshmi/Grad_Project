import { createComplexityRule, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';

// Create a complexity analysis rule
const costAnalysisMiddleware = createComplexityRule({
  maximumComplexity: 100,
  estimators: [
    fieldExtensionsEstimator(),
    simpleEstimator({ defaultComplexity: 1 })
  ],
  onComplete: (complexity: number) => {
    console.log(`Query complexity: ${complexity}`);
  },
  createError: (max: number, actual: number) => {
    return new GraphQLError(`Query complexity ${actual} exceeds maximum allowed complexity ${max}`);
  },
});

export default costAnalysisMiddleware;