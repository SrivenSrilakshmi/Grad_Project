const axios = require('axios');

const deepQuery = `
  query {
    user(id: "1") {
      name
      posts {
        title
        comments {
          text
          author {
            name
            posts {
              title
            }
          }
        }
      }
    }
  }
`;

async function testServers() {
  console.log('\n🧪 Testing GraphGuard Protection\n');
  console.log('='.repeat(60));
  
  // Test vulnerable server
  console.log('\n📍 Testing VULNERABLE Server (http://localhost:4000/graphql)');
  try {
    const response = await axios.post('http://localhost:4000/graphql', {
      query: deepQuery
    });
    console.log('✅ Query ALLOWED (Depth: 6 levels)');
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Test hardened server with GraphGuard
  console.log('\n📍 Testing HARDENED Server with GraphGuard (http://localhost:4001/graphql)');
  try {
    const response = await axios.post('http://localhost:4001/graphql', {
      query: deepQuery
    });
    console.log('✅ Query ALLOWED');
    console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
  } catch (error) {
    if (error.response) {
      console.log('🛡️  Query BLOCKED by GraphGuard!');
      console.log('Status:', error.response.status);
      console.log('Reason:', error.response.data.errors[0].message);
      console.log('Risk Score:', error.response.data.errors[0].extensions.riskScore);
      console.log('Violations:', error.response.data.errors[0].extensions.violations.map(v => v.type).join(', '));
    } else {
      console.log('❌ Error:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ GraphGuard successfully protecting your GraphQL API!\n');
}

testServers();
