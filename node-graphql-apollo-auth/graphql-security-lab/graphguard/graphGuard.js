/**
 * GraphGuard Universal 2.0 - Comprehensive GraphQL Security Middleware
 * 
 * A sophisticated security layer that intercepts and validates GraphQL queries
 * before they reach the server's resolver pipeline.
 * 
 * Features:
 * - Query Complexity Analysis (depth, cost estimation, cycle detection)
 * - Authorization Path Validation (resolver-chain permission checking)
 * - Malicious Query Detection (behavioral and semantic analysis)
 * - Comprehensive Audit Logging
 */

const { parse, visit, getOperationAST } = require('graphql');
const fs = require('fs');
const path = require('path');

class GraphGuard {
  constructor(options = {}) {
    this.config = {
      maxDepth: options.maxDepth || 5,
      maxComplexity: options.maxComplexity || 1000,
      maxAliases: options.maxAliases || 15,
      enableIntrospection: options.enableIntrospection !== false,
      enableLogging: options.enableLogging !== false,
      logDirectory: options.logDirectory || path.join(__dirname, 'logs'),
      schema: options.schema,
      roles: options.roles || {},
      fieldPermissions: options.fieldPermissions || {},
      suspiciousPatterns: options.suspiciousPatterns || []
    };

    // Initialize baseline profile for anomaly detection
    this.baseline = {
      avgFieldCount: 10,
      avgDepth: 3,
      avgAliasCount: 2,
      commonFields: new Set(),
      commonArgumentPatterns: []
    };

    // Ensure log directory exists
    if (this.config.enableLogging) {
      this.ensureLogDirectory();
    }
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  /**
   * Main middleware function for Express
   */
  middleware() {
    return async (req, res, next) => {
      // Only intercept GraphQL POST requests
      if (req.method !== 'POST' || !req.body || !req.body.query) {
        return next();
      }

      const query = req.body.query;
      const variables = req.body.variables || {};
      const user = req.user || { role: 'anonymous' };

      try {
        // Parse the query into AST
        const ast = parse(query);
        
        // Run security analysis
        const analysisResult = await this.analyzeQuery(ast, query, user, variables);

        // Log the analysis
        if (this.config.enableLogging) {
          this.logAnalysis(analysisResult, req);
        }

        // Determine action based on risk score
        const action = this.determineAction(analysisResult);

        if (action === 'BLOCK') {
          return res.status(400).json({
            errors: [{
              message: 'Query blocked by GraphGuard',
              extensions: {
                code: 'GRAPHGUARD_BLOCKED',
                reason: analysisResult.blockReason,
                riskScore: analysisResult.riskScore,
                violations: analysisResult.violations
              }
            }]
          });
        }

        if (action === 'WARN') {
          // Attach warning to request context
          req.graphguardWarning = {
            riskScore: analysisResult.riskScore,
            warnings: analysisResult.violations
          };
        }

        // Allow query to proceed
        next();

      } catch (error) {
        console.error('GraphGuard Error:', error);
        // On error, fail secure (block the query)
        return res.status(500).json({
          errors: [{
            message: 'Query validation error',
            extensions: { code: 'GRAPHGUARD_ERROR' }
          }]
        });
      }
    };
  }

  /**
   * Comprehensive query analysis
   */
  async analyzeQuery(ast, queryString, user, variables) {
    const result = {
      riskScore: 0,
      violations: [],
      metrics: {},
      blockReason: null
    };

    // 1. Query Complexity Analysis
    const complexityMetrics = this.analyzeComplexity(ast);
    result.metrics.complexity = complexityMetrics;

    if (complexityMetrics.depth > this.config.maxDepth) {
      result.violations.push({
        type: 'EXCESSIVE_DEPTH',
        severity: 'HIGH',
        value: complexityMetrics.depth,
        limit: this.config.maxDepth
      });
      result.riskScore += 40;
    }

    if (complexityMetrics.complexity > this.config.maxComplexity) {
      result.violations.push({
        type: 'EXCESSIVE_COMPLEXITY',
        severity: 'HIGH',
        value: complexityMetrics.complexity,
        limit: this.config.maxComplexity
      });
      result.riskScore += 35;
    }

    if (complexityMetrics.aliasCount > this.config.maxAliases) {
      result.violations.push({
        type: 'ALIAS_FLOODING',
        severity: 'HIGH',
        value: complexityMetrics.aliasCount,
        limit: this.config.maxAliases
      });
      result.riskScore += 40;
    }

    if (complexityMetrics.hasCycles) {
      result.violations.push({
        type: 'CIRCULAR_QUERY',
        severity: 'MEDIUM',
        message: 'Query contains circular references'
      });
      result.riskScore += 30;
    }

    // 2. Authorization Path Validation
    const authMetrics = this.validateAuthorization(ast, user);
    result.metrics.authorization = authMetrics;

    if (authMetrics.unauthorizedFields.length > 0) {
      result.violations.push({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'CRITICAL',
        fields: authMetrics.unauthorizedFields
      });
      result.riskScore += 70;
      result.blockReason = 'Attempted access to unauthorized fields';
    }

    // 3. Malicious Query Detection
    const maliciousMetrics = this.detectMaliciousPatterns(ast, queryString, variables);
    result.metrics.malicious = maliciousMetrics;

    if (maliciousMetrics.isSuspicious) {
      result.violations.push({
        type: 'SUSPICIOUS_PATTERN',
        severity: 'MEDIUM',
        patterns: maliciousMetrics.detectedPatterns,
        anomalyScore: maliciousMetrics.anomalyScore
      });
      result.riskScore += maliciousMetrics.anomalyScore;
    }

    // 4. Introspection Check
    if (!this.config.enableIntrospection && complexityMetrics.isIntrospection) {
      result.violations.push({
        type: 'INTROSPECTION_DISABLED',
        severity: 'HIGH'
      });
      result.riskScore += 70;
      result.blockReason = 'Introspection queries are disabled';
    }

    return result;
  }

  /**
   * COMPONENT 1: Query Complexity Analyzer
   * Evaluates query depth, detects cycles, estimates computational cost
   */
  analyzeComplexity(ast) {
    const metrics = {
      depth: 0,
      complexity: 0,
      fieldCount: 0,
      aliasCount: 0,
      fragmentCount: 0,
      hasCycles: false,
      isIntrospection: false,
      resolverChain: []
    };

    let currentDepth = 0;
    let maxDepth = 0;
    const visitedTypes = new Set();
    const fieldPath = [];

    visit(ast, {
      OperationDefinition: {
        enter(node) {
          // Check if introspection query
          if (node.name && node.name.value.includes('IntrospectionQuery')) {
            metrics.isIntrospection = true;
          }
        }
      },
      Field: {
        enter(node) {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
          metrics.fieldCount++;

          const fieldName = node.name.value;
          fieldPath.push(fieldName);

          // Check for introspection fields
          if (fieldName.startsWith('__')) {
            metrics.isIntrospection = true;
          }

          // Check for aliases (DoS vector)
          if (node.alias) {
            metrics.aliasCount++;
          }

          // Estimate complexity cost (simplified model)
          // Real implementation would use schema metadata for accurate costs
          let fieldCost = 1;
          
          // List fields typically cost more (heuristic: common list field names)
          const listFieldPatterns = ['list', 'users', 'posts', 'items', 'results', 'data'];
          const isLikelyListField = listFieldPatterns.some(pattern => 
            fieldName.toLowerCase().includes(pattern)
          );
          
          if (isLikelyListField) {
            fieldCost = 10;
            
            // If there are arguments limiting the list, reduce cost
            if (node.arguments && node.arguments.length > 0) {
              const limitArg = node.arguments.find(arg => 
                ['limit', 'first', 'take'].includes(arg.name.value)
              );
              if (limitArg && limitArg.value.kind === 'IntValue') {
                fieldCost = Math.min(fieldCost, parseInt(limitArg.value.value));
              }
            }
          }

          // Multiply by depth factor (deeper = more expensive)
          const depthMultiplier = Math.pow(1.5, currentDepth);
          metrics.complexity += fieldCost * depthMultiplier;

          // Track resolver chain
          metrics.resolverChain.push({
            field: fieldName,
            depth: currentDepth,
            cost: fieldCost * depthMultiplier
          });

          // Detect circular queries - check if same field appears multiple times in current path
          // This catches patterns like: user -> friends -> user (circular reference)
          const fieldOccurrences = fieldPath.filter(f => f === fieldName).length;
          if (fieldOccurrences > 1) {
            metrics.hasCycles = true;
          }
          
          const pathSignature = fieldPath.join('.');
          visitedTypes.add(pathSignature);
        },
        leave() {
          currentDepth--;
          fieldPath.pop();
        }
      },
      FragmentDefinition: {
        enter() {
          metrics.fragmentCount++;
        }
      }
    });

    metrics.depth = maxDepth;
    return metrics;
  }

  /**
   * Helper to determine if a field returns a list
   */
  isListField(fieldName) {
    const listFieldPatterns = ['users', 'posts', 'comments', 'items', 'list', 'all'];
    return listFieldPatterns.some(pattern => 
      fieldName.toLowerCase().includes(pattern)
    );
  }

  /**
   * COMPONENT 2: Authorization Path Validator
   * Reconstructs resolver chain and validates permissions at each step
   */
  validateAuthorization(ast, user) {
    const metrics = {
      checkedFields: 0,
      unauthorizedFields: [],
      resolverChain: [],
      userRole: user.role
    };

    const userRole = user.role || 'anonymous';
    const fieldPermissions = this.config.fieldPermissions;

    visit(ast, {
      Field: {
        enter(node) {
          const fieldName = node.name.value;
          metrics.checkedFields++;

          // Skip introspection fields
          if (fieldName.startsWith('__')) {
            return;
          }

          // Check if this field has permission restrictions
          if (fieldPermissions[fieldName]) {
            const allowedRoles = fieldPermissions[fieldName];
            
            if (!allowedRoles.includes(userRole) && !allowedRoles.includes('*')) {
              metrics.unauthorizedFields.push({
                field: fieldName,
                requiredRoles: allowedRoles,
                userRole: userRole
              });
            }
          }

          // Track resolver chain for audit
          metrics.resolverChain.push({
            field: fieldName,
            authorized: !metrics.unauthorizedFields.some(uf => uf.field === fieldName)
          });
        }
      }
    });

    return metrics;
  }

  /**
   * COMPONENT 3: Malicious Query Detector
   * Performs behavioral and semantic analysis using feature extraction
   */
  detectMaliciousPatterns(ast, queryString, variables) {
    const metrics = {
      isSuspicious: false,
      anomalyScore: 0,
      detectedPatterns: [],
      features: {}
    };

    // Feature 1: Unusually long argument values
    const argLengths = [];
    visit(ast, {
      Argument: {
        enter(node) {
          if (node.value.kind === 'StringValue') {
            argLengths.push(node.value.value.length);
          }
        }
      }
    });

    const avgArgLength = argLengths.length > 0 
      ? argLengths.reduce((a, b) => a + b, 0) / argLengths.length 
      : 0;

    if (avgArgLength > 1000) {
      metrics.detectedPatterns.push('EXCESSIVE_ARGUMENT_LENGTH');
      metrics.anomalyScore += 15;
    }

    // Feature 2: Query string length anomaly
    if (queryString.length > 10000) {
      metrics.detectedPatterns.push('EXCESSIVE_QUERY_LENGTH');
      metrics.anomalyScore += 15;
    }

    // Feature 3: Suspicious field combinations
    const fieldNames = [];
    visit(ast, {
      Field: {
        enter(node) {
          fieldNames.push(node.name.value);
        }
      }
    });

    // Check for common attack patterns
    const suspiciousFieldCombinations = [
      ['user', 'password', 'token'],
      ['admin', 'delete', 'drop'],
      ['__schema', '__type', 'fields']
    ];

    for (const suspiciousCombo of suspiciousFieldCombinations) {
      const matches = suspiciousCombo.filter(field => 
        fieldNames.some(f => f.toLowerCase().includes(field.toLowerCase()))
      );
      
      if (matches.length >= 2) {
        metrics.detectedPatterns.push(`SUSPICIOUS_FIELD_COMBO: ${matches.join(', ')}`);
        metrics.anomalyScore += 10;
      }
    }

    // Feature 4: Baseline deviation
    const fieldCount = fieldNames.length;
    const depthDeviation = Math.abs(fieldCount - this.baseline.avgFieldCount) / this.baseline.avgFieldCount;
    
    if (depthDeviation > 3) {
      metrics.detectedPatterns.push('STATISTICAL_ANOMALY');
      metrics.anomalyScore += 10;
    }

    // Feature 5: Variable injection patterns
    if (variables) {
      const varKeys = Object.keys(variables);
      for (const key of varKeys) {
        const value = String(variables[key]);
        
        // Check for SQL injection patterns (shouldn't be in GraphQL but attackers try)
        if (value.match(/(\bOR\b|\bAND\b|--|;|\/\*|\*\/|xp_|sp_)/i)) {
          metrics.detectedPatterns.push('INJECTION_ATTEMPT');
          metrics.anomalyScore += 25;
        }

        // Check for script injection
        if (value.match(/<script|javascript:|onerror=|onload=/i)) {
          metrics.detectedPatterns.push('XSS_ATTEMPT');
          metrics.anomalyScore += 25;
        }
      }
    }

    metrics.isSuspicious = metrics.anomalyScore > 0;
    metrics.features = {
      avgArgLength,
      queryLength: queryString.length,
      fieldCount,
      uniqueFields: new Set(fieldNames).size
    };

    return metrics;
  }

  /**
   * Determine action based on risk score
   */
  determineAction(analysisResult) {
    if (analysisResult.riskScore >= 70) {
      return 'BLOCK';
    } else if (analysisResult.riskScore >= 40) {
      return 'WARN';
    }
    return 'ALLOW';
  }

  /**
   * COMPONENT 4: Comprehensive Audit Logging
   */
  logAnalysis(analysisResult, req) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      user: req.user ? req.user.id : 'anonymous',
      query: req.body.query.substring(0, 500), // Truncate for log size
      action: this.determineAction(analysisResult),
      riskScore: analysisResult.riskScore,
      violations: analysisResult.violations,
      metrics: analysisResult.metrics
    };

    const logFile = path.join(
      this.config.logDirectory,
      `graphguard-${new Date().toISOString().split('T')[0]}.log`
    );

    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');

    // Also console log for immediate visibility
    if (analysisResult.riskScore >= 40) {
      console.log(`[GraphGuard] ${logEntry.action} - Risk: ${analysisResult.riskScore}`, 
        analysisResult.violations.map(v => v.type));
    }
  }

  /**
   * Generate metrics summary (for dashboard integration)
   */
  getMetrics(analysisResult) {
    return {
      depth: analysisResult.metrics.complexity?.depth || 0,
      complexity: analysisResult.metrics.complexity?.complexity || 0,
      aliasCount: analysisResult.metrics.complexity?.aliasCount || 0,
      fieldCount: analysisResult.metrics.complexity?.fieldCount || 0,
      riskScore: analysisResult.riskScore,
      action: this.determineAction(analysisResult),
      violations: analysisResult.violations.length,
      isIntrospection: analysisResult.metrics.complexity?.isIntrospection || false,
      hasCircularRefs: analysisResult.metrics.complexity?.hasCycles || false,
      unauthorizedFields: analysisResult.metrics.authorization?.unauthorizedFields.length || 0,
      suspiciousPatterns: analysisResult.metrics.malicious?.detectedPatterns.length || 0
    };
  }
}

module.exports = GraphGuard;
