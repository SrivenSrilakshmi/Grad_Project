const fetch = require('node-fetch');

// More comprehensive introspection query
const fullIntrospectionQuery = `
  query FullIntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types {
        name
        kind
        description
        fields {
          name
          type {
            name
            kind
          }
          args {
            name
            type {
              name
              kind
            }
          }
        }
      }
      directives {
        name
        description
        locations
      }
    }
  }
`;

const endpoint = 'http://localhost:4000/graphql';

console.log('🔍 ENHANCED GraphQL Introspection Attack Demo');
console.log('='.repeat(50));
console.log(`Target: ${endpoint}`);
console.log('');

(async () => {
  try {
    console.log('📡 Sending comprehensive introspection query...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: fullIntrospectionQuery
      })
    });

    const result = await response.json();
    
    if (result.data && result.data.__schema) {
      console.log('');
      console.log('🚨 CRITICAL VULNERABILITY: Full Schema Exposed!');
      console.log('='.repeat(50));
      
      const schema = result.data.__schema;
      
      // Show root types
      console.log('📋 ROOT OPERATION TYPES:');
      console.log(`   Query Type: ${schema.queryType ? schema.queryType.name : 'None'}`);
      console.log(`   Mutation Type: ${schema.mutationType ? schema.mutationType.name : 'None'}`);
      console.log(`   Subscription Type: ${schema.subscriptionType ? schema.subscriptionType.name : 'None'}`);
      console.log('');
      
      // Show all types
      console.log(`📊 SCHEMA ANALYSIS:`);
      console.log(`   Total Types: ${schema.types.length}`);
      
      const typesByKind = {};
      schema.types.forEach(type => {
        if (!typesByKind[type.kind]) typesByKind[type.kind] = [];
        typesByKind[type.kind].push(type);
      });
      
      Object.keys(typesByKind).forEach(kind => {
        console.log(`   ${kind}: ${typesByKind[kind].length} types`);
      });
      
      console.log('');
      console.log('🔍 EXPOSED CUSTOM TYPES:');
      const customTypes = schema.types.filter(type => 
        !type.name.startsWith('__') && 
        type.kind === 'OBJECT' && 
        !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)
      );
      
      customTypes.forEach(type => {
        console.log(`   📄 ${type.name}:`);
        if (type.description) {
          console.log(`      Description: ${type.description}`);
        }
        if (type.fields && type.fields.length > 0) {
          console.log(`      Fields: ${type.fields.map(f => f.name).join(', ')}`);
        }
      });
      
      console.log('');
      console.log('🎯 ATTACK IMPLICATIONS:');
      console.log('   ✓ Complete API structure revealed');
      console.log('   ✓ All available operations discovered');
      console.log('   ✓ Field names and types exposed');
      console.log('   ✓ Potential attack vectors identified');
      
      console.log('');
      console.log('🛡️  REMEDIATION:');
      console.log('   • Set introspection: false in production');
      console.log('   • Implement query depth limiting');
      console.log('   • Add authentication/authorization');
      console.log('   • Monitor for introspection attempts');
      
    } else if (result.errors) {
      console.log('');
      console.log('✅ INTROSPECTION BLOCKED!');
      console.log('');
      console.log('Server returned errors:');
      result.errors.forEach(error => {
        console.log(`   ❌ ${error.message}`);
      });
      console.log('');
      console.log('🛡️  Good! Introspection appears to be properly disabled.');
      
    } else {
      console.log('');
      console.log('❓ Unexpected response:');
      console.log(JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.log('');
    console.log('❌ Connection failed');
    console.log(`Error: ${error.message}`);
    console.log('');
    console.log('Ensure GraphQL server is running on http://localhost:4000/graphql');
  }
})();