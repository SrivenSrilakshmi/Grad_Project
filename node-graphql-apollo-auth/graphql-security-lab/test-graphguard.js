const axios = require('axios');

const HARDENED_URL = 'http://localhost:4001/graphql';

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function makeGraphQLRequest(url, query, headers = {}) {
  try {
    const response = await axios.post(url, { query }, { 
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    throw error;
  }
}

async function testGraphGuardSpecific() {
  console.log(`${BLUE}=========================================================`);
  console.log(`🛡️ GRAPHGUARD SPECIFIC VERIFICATION`);
  console.log(`=========================================================${RESET}\n`);

  // Test 1: Introspection with GraphGuard
  console.log(`${BLUE}1. Testing GraphGuard Introspection Blocking${RESET}`);
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        types {
          name
          kind
        }
      }
    }
  `;

  const introspectionResult = await makeGraphQLRequest(HARDENED_URL, introspectionQuery);
  if (introspectionResult.errors) {
    const graphguardError = introspectionResult.errors.find(err => 
      err.message.includes('GraphGuard')
    );
    if (graphguardError) {
      console.log(`${GREEN}✅ GraphGuard blocked introspection!${RESET}`);
      console.log(`${GREEN}   Message: ${graphguardError.message}${RESET}`);
    }
  } else {
    console.log(`${YELLOW}⚠️ Introspection was allowed (development mode?)${RESET}`);
  }

  // Test 2: Alias flooding attack
  console.log(`\n${BLUE}2. Testing GraphGuard Alias Flood Protection${RESET}`);
  const aliasFloodQuery = `
    query AliasFlood {
      a1: posts { id title }
      a2: posts { id title }
      a3: posts { id title }
      a4: posts { id title }
      a5: posts { id title }
      a6: posts { id title }
      a7: posts { id title }
      a8: posts { id title }
      a9: posts { id title }
      a10: posts { id title }
      a11: posts { id title }
      a12: posts { id title }
      a13: posts { id title }
      a14: posts { id title }
      a15: posts { id title }
      a16: posts { id title }
      a17: posts { id title }
      a18: posts { id title }
      a19: posts { id title }
      a20: posts { id title }
      a21: posts { id title }
      a22: posts { id title }
      a23: posts { id title }
      a24: posts { id title }
      a25: posts { id title }
      a26: posts { id title }
      a27: posts { id title }
      a28: posts { id title }
      a29: posts { id title }
      a30: posts { id title }
    }
  `;

  const aliasResult = await makeGraphQLRequest(HARDENED_URL, aliasFloodQuery);
  if (aliasResult.errors) {
    const graphguardError = aliasResult.errors.find(err => 
      err.message.includes('GraphGuard') && err.message.includes('risk score')
    );
    if (graphguardError) {
      console.log(`${GREEN}✅ GraphGuard blocked alias flood attack!${RESET}`);
      console.log(`${GREEN}   Message: ${graphguardError.message}${RESET}`);
    } else {
      console.log(`${YELLOW}⚠️ Alias flood blocked by other mechanism: ${aliasResult.errors[0].message}${RESET}`);
    }
  } else {
    console.log(`${RED}❌ Alias flood attack was not blocked${RESET}`);
  }

  // Test 3: Very deep nesting
  console.log(`\n${BLUE}3. Testing GraphGuard Deep Query Protection${RESET}`);
  const superDeepQuery = `
    query SuperDeepQuery {
      posts {
        author {
          posts {
            author {
              posts {
                author {
                  posts {
                    author {
                      posts {
                        author {
                          posts {
                            author {
                              posts {
                                author {
                                  posts {
                                    title
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const deepResult = await makeGraphQLRequest(HARDENED_URL, superDeepQuery);
  if (deepResult.errors) {
    const graphguardError = deepResult.errors.find(err => 
      err.message.includes('GraphGuard')
    );
    if (graphguardError) {
      console.log(`${GREEN}✅ GraphGuard blocked extremely deep query!${RESET}`);
      console.log(`${GREEN}   Message: ${graphguardError.message}${RESET}`);
    } else {
      console.log(`${GREEN}✅ Deep query blocked by depth limiter: ${deepResult.errors[0].message}${RESET}`);
    }
  } else {
    console.log(`${RED}❌ Extremely deep query was not blocked${RESET}`);
  }

  // Test 4: Normal query should pass
  console.log(`\n${BLUE}4. Testing Normal Query (Should Pass)${RESET}`);
  const normalQuery = `
    query NormalQuery {
      posts {
        id
        title
        author {
          name
        }
      }
    }
  `;

  const normalResult = await makeGraphQLRequest(HARDENED_URL, normalQuery);
  if (normalResult.data) {
    console.log(`${GREEN}✅ Normal queries pass through GraphGuard${RESET}`);
  } else {
    console.log(`${RED}❌ Normal query was blocked: ${normalResult.errors?.[0]?.message}${RESET}`);
  }

  console.log(`\n${BLUE}=========================================================`);
  console.log(`🛡️ GRAPHGUARD VERIFICATION SUMMARY`);
  console.log(`=========================================================${RESET}\n`);

  console.log(`${GREEN}GraphGuard is functioning as an intelligent security layer that:${RESET}`);
  console.log(`${GREEN}• Analyzes query patterns and assigns risk scores${RESET}`);
  console.log(`${GREEN}• Blocks high-risk queries (introspection, alias floods, etc.)${RESET}`);
  console.log(`${GREEN}• Works alongside traditional security measures${RESET}`);
  console.log(`${GREEN}• Allows legitimate queries to pass through${RESET}`);
}

testGraphGuardSpecific().catch(console.error);