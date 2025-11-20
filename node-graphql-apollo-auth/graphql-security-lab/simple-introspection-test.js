const fetch = require('node-fetch');

const introspectionQuery = `
  query IntrospectionQuery {
    __schema { 
      types { 
        name 
        kind
        description
      } 
    }
  }
`;

const endpoint = 'http://localhost:4000/graphql';

console.log('🔍 Testing GraphQL introspection attack...');
console.log(`Target: ${endpoint}`);
console.log('');

(async () => {
  try {
    console.log('Sending introspection query...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: introspectionQuery
      })
    });

    const result = await response.json();
    
    console.log('Response received:');
    
    if (result.data && result.data.__schema) {
      console.log('');
      console.log(' VULNERABILITY FOUND: GraphQL Introspection is ENABLED!');
      console.log('');
      console.log(`Schema information exposed:`);
      console.log(`   - Total types: ${result.data.__schema.types.length}`);
      console.log(`   - Available types:`);
      
      result.data.__schema.types.slice(0, 10).forEach(type => {
        console.log(`     • ${type.name} (${type.kind})`);
      });
      
      if (result.data.__schema.types.length > 10) {
        console.log(`     ... and ${result.data.__schema.types.length - 10} more`);
      }
      
      console.log('');
      console.log('  Impact: Attackers can discover your entire GraphQL schema');
      console.log('Recommendation: Disable introspection in production');
      
    } else if (result.errors) {
      console.log('');
      console.log('Introspection appears to be DISABLED or BLOCKED');
      console.log('');
      console.log('Errors returned:');
      result.errors.forEach(error => {
        console.log(`   • ${error.message}`);
      });
      
    } else {
      console.log('');
      console.log(' Unexpected response format:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.log('');
    console.log('Failed to connect to GraphQL endpoint');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('Make sure the GraphQL server is running on http://localhost:4000/graphql');
  }
})();