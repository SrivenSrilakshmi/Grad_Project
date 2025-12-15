/**
 * Comprehensive Test Suite for GraphGuard Universal 2.0
 * 
 * Tests all security features:
 * - Depth limiting
 * - Complexity analysis
 * - Alias flooding detection
 * - Circular query detection
 * - Authorization validation
 * - Malicious pattern detection
 * - Audit logging
 */

const GraphGuard = require('../graphguard/graphGuard');
const { parse } = require('graphql');
const fs = require('fs');
const path = require('path');

describe('GraphGuard Universal 2.0 Security Tests', () => {
  let graphGuard;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Initialize GraphGuard with test configuration
    graphGuard = new GraphGuard({
      maxDepth: 5,
      maxComplexity: 100,
      maxAliases: 10,
      enableIntrospection: false,
      enableLogging: true,
      logDirectory: path.join(__dirname, '../logs/test'),
      fieldPermissions: {
        'secretData': ['admin'],
        'adminPanel': ['admin'],
        'deleteUser': ['admin']
      }
    });

    // Mock Express request/response
    mockReq = {
      method: 'POST',
      body: {},
      ip: '127.0.0.1',
      user: { role: 'user', id: 'test-user' },
      get: jest.fn().mockReturnValue('test-agent')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== DEPTH LIMIT TESTS ====================

  test('Should ALLOW simple query within depth limit', async () => {
    mockReq.body.query = `
      query SafeQuery {
        user {
          name
          email
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('Should BLOCK query exceeding max depth (Depth Bomb Attack)', async () => {
    mockReq.body.query = `
      query DepthBomb {
        user {
          posts {
            comments {
              author {
                posts {
                  comments {
                    author {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            extensions: expect.objectContaining({
              code: 'GRAPHGUARD_BLOCKED'
            })
          })
        ])
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ==================== ALIAS FLOODING TESTS ====================

  test('Should BLOCK alias flooding attack (DoS vector)', async () => {
    mockReq.body.query = `
      query AliasFlood {
        user1: user(id: 1) { name }
        user2: user(id: 2) { name }
        user3: user(id: 3) { name }
        user4: user(id: 4) { name }
        user5: user(id: 5) { name }
        user6: user(id: 6) { name }
        user7: user(id: 7) { name }
        user8: user(id: 8) { name }
        user9: user(id: 9) { name }
        user10: user(id: 10) { name }
        user11: user(id: 11) { name }
        user12: user(id: 12) { name }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const call = mockRes.json.mock.calls[0][0];
    expect(call.errors[0].extensions.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'ALIAS_FLOODING' })
      ])
    );
  });

  // ==================== COMPLEXITY ANALYSIS TESTS ====================

  test('Should BLOCK query with excessive complexity', async () => {
    mockReq.body.query = `
      query ComplexQuery {
        users {
          posts {
            comments {
              author {
                posts {
                  title
                }
              }
            }
          }
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  test('Should calculate complexity correctly with list fields', async () => {
    const query = `
      query {
        users(limit: 10) {
          posts(limit: 5) {
            title
          }
        }
      }
    `;

    const ast = parse(query);
    const metrics = graphGuard.analyzeComplexity(ast);

    expect(metrics.complexity).toBeGreaterThan(0);
    expect(metrics.fieldCount).toBeGreaterThan(0);
  });

  // ==================== CIRCULAR QUERY DETECTION ====================

  test('Should detect circular query patterns', async () => {
    mockReq.body.query = `
      query CircularQuery {
        user {
          friends {
            friends {
              friends {
                name
              }
            }
          }
        }
      }
    `;

    const ast = parse(mockReq.body.query);
    const metrics = graphGuard.analyzeComplexity(ast);

    expect(metrics.hasCycles).toBe(true);
  });

  // ==================== AUTHORIZATION TESTS ====================

  test('Should BLOCK unauthorized field access', async () => {
    mockReq.user = { role: 'user', id: 'test-user' };
    mockReq.body.query = `
      query UnauthorizedAccess {
        secretData {
          sensitiveInfo
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const call = mockRes.json.mock.calls[0][0];
    expect(call.errors[0].extensions.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'UNAUTHORIZED_ACCESS' })
      ])
    );
  });

  test('Should ALLOW authorized field access for admin', async () => {
    mockReq.user = { role: 'admin', id: 'admin-user' };
    mockReq.body.query = `
      query AuthorizedAccess {
        secretData {
          sensitiveInfo
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalledWith(400);
  });

  test('Should validate multiple fields in resolver chain', async () => {
    mockReq.user = { role: 'user', id: 'test-user' };
    const query = `
      query {
        user {
          name
          secretData {
            value
          }
        }
      }
    `;

    const ast = parse(query);
    const authMetrics = graphGuard.validateAuthorization(ast, mockReq.user);

    expect(authMetrics.unauthorizedFields.length).toBeGreaterThan(0);
    expect(authMetrics.unauthorizedFields[0].field).toBe('secretData');
  });

  // ==================== MALICIOUS PATTERN DETECTION ====================

  test('Should detect SQL injection attempts in variables', async () => {
    mockReq.body.query = `
      query {
        user(search: $search) {
          name
        }
      }
    `;
    mockReq.body.variables = {
      search: "'; DROP TABLE users; --"
    };

    const ast = parse(mockReq.body.query);
    const maliciousMetrics = graphGuard.detectMaliciousPatterns(
      ast,
      mockReq.body.query,
      mockReq.body.variables
    );

    expect(maliciousMetrics.isSuspicious).toBe(true);
    expect(maliciousMetrics.detectedPatterns).toContain('INJECTION_ATTEMPT');
  });

  test('Should detect XSS attempts in variables', async () => {
    mockReq.body.query = `
      query {
        user(name: $name) {
          id
        }
      }
    `;
    mockReq.body.variables = {
      name: "<script>alert('xss')</script>"
    };

    const ast = parse(mockReq.body.query);
    const maliciousMetrics = graphGuard.detectMaliciousPatterns(
      ast,
      mockReq.body.query,
      mockReq.body.variables
    );

    expect(maliciousMetrics.isSuspicious).toBe(true);
    expect(maliciousMetrics.detectedPatterns).toContain('XSS_ATTEMPT');
  });

  test('Should detect excessive argument lengths', async () => {
    const longString = 'A'.repeat(2000);
    mockReq.body.query = `
      query {
        user(description: "${longString}") {
          name
        }
      }
    `;

    const ast = parse(mockReq.body.query);
    const maliciousMetrics = graphGuard.detectMaliciousPatterns(
      ast,
      mockReq.body.query,
      {}
    );

    expect(maliciousMetrics.detectedPatterns).toContain('EXCESSIVE_ARGUMENT_LENGTH');
  });

  test('Should detect suspicious field combinations', async () => {
    mockReq.body.query = `
      query {
        user {
          password
          token
        }
      }
    `;

    const ast = parse(mockReq.body.query);
    const maliciousMetrics = graphGuard.detectMaliciousPatterns(
      ast,
      mockReq.body.query,
      {}
    );

    expect(maliciousMetrics.isSuspicious).toBe(true);
    expect(maliciousMetrics.detectedPatterns.some(p => p.includes('SUSPICIOUS_FIELD_COMBO'))).toBe(true);
  });

  // ==================== INTROSPECTION TESTS ====================

  test('Should BLOCK introspection when disabled', async () => {
    mockReq.body.query = `
      query IntrospectionQuery {
        __schema {
          types {
            name
          }
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const call = mockRes.json.mock.calls[0][0];
    expect(call.errors[0].extensions.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'INTROSPECTION_DISABLED' })
      ])
    );
  });

  test('Should detect introspection query by field name', async () => {
    const query = `
      query {
        __type(name: "User") {
          fields {
            name
          }
        }
      }
    `;

    const ast = parse(query);
    const metrics = graphGuard.analyzeComplexity(ast);

    expect(metrics.isIntrospection).toBe(true);
  });

  // ==================== RISK SCORING TESTS ====================

  test('Should calculate risk score correctly for multiple violations', async () => {
    mockReq.user = { role: 'user', id: 'test' };
    mockReq.body.query = `
      query DangerousQuery {
        user1: secretData { value }
        user2: secretData { value }
        user3: secretData { value }
        user4: secretData { value }
        user5: secretData { value }
      }
    `;

    const ast = parse(mockReq.body.query);
    const analysisResult = await graphGuard.analyzeQuery(ast, mockReq.body.query, mockReq.user, {});

    expect(analysisResult.riskScore).toBeGreaterThanOrEqual(50);
    expect(analysisResult.violations.length).toBeGreaterThan(1);
  });

  test('Should determine BLOCK action for high risk scores', () => {
    const analysisResult = { riskScore: 80, violations: [] };
    const action = graphGuard.determineAction(analysisResult);
    expect(action).toBe('BLOCK');
  });

  test('Should determine WARN action for medium risk scores', () => {
    const analysisResult = { riskScore: 50, violations: [] };
    const action = graphGuard.determineAction(analysisResult);
    expect(action).toBe('WARN');
  });

  test('Should determine ALLOW action for low risk scores', () => {
    const analysisResult = { riskScore: 20, violations: [] };
    const action = graphGuard.determineAction(analysisResult);
    expect(action).toBe('ALLOW');
  });

  // ==================== AUDIT LOGGING TESTS ====================

  test('Should create audit logs for blocked queries', async () => {
    mockReq.body.query = `
      query {
        user {
          posts {
            comments {
              author {
                posts {
                  comments {
                    content
                  }
                }
              }
            }
          }
        }
      }
    `;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    // Check that log file was created
    const logDir = path.join(__dirname, '../logs/test');
    const files = fs.readdirSync(logDir);
    const logFiles = files.filter(f => f.startsWith('graphguard-'));

    expect(logFiles.length).toBeGreaterThan(0);
  });

  // ==================== INTEGRATION TESTS ====================

  test('Should handle malformed queries gracefully', async () => {
    mockReq.body.query = 'this is not a valid query {{{';

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            extensions: { code: 'GRAPHGUARD_ERROR' }
          })
        ])
      })
    );
  });

  test('Should pass through non-GraphQL requests', async () => {
    mockReq.method = 'GET';
    mockReq.body = null;

    const middleware = graphGuard.middleware();
    await middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('Should generate correct metrics for dashboard', async () => {
    const analysisResult = {
      riskScore: 45,
      violations: [{ type: 'EXCESSIVE_DEPTH' }],
      metrics: {
        complexity: {
          depth: 6,
          complexity: 150,
          aliasCount: 3,
          fieldCount: 12,
          hasCycles: false,
          isIntrospection: false
        },
        authorization: {
          unauthorizedFields: []
        },
        malicious: {
          detectedPatterns: [],
          anomalyScore: 0
        }
      }
    };

    const metrics = graphGuard.getMetrics(analysisResult);

    expect(metrics).toMatchObject({
      depth: 6,
      complexity: 150,
      aliasCount: 3,
      fieldCount: 12,
      riskScore: 45,
      action: 'WARN',
      violations: 1
    });
  });
});
