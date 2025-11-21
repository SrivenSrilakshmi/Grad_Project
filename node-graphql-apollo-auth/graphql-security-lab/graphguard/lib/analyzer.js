// Enhanced GraphQL Query Analyzer
// Advanced parsing and analysis of GraphQL operations

const { visit } = require('graphql');

class QueryAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.enableCaching = config.enableCaching !== false;
    this.cache = new Map();
    this.maxCacheSize = config.maxCacheSize || 1000;
    this.cacheTtl = config.cacheTtlSeconds * 1000 || 300000; // 5 minutes default
  }

  /**
   * Analyze a GraphQL document and return comprehensive metrics
   */
  analyze(document, queryString = '') {
    // Check cache first
    const cacheKey = this.generateCacheKey(queryString);
    if (this.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTtl) {
        return cached.metrics;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    const startTime = Date.now();
    const metrics = this.performAnalysis(document, queryString);
    metrics.analysisTimeMs = Date.now() - startTime;

    // Cache the results
    if (this.enableCaching) {
      this.cacheResult(cacheKey, metrics);
    }

    return metrics;
  }

  /**
   * Perform comprehensive analysis of the GraphQL document
   */
  performAnalysis(document, queryString) {
    const metrics = {
      // Basic metrics
      depth: 0,
      selections: 0,
      aliases: 0,
      introspection: false,
      injections: [],
      length: queryString.length,
      
      // Advanced metrics
      fragments: 0,
      inlineFragments: 0,
      variables: 0,
      directives: 0,
      arguments: 0,
      operations: 0,
      
      // Pattern analysis
      patterns: {
        recursiveFields: 0,
        duplicateFields: 0,
        unusualNaming: false,
        suspiciousStrings: []
      },
      
      // Performance indicators
      estimatedComplexity: 0,
      resourceIntensive: false,
      
      // Security indicators
      securityFlags: {
        hasIntrospection: false,
        hasInjectionPatterns: false,
        hasExcessiveAliases: false,
        hasDeepNesting: false,
        hasSuspiciousPatterns: false
      }
    };

    // Analyze each operation in the document
    document.definitions.forEach(definition => {
      if (definition.kind === 'OperationDefinition') {
        metrics.operations++;
        this.analyzeOperation(definition, metrics);
      } else if (definition.kind === 'FragmentDefinition') {
        metrics.fragments++;
        this.analyzeFragment(definition, metrics);
      }
    });

    // Additional string-based analysis
    this.analyzeQueryString(queryString, metrics);
    
    // Calculate derived metrics
    this.calculateDerivedMetrics(metrics);

    return metrics;
  }

  /**
   * Analyze a single GraphQL operation
   */
  analyzeOperation(operation, metrics) {
    // Count variables
    if (operation.variableDefinitions) {
      metrics.variables += operation.variableDefinitions.length;
    }

    // Count directives
    if (operation.directives) {
      metrics.directives += operation.directives.length;
    }

    // Analyze selection set
    if (operation.selectionSet) {
      const depth = this.calculateDepth(operation.selectionSet);
      metrics.depth = Math.max(metrics.depth, depth);
      
      this.analyzeSelectionSet(operation.selectionSet, metrics, 1);
    }
  }

  /**
   * Analyze a fragment definition
   */
  analyzeFragment(fragment, metrics) {
    if (fragment.selectionSet) {
      this.analyzeSelectionSet(fragment.selectionSet, metrics, 1);
    }
  }

  /**
   * Recursively analyze selection sets
   */
  analyzeSelectionSet(selectionSet, metrics, currentDepth = 1) {
    const fieldNames = new Set();
    
    selectionSet.selections.forEach(selection => {
      metrics.selections++;
      
      switch (selection.kind) {
        case 'Field':
          this.analyzeField(selection, metrics, currentDepth, fieldNames);
          break;
        case 'InlineFragment':
          metrics.inlineFragments++;
          if (selection.selectionSet) {
            this.analyzeSelectionSet(selection.selectionSet, metrics, currentDepth + 1);
          }
          break;
        case 'FragmentSpread':
          // Fragment spread analysis would require fragment definition lookup
          break;
      }
    });

    // Check for duplicate fields at the same level
    if (fieldNames.size < selectionSet.selections.length) {
      metrics.patterns.duplicateFields++;
    }
  }

  /**
   * Analyze individual fields
   */
  analyzeField(field, metrics, currentDepth, fieldNames) {
    const fieldName = field.name.value;
    
    // Track field names for duplicate detection
    if (fieldNames.has(fieldName)) {
      metrics.patterns.duplicateFields++;
    }
    fieldNames.add(fieldName);

    // Check for aliases
    if (field.alias) {
      metrics.aliases++;
    }

    // Check for introspection
    if (fieldName === '__schema' || fieldName === '__type' || fieldName.startsWith('__')) {
      metrics.introspection = true;
      metrics.securityFlags.hasIntrospection = true;
    }

    // Count arguments
    if (field.arguments) {
      metrics.arguments += field.arguments.length;
      this.analyzeArguments(field.arguments, metrics);
    }

    // Count directives
    if (field.directives) {
      metrics.directives += field.directives.length;
    }

    // Check for recursive field patterns
    if (this.isRecursiveField(field, fieldName)) {
      metrics.patterns.recursiveFields++;
    }

    // Analyze nested selections
    if (field.selectionSet) {
      this.analyzeSelectionSet(field.selectionSet, metrics, currentDepth + 1);
    }
  }

  /**
   * Analyze field arguments for security issues
   */
  analyzeArguments(args, metrics) {
    args.forEach(arg => {
      if (arg.value && arg.value.kind === 'StringValue') {
        const value = arg.value.value;
        
        // Check for injection patterns
        const injectionPatterns = this.detectInjectionPatterns(value);
        if (injectionPatterns.length > 0) {
          metrics.injections.push(...injectionPatterns);
          metrics.securityFlags.hasInjectionPatterns = true;
        }

        // Check for suspicious strings
        if (this.isSuspiciousString(value)) {
          metrics.patterns.suspiciousStrings.push(value.substring(0, 50)); // Truncate for security
        }
      }
    });
  }

  /**
   * Calculate query depth using recursive traversal
   */
  calculateDepth(selectionSet, currentDepth = 1) {
    let maxDepth = currentDepth;
    
    if (selectionSet && selectionSet.selections) {
      selectionSet.selections.forEach(selection => {
        if (selection.selectionSet) {
          const depth = this.calculateDepth(selection.selectionSet, currentDepth + 1);
          maxDepth = Math.max(maxDepth, depth);
        }
      });
    }
    
    return maxDepth;
  }

  /**
   * Analyze query string for additional patterns
   */
  analyzeQueryString(queryString, metrics) {
    // Detect injection patterns
    metrics.injections = this.detectInjectionPatterns(queryString);
    
    // Unusual naming patterns
    metrics.patterns.unusualNaming = this.hasUnusualNaming(queryString);
    
    // Calculate estimated complexity based on string analysis
    metrics.estimatedComplexity = this.estimateComplexity(queryString, metrics);
  }

  /**
   * Calculate derived metrics and set flags
   */
  calculateDerivedMetrics(metrics) {
    // Set security flags
    metrics.securityFlags.hasExcessiveAliases = metrics.aliases > (this.config.aliasThreshold || 30);
    metrics.securityFlags.hasDeepNesting = metrics.depth > (this.config.maxAllowedDepth || 12);
    metrics.securityFlags.hasSuspiciousPatterns = 
      metrics.patterns.recursiveFields > 5 || 
      metrics.patterns.duplicateFields > 10 ||
      metrics.patterns.suspiciousStrings.length > 0;

    // Determine if query is resource intensive
    metrics.resourceIntensive = 
      metrics.selections > 100 ||
      metrics.depth > 8 ||
      metrics.aliases > 20 ||
      metrics.estimatedComplexity > 200;
  }

  /**
   * Detect potential injection patterns
   */
  detectInjectionPatterns(text) {
    const patterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /union\s+select/i,
      /sleep\s*\(/i,
      /;\s*drop\s+table/i,
      /\$\{.*\}/g,
      /javascript:/i,
      /vbscript:/i,
      /onload\s*=/i,
      /onerror\s*=/i
    ];

    const detected = [];
    patterns.forEach(pattern => {
      if (pattern.test(text)) {
        detected.push(pattern.toString());
      }
    });

    return detected;
  }

  /**
   * Check if field appears to be recursive
   */
  isRecursiveField(field, fieldName) {
    if (!field.selectionSet) return false;
    
    // Simple check: if a field name appears in its own selection set
    return field.selectionSet.selections.some(selection => 
      selection.kind === 'Field' && selection.name.value === fieldName
    );
  }

  /**
   * Check for suspicious string patterns
   */
  isSuspiciousString(str) {
    const suspiciousPatterns = [
      /admin/i,
      /password/i,
      /secret/i,
      /token/i,
      /auth/i,
      /\.\.\/\.\.\//i, // Path traversal
      /\0/,     // Null bytes
      /%00/,    // URL encoded null
      /\x00/    // Hex null
    ];

    return suspiciousPatterns.some(pattern => pattern.test(str));
  }

  /**
   * Check for unusual naming patterns
   */
  hasUnusualNaming(queryString) {
    // Check for excessive underscores, numbers, or unusual characters
    const unusualPatterns = [
      /_{3,}/,           // Multiple underscores
      /[0-9]{5,}/,       // Long number sequences
      /[!@#$%^&*]{2,}/,  // Special character sequences
      /[A-Z]{10,}/       // Long uppercase sequences
    ];

    return unusualPatterns.some(pattern => pattern.test(queryString));
  }

  /**
   * Estimate query complexity
   */
  estimateComplexity(queryString, metrics) {
    let complexity = 0;
    
    // Base complexity from structure
    complexity += metrics.depth * 3;
    complexity += metrics.selections * 1;
    complexity += metrics.aliases * 2;
    complexity += metrics.fragments * 5;
    complexity += metrics.variables * 1;
    
    // Additional complexity factors
    if (metrics.introspection) complexity += 50;
    if (metrics.patterns.recursiveFields > 0) complexity += metrics.patterns.recursiveFields * 10;
    if (queryString.length > 1000) complexity += Math.floor(queryString.length / 100);
    
    return complexity;
  }

  /**
   * Cache management
   */
  generateCacheKey(queryString) {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < queryString.length; i++) {
      const char = queryString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  cacheResult(key, metrics) {
    // Implement LRU cache eviction if needed
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      metrics,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the analysis cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

module.exports = { QueryAnalyzer };