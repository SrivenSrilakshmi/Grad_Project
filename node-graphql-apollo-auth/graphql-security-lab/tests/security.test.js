const request = require('supertest');
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { typeDefs } = require('./servers/common/schema/typeDefs');
const { resolvers } = require('./servers/vulnerable/src/resolvers');

describe('GraphQL Security Vulnerability Tests', () => {
  let app;
  let server;
  let vulnerableServer;
  
  beforeAll(async () => {
    // Setup vulnerable server for testing
    app = express();
    
    vulnerableServer = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: true, // Intentionally vulnerable
      playground: true,
      // No security controls
    });
    
    await vulnerableServer.start();
    vulnerableServer.applyMiddleware({ app });
  });
  
  afterAll(async () => {
    if (vulnerableServer) {
      await vulnerableServer.stop();
    }
  });

  describe('Introspection Vulnerability Tests', () => {
    test('should expose schema through introspection', async () => {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
            }
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query: introspectionQuery })
        .expect(200);
      
      expect(response.body.data).toBeDefined();
      expect(response.body.data.__schema).toBeDefined();
      expect(response.body.data.__schema.types).toBeInstanceOf(Array);
      expect(response.body.data.__schema.types.length).toBeGreaterThan(5);
      
      // Check for custom types
      const typeNames = response.body.data.__schema.types.map(t => t.name);
      expect(typeNames).toContain('User');
      expect(typeNames).toContain('Post');
      expect(typeNames).toContain('Query');
    });
    
    test('should expose detailed field information', async () => {
      const detailedIntrospection = `
        query DetailedIntrospection {
          __schema {
            queryType {
              fields {
                name
                type {
                  name
                }
              }
            }
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query: detailedIntrospection })
        .expect(200);
      
      expect(response.body.data.__schema.queryType.fields).toBeInstanceOf(Array);
      const fieldNames = response.body.data.__schema.queryType.fields.map(f => f.name);
      
      // Verify sensitive operations are exposed
      expect(fieldNames).toContain('users');
      expect(fieldNames).toContain('postsByEmail');
    });
  });

  describe('Deep Query Vulnerability Tests', () => {
    test('should allow deeply nested queries', async () => {
      const deepQuery = `
        query DeepQuery {
          users {
            posts {
              comments {
                author {
                  posts {
                    comments {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/graphql')
        .send({ query: deepQuery })
        .expect(200);
      const duration = Date.now() - startTime;
      
      // Should succeed but take measurable time
      expect(response.body.data).toBeDefined();
      expect(duration).toBeGreaterThan(10); // Should take some time to process
    });
    
    test('should demonstrate exponential complexity growth', async () => {
      const queries = [
        'query { users { id } }',
        'query { users { posts { id } } }',
        'query { users { posts { comments { id } } } }',
        'query { users { posts { comments { author { id } } } } }'
      ];
      
      const times = [];
      
      for (const query of queries) {
        const startTime = Date.now();
        await request(app)
          .post('/graphql')
          .send({ query })
          .expect(200);
        times.push(Date.now() - startTime);
      }
      
      // Each level should generally take longer (with some variance)
      expect(times[3]).toBeGreaterThan(times[0]);
    });
  });

  describe('Authorization Vulnerability Tests', () => {
    test('should allow unauthorized access to user data', async () => {
      const unauthorizedQuery = `
        query UnauthorizedAccess {
          users {
            id
            name
            email
            posts {
              title
              body
            }
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query: unauthorizedQuery })
        .expect(200);
      
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      
      // Should expose sensitive email data
      const firstUser = response.body.data.users[0];
      expect(firstUser.email).toBeDefined();
      expect(firstUser.email).toMatch(/@/);
    });
    
    test('should allow unauthorized mutations', async () => {
      const dangerousMutation = `
        mutation DangerousOperation {
          deleteUser(id: "999") 
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query: dangerousMutation })
        .expect(200);
      
      // Should process without authorization check
      expect(response.body.data).toBeDefined();
      expect(response.body.errors).toBeUndefined();
    });
  });

  describe('Query Complexity Vulnerability Tests', () => {
    test('should allow resource-intensive aliased queries', async () => {
      // Generate query with many aliases
      let aliases = '';
      for (let i = 0; i < 20; i++) {
        aliases += `alias${i}: users { id name email posts { title body } } `;
      }
      
      const complexQuery = `query ComplexQuery { ${aliases} }`;
      
      const startTime = Date.now();
      const response = await request(app)
        .post('/graphql')
        .send({ query: complexQuery })
        .expect(200);
      const duration = Date.now() - startTime;
      
      expect(response.body.data).toBeDefined();
      expect(duration).toBeGreaterThan(50); // Should take noticeable time
      
      // Verify all aliases returned data
      for (let i = 0; i < 20; i++) {
        expect(response.body.data[`alias${i}`]).toBeDefined();
      }
    });
    
    test('should demonstrate query complexity scaling', async () => {
      const complexityLevels = [1, 5, 10, 15];
      const durations = [];
      
      for (const level of complexityLevels) {
        let aliases = '';
        for (let i = 0; i < level; i++) {
          aliases += `alias${i}: users { posts { comments { author { name } } } } `;
        }
        
        const query = `query { ${aliases} }`;
        const startTime = Date.now();
        
        await request(app)
          .post('/graphql')
          .send({ query })
          .expect(200);
        
        durations.push(Date.now() - startTime);
      }
      
      // Generally, more complexity should take longer
      expect(durations[3]).toBeGreaterThan(durations[0]);
    });
  });

  describe('Input Validation Vulnerability Tests', () => {
    test('should accept potentially malicious input', async () => {
      const maliciousInput = `
        mutation MaliciousInput {
          addPost(
            title: "<script>alert('xss')</script>", 
            body: "'; DROP TABLE users; --",
            authorId: "1"
          ) {
            id
            title
            body
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query: maliciousInput })
        .expect(200);
      
      expect(response.body.data.addPost).toBeDefined();
      // Should store malicious content without validation
      expect(response.body.data.addPost.title).toContain('<script>');
      expect(response.body.data.addPost.body).toContain('DROP TABLE');
    });
    
    test('should accept oversized input', async () => {
      const largeString = 'A'.repeat(10000);
      
      const oversizedQuery = `
        mutation OversizedInput {
          addPost(
            title: "${largeString}",
            body: "${largeString}",
            authorId: "1"
          ) {
            id
            title
          }
        }
      `;
      
      const response = await request(app)
        .post('/graphql')
        .send({ query: oversizedQuery })
        .expect(200);
      
      expect(response.body.data.addPost).toBeDefined();
      expect(response.body.data.addPost.title).toHaveLength(10000);
    });
  });

  describe('Performance Impact Tests', () => {
    test('should measure baseline query performance', async () => {
      const simpleQuery = 'query { users { id name } }';
      
      const iterations = 10;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await request(app)
          .post('/graphql')
          .send({ query: simpleQuery })
          .expect(200);
        times.push(Date.now() - startTime);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(100); // Baseline should be fast
      expect(maxTime).toBeLessThan(200);
      
      // Store metrics for comparison
      global.baselineMetrics = { avgTime, maxTime, times };
    });
    
    test('should show performance degradation with complex queries', async () => {
      const complexQuery = `
        query ComplexPerformanceTest {
          users {
            posts {
              comments {
                author {
                  posts {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      `;
      
      const iterations = 5;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await request(app)
          .post('/graphql')
          .send({ query: complexQuery })
          .expect(200);
        times.push(Date.now() - startTime);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      
      // Should be significantly slower than baseline
      if (global.baselineMetrics) {
        expect(avgTime).toBeGreaterThan(global.baselineMetrics.avgTime * 2);
      }
    });
  });
});

// Security Test Suite for Hardened Server
describe('GraphQL Security Mitigation Tests', () => {
  // These tests would run against the hardened server
  // and verify that attacks are properly blocked
  
  test('TODO: Test introspection is disabled in production', () => {
    // Would test against hardened server with introspection disabled
    expect(true).toBe(true); // Placeholder
  });
  
  test('TODO: Test query depth limiting', () => {
    // Would test that deep queries are rejected
    expect(true).toBe(true); // Placeholder
  });
  
  test('TODO: Test query complexity analysis', () => {
    // Would test that complex queries are rejected
    expect(true).toBe(true); // Placeholder
  });
  
  test('TODO: Test authorization enforcement', () => {
    // Would test that unauthorized access is blocked
    expect(true).toBe(true); // Placeholder
  });
});