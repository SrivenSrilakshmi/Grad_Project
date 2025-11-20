import { GraphQLObjectType, GraphQLInt } from 'graphql';
import { ApolloServerPlugin } from '@apollo/server';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const complexityLimitRule = createComplexityLimitRule(100, {
  onCost: (cost) => {
    console.log(`Query cost: ${cost}`);
  },
});

const costAnalysisMiddleware = ApolloServerPlugin {
  requestDidStart() {
    return {
      didResolveOperation({ request, document }) {
        const complexity = complexityLimitRule(document);
        if (complexity > 100) {
          throw new Error(`Query is too complex: ${complexity}`);
        }
      },
    };
  },
};

export default costAnalysisMiddleware;