const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class GraphQLSecurityMetrics {
  constructor(endpoint = 'http://localhost:4000/graphql') {
    this.endpoint = endpoint;
    this.results = {
      timestamp: new Date().toISOString(),
      endpoint: endpoint,
      tests: []
    };
  }

  async measureQuery(name, query, expectedResult = null) {
    console.log(`📊 Measuring: ${name}`);
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const result = await response.json();
      
      const metrics = {
        name,
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration: endTime - startTime,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        },
        responseSize: JSON.stringify(result).length,
        success: !result.errors,
        hasData: !!result.data,
        errorCount: result.errors ? result.errors.length : 0,
        statusCode: response.status
      };
      
      // Check if expected result matches
      if (expectedResult) {
        metrics.expectedResult = expectedResult;
        metrics.resultMatches = this.checkExpectedResult(result, expectedResult);
      }
      
      this.results.tests.push(metrics);
      
      console.log(`   ⏱️  Duration: ${metrics.duration}ms`);
      console.log(`   📦 Response: ${metrics.responseSize} bytes`);
      console.log(`   ✅ Success: ${metrics.success}`);
      
      return metrics;
      
    } catch (error) {
      const endTime = Date.now();
      const metrics = {
        name,
        query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
        duration: endTime - startTime,
        error: error.message,
        success: false
      };
      
      this.results.tests.push(metrics);
      console.log(`   ❌ Error: ${error.message}`);
      return metrics;
    }
  }

  checkExpectedResult(result, expected) {
    if (expected.shouldHaveIntrospection) {
      return result.data && result.data.__schema;
    }
    if (expected.shouldBeBlocked) {
      return result.errors && result.errors.length > 0;
    }
    if (expected.shouldTimeout) {
      return false; // If we got here, it didn't timeout
    }
    return true;
  }

  async runFullSecurityAssessment() {
    console.log('🔒 GraphQL Security Assessment Starting...');
    console.log('==========================================');
    
    // Test 1: Basic connectivity
    await this.measureQuery(
      'Basic Connectivity Test',
      'query { __typename }',
      { shouldHaveIntrospection: false }
    );
    
    // Test 2: Introspection attack
    await this.measureQuery(
      'Introspection Attack',
      `query IntrospectionAttack {
        __schema {
          types {
            name
            kind
            fields {
              name
              type {
                name
              }
            }
          }
        }
      }`,
      { shouldHaveIntrospection: true }
    );
    
    // Test 3: Progressive depth attacks
    for (let depth = 1; depth <= 8; depth++) {
      const deepQuery = this.generateDeepQuery(depth);
      await this.measureQuery(
        `Deep Query Attack (Depth ${depth})`,
        deepQuery,
        depth > 6 ? { shouldTimeout: true } : null
      );
    }
    
    // Test 4: Query complexity attacks
    for (let complexity = 10; complexity <= 100; complexity += 30) {
      const complexQuery = this.generateComplexQuery(complexity);
      await this.measureQuery(
        `Complex Query Attack (${complexity} fields)`,
        complexQuery
      );
    }
    
    // Test 5: Resource exhaustion via aliasing
    const aliasedQuery = this.generateAliasedQuery(50);
    await this.measureQuery(
      'Resource Exhaustion (50 aliases)',
      aliasedQuery
    );
    
    // Test 6: Authorization bypass attempts
    await this.measureQuery(
      'Authorization Bypass Test',
      `query UnauthorizedAccess {
        users {
          id
          email
          posts {
            title
            body
          }
        }
      }`
    );
    
    console.log('');
    console.log('📊 Assessment Complete!');
    this.generateReport();
  }

  generateDeepQuery(depth) {
    let query = 'users {';
    for (let i = 0; i < depth; i++) {
      if (i % 2 === 0) {
        query += ' posts {';
      } else {
        query += ' comments {';
      }
    }
    query += ' id';
    for (let i = 0; i < depth; i++) {
      query += ' }';
    }
    return `query DeepQuery { ${query} }`;
  }

  generateComplexQuery(fieldCount) {
    let fields = '';
    for (let i = 0; i < fieldCount; i++) {
      fields += ` field${i}: users { id name email }`;
    }
    return `query ComplexQuery { ${fields} }`;
  }

  generateAliasedQuery(aliasCount) {
    let aliases = '';
    for (let i = 0; i < aliasCount; i++) {
      aliases += ` alias${i}: users { id name email posts { title } }`;
    }
    return `query AliasedQuery { ${aliases} }`;
  }

  generateReport() {
    // Calculate summary statistics
    const successful = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.length - successful;
    const avgDuration = this.results.tests
      .filter(t => t.duration)
      .reduce((sum, t) => sum + t.duration, 0) / this.results.tests.length;
    
    const summary = {
      totalTests: this.results.tests.length,
      successful,
      failed,
      averageDuration: Math.round(avgDuration),
      vulnerabilities: this.assessVulnerabilities()
    };
    
    this.results.summary = summary;
    
    // Save detailed results
    const outputPath = path.join(__dirname, 'security-assessment-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    
    // Generate human-readable report
    this.generateHumanReport();
    
    console.log(`📄 Detailed results saved to: ${outputPath}`);
    return this.results;
  }

  assessVulnerabilities() {
    const vulnerabilities = [];
    
    // Check for introspection vulnerability
    const introspectionTest = this.results.tests.find(t => t.name === 'Introspection Attack');
    if (introspectionTest && introspectionTest.hasData) {
      vulnerabilities.push({
        type: 'Information Disclosure',
        severity: 'High',
        description: 'GraphQL schema introspection is enabled',
        evidence: 'Introspection query returned schema data'
      });
    }
    
    // Check for DoS vulnerability via deep queries
    const deepTests = this.results.tests.filter(t => t.name.includes('Deep Query'));
    const slowDeepTests = deepTests.filter(t => t.duration > 500);
    if (slowDeepTests.length > 0) {
      vulnerabilities.push({
        type: 'Denial of Service',
        severity: 'High', 
        description: 'No query depth limiting implemented',
        evidence: `Deep queries cause significant performance degradation (${slowDeepTests.length} tests > 500ms)`
      });
    }
    
    // Check for resource exhaustion
    const complexTests = this.results.tests.filter(t => t.name.includes('Complex Query'));
    const slowComplexTests = complexTests.filter(t => t.duration > 1000);
    if (slowComplexTests.length > 0) {
      vulnerabilities.push({
        type: 'Resource Exhaustion',
        severity: 'Medium',
        description: 'No query complexity analysis implemented',
        evidence: `Complex queries cause performance issues (${slowComplexTests.length} tests > 1s)`
      });
    }
    
    return vulnerabilities;
  }

  generateHumanReport() {
    const reportPath = path.join(__dirname, 'security-assessment-report.md');
    const report = `# GraphQL Security Assessment Report

Generated: ${this.results.timestamp}
Endpoint: ${this.results.endpoint}

## Executive Summary

- **Total Tests**: ${this.results.summary.totalTests}
- **Successful**: ${this.results.summary.successful}
- **Failed**: ${this.results.summary.failed}
- **Average Response Time**: ${this.results.summary.averageDuration}ms
- **Vulnerabilities Found**: ${this.results.summary.vulnerabilities.length}

## Vulnerabilities Identified

${this.results.summary.vulnerabilities.map(v => `
### ${v.type} (${v.severity} Severity)
**Description**: ${v.description}
**Evidence**: ${v.evidence}
`).join('\n')}

## Detailed Test Results

${this.results.tests.map(test => `
### ${test.name}
- **Duration**: ${test.duration}ms
- **Response Size**: ${test.responseSize} bytes
- **Success**: ${test.success}
- **Memory Impact**: ${test.memoryDelta ? `RSS: ${test.memoryDelta.rss}, Heap: ${test.memoryDelta.heapUsed}` : 'N/A'}
${test.error ? `- **Error**: ${test.error}` : ''}
`).join('\n')}

## Recommendations

1. **Implement Query Depth Limiting**: Use libraries like \`graphql-depth-limit\` to prevent deep query attacks
2. **Add Query Complexity Analysis**: Implement \`graphql-query-complexity\` to prevent resource exhaustion
3. **Disable Introspection in Production**: Set \`introspection: false\` in production environments
4. **Add Rate Limiting**: Implement request rate limiting to prevent abuse
5. **Implement Authorization**: Add proper access controls to all resolver functions

## Conclusion

${this.results.summary.vulnerabilities.length > 0 
  ? `This GraphQL endpoint has ${this.results.summary.vulnerabilities.length} security vulnerabilities that should be addressed before production deployment.`
  : 'This GraphQL endpoint appears to have appropriate security controls in place.'
}
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📊 Human-readable report saved to: ${reportPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const endpoint = process.argv[2] || 'http://localhost:4000/graphql';
  const metrics = new GraphQLSecurityMetrics(endpoint);
  
  metrics.runFullSecurityAssessment().catch(error => {
    console.error('❌ Assessment failed:', error.message);
    process.exit(1);
  });
}

module.exports = GraphQLSecurityMetrics;