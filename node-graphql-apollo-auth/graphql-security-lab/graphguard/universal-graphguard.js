// GraphGuard 2.0: Universal GraphQL Security Layer
// Framework-agnostic core that can be adapted to ANY GraphQL implementation

const { visit, parse } = require('graphql');

// Universal Configuration (environment-agnostic)
const DEFAULT_CONFIG = {
  maxAllowedDepth: 12,
  depthHardBlock: 25,
  maxSelectionsSoft: 300,
  aliasThreshold: 30,
  lengthThreshold: 5000,
  riskBlockScore: 80,
  riskWarnScore: 40,
  introspectionCost: 50,
  baseCost: 1,
  enableLogging: true,
  customPatterns: []
};

// Injection detection patterns (extensible)
const INJECTION_PATTERNS = [
  /<script/i,
  /union\s+select/i,
  /sleep\(/i,
  /;\s*drop\s+table/i,
  /\$\{.*\}/,
  /\{\{.*\}\}/,
  /<%.*%>/
];

/**
 * Universal GraphGuard Core - Framework Independent
 * This is the heart of GraphGuard that works with ANY GraphQL implementation
 */
class UniversalGraphGuard {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patterns = [...INJECTION_PATTERNS, ...(config.customPatterns || [])];
  }

  /**
   * Main analysis method - works with any parsed GraphQL document
   * @param {DocumentNode} document - Parsed GraphQL document
   * @param {string} queryString - Raw query string
   * @param {Object} context - Request context (optional)
   * @returns {Object} Security analysis result
   */
  analyzeQuery(document, queryString, context = {}) {
    const startTime = Date.now();
    
    // Extract operation (handle multiple operations)
    const operations = document.definitions.filter(def => def.kind === 'OperationDefinition');
    if (operations.length === 0) {
      throw new Error('GraphGuard: No valid operations found');
    }
    
    // Analyze first operation (or specified operation)
    const operation = operations[0]; // Could be enhanced to handle operation selection
    
    // Initialize metrics
    const metrics = {
      depth: this.computeDepth(operation),
      selections: this.countSelections(operation),
      aliases: this.countAliases(document),
      introspection: this.containsIntrospection(document),
      injections: this.checkInjectionPatterns(queryString),
      length: queryString.length,
      operationType: operation.operation,
      complexity: 0, // Will be calculated
      fieldDuplication: this.countFieldDuplication(document),
      circularRisk: this.detectCircularReferences(operation),
      listMultiplier: this.calculateListMultiplier(operation),
      argumentComplexity: this.analyzeArguments(operation),
      estimatedTime: 0 // Will be calculated
    };

    // Calculate complexity score
    metrics.complexity = this.calculateComplexity(metrics);
    
    // Calculate estimated execution time (ms)
    metrics.estimatedTime = this.estimateExecutionTime(metrics);
    
    // Calculate risk score
    const risk = this.calculateRiskScore(metrics);
    
    // Determine action
    const action = this.determineAction(risk, metrics);
    
    // Create result
    const result = {
      risk: parseFloat(risk.toFixed(2)),
      metrics,
      action,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      blocked: action === 'BLOCK',
      warnings: action === 'WARN' ? this.generateWarnings(metrics) : []
    };

    // Log if enabled
    if (this.config.enableLogging) {
      this.logAnalysis(result);
    }

    return result;
  }

  /**
   * Quick validation method - returns true if query should be blocked
   */
  shouldBlock(document, queryString, context = {}) {
    try {
      const result = this.analyzeQuery(document, queryString, context);
      return result.blocked;
    } catch (error) {
      // If analysis fails, default to blocking for security
      return true;
    }
  }

  // Core analysis methods (framework-independent)
  computeDepth(node, currentDepth = 0) {
    if (!node || !node.selectionSet) return currentDepth;
    
    let maxChildDepth = currentDepth;
    for (const selection of node.selectionSet.selections) {
      if (selection.kind === 'Field') {
        const childDepth = this.computeDepth(selection, currentDepth + 1);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      } else if (selection.kind === 'InlineFragment' || selection.kind === 'FragmentSpread') {
        const childDepth = this.computeDepth(selection, currentDepth);
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }
    }
    
    return maxChildDepth;
  }

  countSelections(node) {
    if (!node || !node.selectionSet) return 0;
    
    let count = node.selectionSet.selections.length;
    for (const selection of node.selectionSet.selections) {
      count += this.countSelections(selection);
    }
    
    return count;
  }

  countAliases(document) {
    let aliasCount = 0;
    visit(document, {
      Field(field) {
        if (field.alias) aliasCount++;
      }
    });
    return aliasCount;
  }

  containsIntrospection(document) {
    const introspectionData = {
      detected: false,
      type: null,
      fields: [],
      severity: 'none' // none, low, medium, high, critical
    };
    
    visit(document, {
      Field(field) {
        const name = field.name.value;
        
        // Critical introspection - full schema exposure
        if (name === '__schema') {
          introspectionData.detected = true;
          introspectionData.type = 'FULL_SCHEMA';
          introspectionData.severity = 'critical';
          introspectionData.fields.push({
            field: '__schema',
            risk: 'Exposes entire API structure, types, queries, mutations'
          });
        }
        
        // High-risk introspection - type system details
        if (name === '__type') {
          introspectionData.detected = true;
          if (!introspectionData.type) introspectionData.type = 'TYPE_INSPECTION';
          if (introspectionData.severity !== 'critical') {
            introspectionData.severity = 'high';
          }
          introspectionData.fields.push({
            field: '__type',
            risk: 'Reveals specific type details and field structure'
          });
        }
        
        // Medium-risk - typename detection
        if (name === '__typename') {
          introspectionData.detected = true;
          if (!introspectionData.type) introspectionData.type = 'TYPENAME_ONLY';
          if (!['critical', 'high'].includes(introspectionData.severity)) {
            introspectionData.severity = 'medium';
          }
          introspectionData.fields.push({
            field: '__typename',
            risk: 'Reveals object type information'
          });
        }
        
        // Advanced introspection patterns
        if (name.startsWith('__')) {
          // Catch other introspection fields like __InputValue, __Field, __Directive
          const advancedFields = [
            '__InputValue', '__Field', '__Directive', '__EnumValue',
            '__TypeKind', '__DirectiveLocation'
          ];
          
          if (advancedFields.includes(name)) {
            introspectionData.detected = true;
            if (!introspectionData.type) introspectionData.type = 'ADVANCED_INTROSPECTION';
            if (!['critical', 'high'].includes(introspectionData.severity)) {
              introspectionData.severity = 'high';
            }
            introspectionData.fields.push({
              field: name,
              risk: 'Advanced schema introspection - metadata exposure'
            });
          }
        }
      }
    });
    
    return introspectionData;
  }

  checkInjectionPatterns(queryString) {
    return this.patterns
      .filter(pattern => pattern.test(queryString))
      .map(pattern => pattern.toString());
  }

  calculateComplexity(metrics) {
    // Enhanced complexity calculation with new metrics
    let complexity = (metrics.depth * 2) + (metrics.selections * 0.5) + metrics.aliases;
    
    // Add field duplication penalty
    complexity += metrics.fieldDuplication * 0.3;
    
    // Add circular reference penalty
    complexity += metrics.circularRisk * 5;
    
    // Add list multiplier penalty (exponential growth)
    complexity += metrics.listMultiplier * 10;
    
    // Add argument complexity
    complexity += metrics.argumentComplexity;
    
    return complexity;
  }

  estimateExecutionTime(metrics) {
    // Estimate query execution time in milliseconds
    // Based on empirical data: depth, selections, and complexity
    let baseTime = 10; // Base query time: 10ms
    
    // Depth increases time exponentially
    baseTime += Math.pow(metrics.depth, 1.5) * 2;
    
    // Selections increase linearly
    baseTime += metrics.selections * 0.5;
    
    // List multipliers cause exponential growth
    baseTime += metrics.listMultiplier * 50;
    
    // Field duplication adds overhead
    baseTime += metrics.fieldDuplication * 2;
    
    // Circular references are extremely slow
    baseTime += metrics.circularRisk * 100;
    
    return Math.round(baseTime);
  }

  calculateRiskScore(metrics) {
    let risk = this.config.baseCost;
    
    // Depth scoring
    risk += metrics.depth * 2;
    if (metrics.depth > this.config.maxAllowedDepth) risk += 20;
    
    // Selection scoring
    risk += Math.min(metrics.selections / 5, 40);
    
    // Alias scoring
    risk += metrics.aliases;
    if (metrics.aliases > this.config.aliasThreshold) risk += 25;
    
    // Field duplication penalty
    risk += metrics.fieldDuplication * 0.5;
    if (metrics.fieldDuplication > 20) risk += 15;
    
    // Circular reference penalty
    risk += metrics.circularRisk * 10;
    
    // List multiplier penalty (exponential growth risk)
    risk += metrics.listMultiplier * 3;
    if (metrics.listMultiplier > 10) risk += 20;
    
    // Argument complexity penalty
    risk += metrics.argumentComplexity * 0.3;
    
    // Enhanced introspection scoring based on severity
    if (metrics.introspection.detected) {
      switch (metrics.introspection.severity) {
        case 'critical':
          risk += 70; // __schema queries are extremely dangerous
          break;
        case 'high':
          risk += 50; // __type and advanced introspection
          break;
        case 'medium':
          risk += 30; // __typename
          break;
        default:
          risk += this.config.introspectionCost;
      }
    }
    
    if (metrics.length > this.config.lengthThreshold) risk += 25;
    if (metrics.injections.length > 0) risk += 40;
    
    return risk;
  }

  determineAction(risk, metrics) {
    // Hard blocks
    if (metrics.depth > this.config.depthHardBlock) return 'BLOCK';
    if (risk >= this.config.riskBlockScore) return 'BLOCK';
    if (risk >= this.config.riskWarnScore) return 'WARN';
    
    return 'ALLOW';
  }

  generateWarnings(metrics) {
    const warnings = [];
    
    if (metrics.depth > this.config.maxAllowedDepth * 0.8) {
      warnings.push(`High query depth: ${metrics.depth}`);
    }
    
    if (metrics.aliases > this.config.aliasThreshold * 0.5) {
      warnings.push(`High alias usage: ${metrics.aliases}`);
    }
    
    if (metrics.fieldDuplication > 10) {
      warnings.push(`Field duplication detected: ${metrics.fieldDuplication} duplicates`);
    }
    
    if (metrics.circularRisk > 0) {
      warnings.push(`Circular reference risk: ${metrics.circularRisk} potential cycles`);
    }
    
    if (metrics.listMultiplier > 5) {
      warnings.push(`High list multiplier: ${metrics.listMultiplier}x (exponential growth)`);
    }
    
    if (metrics.argumentComplexity > 20) {
      warnings.push(`High argument complexity: ${metrics.argumentComplexity}`);
    }
    
    if (metrics.estimatedTime > 1000) {
      warnings.push(`High estimated execution time: ${metrics.estimatedTime}ms`);
    }
    
    if (metrics.introspection.detected) {
      warnings.push(
        `Introspection detected: ${metrics.introspection.type} (severity: ${metrics.introspection.severity.toUpperCase()})`
      );
      metrics.introspection.fields.forEach(field => {
        warnings.push(`  → ${field.field}: ${field.risk}`);
      });
    }
    
    if (metrics.injections.length > 0) {
      warnings.push(`Potential injection patterns: ${metrics.injections.length}`);
    }
    
    return warnings;
  }

  logAnalysis(result) {
    const { risk, action, metrics } = result;
    const emoji = action === 'BLOCK' ? '🚫' : action === 'WARN' ? '⚠️' : '🛡️';
    const message = `${emoji} GraphGuard: risk=${risk} action=${action} depth=${metrics.depth} selections=${metrics.selections} aliases=${metrics.aliases}`;
    
    if (action === 'BLOCK') {
      console.error(message, 'warnings:', result.warnings);
    } else if (action === 'WARN') {
      console.warn(message, 'warnings:', result.warnings);
    } else {
      console.log(message);
    }
  }

  // Advanced metric calculations
  countFieldDuplication(document) {
    const fieldMap = new Map();
    let duplicates = 0;
    
    visit(document, {
      Field(field) {
        const fieldName = field.name.value;
        const count = fieldMap.get(fieldName) || 0;
        if (count > 0) duplicates++;
        fieldMap.set(fieldName, count + 1);
      }
    });
    
    return duplicates;
  }

  detectCircularReferences(operation) {
    let circularCount = 0;
    const fieldPaths = [];
    
    const traverse = (node, path = []) => {
      if (!node || !node.selectionSet) return;
      
      for (const selection of node.selectionSet.selections) {
        if (selection.kind === 'Field') {
          const fieldName = selection.name.value;
          const currentPath = [...path, fieldName];
          
          // Check if this field appears earlier in the path (circular reference)
          if (path.includes(fieldName)) {
            circularCount++;
          }
          
          fieldPaths.push(currentPath.join('.'));
          traverse(selection, currentPath);
        }
      }
    };
    
    traverse(operation);
    return circularCount;
  }

  calculateListMultiplier(operation) {
    let multiplier = 1;
    
    const traverse = (node, depth = 0) => {
      if (!node || !node.selectionSet) return;
      
      for (const selection of node.selectionSet.selections) {
        if (selection.kind === 'Field') {
          const fieldName = selection.name.value;
          
          // Common list/array field names
          const listPatterns = ['list', 'all', 'many', 's$']; // ends with 's' (plural)
          const isListField = listPatterns.some(pattern => {
            if (pattern === 's$') return fieldName.endsWith('s') && fieldName.length > 2;
            return fieldName.toLowerCase().includes(pattern);
          });
          
          if (isListField) {
            multiplier *= 2; // Each list level doubles potential results
          }
          
          traverse(selection, depth + 1);
        }
      }
    };
    
    traverse(operation);
    return Math.min(multiplier, 1000); // Cap at 1000x
  }

  analyzeArguments(operation) {
    let complexityScore = 0;
    
    visit(operation, {
      Field(field) {
        if (field.arguments && field.arguments.length > 0) {
          field.arguments.forEach(arg => {
            complexityScore += 1;
            
            // Check for expensive argument patterns
            if (arg.value.kind === 'IntValue') {
              const value = parseInt(arg.value.value);
              if (value > 1000) complexityScore += 10; // Large limits
              if (value > 10000) complexityScore += 20; // Massive limits
            }
            
            // String length in arguments
            if (arg.value.kind === 'StringValue' && arg.value.value.length > 100) {
              complexityScore += 5;
            }
          });
        }
      }
    });
    
    return complexityScore;
  }
}

/**
 * Framework Adapters - These make GraphGuard work with specific implementations
 */

// Apollo Server Adapter
function createApolloPlugin(config = {}) {
  const guard = new UniversalGraphGuard(config);
  
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          const { document, request } = requestContext;
          const queryString = request.query || '';
          
          try {
            const result = guard.analyzeQuery(document, queryString, requestContext.context);
            
            // Attach to context for resolvers
            requestContext.context.graphGuard = result;
            
            // Block if necessary
            if (result.blocked) {
              throw new Error(`GraphGuard: Query blocked (risk: ${result.risk})`);
            }
          } catch (error) {
            if (error.message.includes('GraphGuard:')) {
              throw error;
            }
            // Re-throw unexpected errors
            throw new Error(`GraphGuard analysis failed: ${error.message}`);
          }
        }
      };
    }
  };
}

// Express Middleware Adapter
function createExpressMiddleware(config = {}) {
  const guard = new UniversalGraphGuard(config);
  
  return (req, res, next) => {
    try {
      const queryString = req.body?.query || req.query?.query || '';
      if (!queryString) return next();
      
      const document = parse(queryString);
      const result = guard.analyzeQuery(document, queryString, { req, res });
      
      // Attach to request for GraphQL handler
      req.graphGuard = result;
      
      if (result.blocked) {
        return res.status(400).json({
          error: 'Query blocked by GraphGuard',
          risk: result.risk,
          reason: result.warnings.join(', ')
        });
      }
      
      next();
    } catch (error) {
      console.error('GraphGuard middleware error:', error);
      return res.status(400).json({ error: 'Invalid GraphQL query' });
    }
  };
}

// GraphQL Yoga Adapter
function createYogaPlugin(config = {}) {
  const guard = new UniversalGraphGuard(config);
  
  return {
    onRequest: {
      onRequestParse() {
        return {
          onRequestParseDone(payload) {
            const { document, request } = payload;
            const queryString = request.body?.query || '';
            
            const result = guard.analyzeQuery(document, queryString);
            
            if (result.blocked) {
              throw new Error(`GraphGuard: Query blocked (risk: ${result.risk})`);
            }
            
            // Attach to context
            payload.context = payload.context || {};
            payload.context.graphGuard = result;
          }
        };
      }
    }
  };
}

// Mercurius (Fastify) Adapter
function createMercuriusPlugin(config = {}) {
  const guard = new UniversalGraphGuard(config);
  
  return {
    async preValidation(schema, document, context) {
      const queryString = context.reply.request.body?.query || '';
      const result = guard.analyzeQuery(document, queryString, context);
      
      context.graphGuard = result;
      
      if (result.blocked) {
        throw new Error(`GraphGuard: Query blocked (risk: ${result.risk})`);
      }
    }
  };
}

module.exports = {
  UniversalGraphGuard,
  createApolloPlugin,
  createExpressMiddleware,
  createYogaPlugin,
  createMercuriusPlugin,
  DEFAULT_CONFIG
};