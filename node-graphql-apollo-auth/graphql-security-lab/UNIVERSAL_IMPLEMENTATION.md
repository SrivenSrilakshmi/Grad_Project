# GraphGuard 2.0: Universal Implementation Guide

GraphGuard 2.0 is designed as a **universal GraphQL security layer** that can be implemented in ANY GraphQL server framework. Here's how developers can integrate it into their projects:

## Quick Start (Any Framework)

```javascript
const { UniversalGraphGuard } = require('./universal-graphguard');

// Create guard instance
const guard = new UniversalGraphGuard({
  maxAllowedDepth: 10,
  riskBlockScore: 75,
  enableLogging: true
});

// Analyze any GraphQL query
const { parse } = require('graphql');
const document = parse(`query { user { posts { comments { author } } } }`);
const result = guard.analyzeQuery(document, queryString);

if (result.blocked) {
  console.log('🚫 Query blocked:', result.warnings);
} else {
  console.log('✅ Query allowed, risk:', result.risk);
}
```

## Framework-Specific Implementations

### 1. Apollo Server 4.x
```javascript
const { ApolloServer } = require('@apollo/server');
const { createApolloPlugin } = require('./universal-graphguard');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    createApolloPlugin({
      maxAllowedDepth: 12,
      riskBlockScore: 80
    })
  ]
});
```

### 2. GraphQL Yoga
```javascript
const { createYoga } = require('graphql-yoga');
const { createYogaPlugin } = require('./universal-graphguard');

const yoga = createYoga({
  schema,
  plugins: [
    createYogaPlugin({
      aliasThreshold: 25,
      enableLogging: true
    })
  ]
});
```

### 3. Express + GraphQL
```javascript
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { createExpressMiddleware } = require('./universal-graphguard');

const app = express();

// Add GraphGuard middleware before GraphQL
app.use('/graphql', createExpressMiddleware({
  depthHardBlock: 20,
  riskWarnScore: 50
}));

app.use('/graphql', graphqlHTTP({
  schema,
  graphiql: true
}));
```

### 4. Mercurius (Fastify)
```javascript
const fastify = require('fastify')();
const { createMercuriusPlugin } = require('./universal-graphguard');

await fastify.register(require('mercurius'), {
  schema,
  resolvers,
  plugins: [
    createMercuriusPlugin({
      introspectionCost: 60,
      customPatterns: [/admin/i]
    })
  ]
});
```

### 5. Hot Chocolate (.NET)
```csharp
// C# implementation example
public class GraphGuardMiddleware
{
    private readonly UniversalGraphGuardConfig _config;
    
    public async Task InvokeAsync(IMiddlewareContext context)
    {
        var query = context.Request.Query;
        var analysis = UniversalGraphGuard.Analyze(query, _config);
        
        if (analysis.Blocked)
        {
            throw new GraphQLException($"Query blocked: {analysis.Risk}");
        }
        
        context.Items["GraphGuard"] = analysis;
        await _next(context);
    }
}
```

### 6. Lighthouse (PHP Laravel)
```php
<?php
// PHP implementation example
class GraphGuardDirective extends BaseDirective
{
    public function handleField(FieldValue $fieldValue): void
    {
        $fieldValue->wrapResolver(function ($resolver) {
            return function ($root, $args, $context, $info) use ($resolver) {
                $guard = new UniversalGraphGuard($this->config);
                $analysis = $guard->analyzeQuery($info->fieldNodes, $context);
                
                if ($analysis['blocked']) {
                    throw new \Exception("GraphGuard: Query blocked (risk: {$analysis['risk']})");
                }
                
                return $resolver($root, $args, $context, $info);
            };
        });
    }
}
```

### 7. Strawberry (Python)
```python
# Python implementation example
import strawberry
from universal_graphguard import UniversalGraphGuard

class GraphGuardExtension:
    def __init__(self, config=None):
        self.guard = UniversalGraphGuard(config or {})
    
    def get_results(self, execution_context):
        query = execution_context.query
        analysis = self.guard.analyze_query(query.document, str(query))
        
        if analysis['blocked']:
            raise Exception(f"GraphGuard: Query blocked (risk: {analysis['risk']})")
        
        execution_context.context['graphguard'] = analysis
        return {}

@strawberry.type
class Query:
    # Your resolvers here
    pass

schema = strawberry.Schema(
    query=Query,
    extensions=[GraphGuardExtension({'max_depth': 15})]
)
```

## Advanced Configuration

### Custom Risk Patterns
```javascript
const guard = new UniversalGraphGuard({
  customPatterns: [
    /suspicious_operation/i,
    /\b(eval|exec|system)\b/i,
    /\$\{.*process\./i
  ],
  maxAllowedDepth: 8,
  aliasThreshold: 20
});
```

### Environment-Specific Configs
```javascript
// Production config
const prodConfig = {
  maxAllowedDepth: 8,
  riskBlockScore: 70,
  enableLogging: false,
  introspectionCost: 100  // Higher cost in production
};

// Development config
const devConfig = {
  maxAllowedDepth: 15,
  riskBlockScore: 90,
  enableLogging: true,
  introspectionCost: 10   // Lower cost in development
};

const config = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;
const guard = new UniversalGraphGuard(config);
```

### Custom Risk Scoring
```javascript
class CustomGraphGuard extends UniversalGraphGuard {
  calculateRiskScore(metrics) {
    let risk = super.calculateRiskScore(metrics);
    
    // Add custom business logic
    if (metrics.operationType === 'mutation') {
      risk += 10; // Mutations are inherently riskier
    }
    
    // Time-based risk (higher risk during off-hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      risk += 15;
    }
    
    return risk;
  }
}
```

## Benefits of Universal Implementation

1. **Framework Independence**: Works with any GraphQL implementation
2. **Consistent Security**: Same protection logic across all your services
3. **Easy Migration**: Move between frameworks without losing security
4. **Standardization**: Creates industry standard for GraphQL security
5. **Community Contribution**: Others can enhance and extend the core logic

## Installation

```bash
npm install universal-graphguard
# or
yarn add universal-graphguard
```

## Contributing

The universal core is designed to be:
- **Framework-agnostic**: Core logic never depends on specific implementations
- **Extensible**: Easy to add new risk patterns and scoring methods
- **Portable**: Can be translated to other languages (Python, C#, PHP, etc.)
- **Maintainable**: Clear separation between core intelligence and framework adapters

Anyone can contribute by:
1. Adding new framework adapters
2. Enhancing the core risk analysis
3. Creating language-specific implementations
4. Improving documentation and examples

This makes GraphGuard not just a tool, but a **universal standard** for GraphQL security.