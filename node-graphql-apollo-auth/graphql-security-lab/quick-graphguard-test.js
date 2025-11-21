const axios = require('axios');

const HARDENED_URL = 'http://localhost:4001/graphql';

async function testGraphGuard() {
  console.log('🛡️ Testing GraphGuard Implementation...\n');

  // Test 1: Introspection Query (should be blocked by GraphGuard)
  console.log('1. Testing Introspection Blocking:');
  try {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types { name kind }
        }
      }
    `;
    
    const response = await axios.post(HARDENED_URL, { query: introspectionQuery });
    
    if (response.data.errors) {
      const graphGuardError = response.data.errors.find(err => 
        err.message.includes('GraphGuard')
      );
      if (graphGuardError) {
        console.log('✅ GraphGuard is ACTIVE and blocking introspection!');
        console.log(`   Message: ${graphGuardError.message}`);
      } else {
        console.log('⚠️ Query blocked but not by GraphGuard');
      }
    } else {
      console.log('❌ Introspection query was allowed');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 2: Alias Flood (should be blocked by GraphGuard)  
  console.log('\n2. Testing Alias Flood Protection:');
  try {
    const aliasFloodQuery = `
      query AliasFlood {
        ${Array.from({length: 30}, (_, i) => `alias${i}: posts { id title }`).join('\n        ')}
      }
    `;
    
    const response = await axios.post(HARDENED_URL, { query: aliasFloodQuery });
    
    if (response.data.errors) {
      const graphGuardError = response.data.errors.find(err => 
        err.message.includes('GraphGuard')
      );
      if (graphGuardError) {
        console.log('✅ GraphGuard is blocking alias flood attacks!');
        console.log(`   Message: ${graphGuardError.message}`);
      } else {
        console.log('⚠️ Query blocked but not by GraphGuard');
      }
    } else {
      console.log('❌ Alias flood query was allowed');
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  // Test 3: Normal Query (should be allowed)
  console.log('\n3. Testing Normal Query (should pass):');
  try {
    const normalQuery = `
      query NormalQuery {
        posts {
          id
          title
          author { name }
        }
      }
    `;
    
    const response = await axios.post(HARDENED_URL, { query: normalQuery });
    
    if (response.data.data) {
      console.log('✅ Normal queries pass through GraphGuard successfully');
    } else if (response.data.errors) {
      console.log('⚠️ Normal query had errors:', response.data.errors[0].message);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }

  console.log('\n🛡️ GraphGuard Test Complete!');
}

testGraphGuard().catch(console.error);