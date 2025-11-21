// Enhanced GraphGuard Plugin - Main Entry Point
// Upgraded with modular architecture and advanced features

const { QueryAnalyzer } = require('./lib/analyzer');
const { RiskCalculator } = require('./lib/risk-calculator');
const { SecurityMetrics } = require('./lib/metrics');
const { CONFIG, EVENT_TYPES, mergeConfig } = require('./lib/config');

class GraphGuard {
  constructor(options = {}) {
    this.config = mergeConfig(CONFIG, options);
    this.analyzer = new QueryAnalyzer(this.config);
    this.riskCalculator = new RiskCalculator(this.config);
    this.metrics = new SecurityMetrics(this.config);
    
    // Hook functions
    this.onRiskEvent = options.onRiskEvent || null;
    this.onQueryBlocked = options.onQueryBlocked || null;
    this.onQueryWarned = options.onQueryWarned || null;
    
    // Performance tracking
    this.performanceMetrics = {
      totalQueries: 0,
      totalAnalysisTime: 0,
      averageAnalysisTime: 0
    };
  }

  /**
   * Create Apollo Server plugin
   */
  createPlugin() {
    return {
      async requestDidStart(requestContext) {
        const { request } = requestContext;
        const queryString = request.query || '';
        const startTime = Date.now();
        
        let analysisMetrics = null;
        let riskAssessment = null;

        return {
          async didResolveOperation(context) {
            try {
              // Analyze the GraphQL operation
              const analysisStartTime = Date.now();
              analysisMetrics = this.analyzer.analyze(context.document, queryString);
              const analysisTime = Date.now() - analysisStartTime;

              // Calculate risk
              const contextData = this.extractContext(context, request);
              riskAssessment = this.riskCalculator.calculateRisk(analysisMetrics, contextData);

              // Update performance metrics
              this.updatePerformanceMetrics(analysisTime);

              // Record metrics
              this.metrics.recordQueryMetrics(analysisMetrics, riskAssessment, {
                ...contextData,
                analysisTimeMs: analysisTime
              });

              // Make security decision
              await this.makeSecurityDecision(riskAssessment, analysisMetrics, context, queryString);

              // Attach GraphGuard data to context for resolvers
              context.context.graphGuard = {
                risk: riskAssessment,
                metrics: analysisMetrics,
                timestamp: new Date().toISOString(),
                version: this.getVersion()
              };

            } catch (error) {
              console.error('GraphGuard analysis error:', error);
              // Continue execution on analysis errors to avoid breaking the API
              // unless it's a security-related block
              if (error.message.includes('GraphGuard: Query rejected')) {
                throw error;
              }
            }
          },

          async willSendResponse(ctx) {
            const duration = Date.now() - startTime;
            
            if (ctx.context.graphGuard) {
              ctx.context.graphGuard.durationMs = duration;
              
              // Record execution metrics
              if (analysisMetrics && riskAssessment) {
                this.metrics.recordQueryMetrics(analysisMetrics, riskAssessment, {
                  executionTimeMs: duration
                });
              }
            }
          }
        };
      }
    };
  }

  /**
   * Make security decision based on risk assessment
   */
  async makeSecurityDecision(riskAssessment, metrics, context, queryString) {
    const { totalRisk, level, action } = riskAssessment;

    // Hard blocks for extreme cases
    if (metrics.depth > this.config.depthHardBlock) {
      const error = new Error(`GraphGuard: Operation depth ${metrics.depth} exceeds hard limit ${this.config.depthHardBlock}`);
      this.handleSecurityEvent(EVENT_TYPES.DEPTH_EXCEEDED, { depth: metrics.depth, limit: this.config.depthHardBlock }, error);
      throw error;
    }

    // Risk-based decisions
    switch (action) {
      case 'BLOCK':
        const blockError = new Error(`GraphGuard: Query rejected (risk score ${totalRisk.toFixed(1)})`);
        this.handleSecurityEvent(EVENT_TYPES.QUERY_BLOCKED, { risk: riskAssessment, metrics }, blockError);
        if (this.onQueryBlocked) {
          await this.onQueryBlocked(riskAssessment, metrics, context);
        }
        throw blockError;

      case 'WARN':
        this.handleSecurityEvent(EVENT_TYPES.QUERY_WARNED, { risk: riskAssessment, metrics });
        if (this.onQueryWarned) {
          await this.onQueryWarned(riskAssessment, metrics, context);
        }
        this.logWarning(riskAssessment, metrics);
        break;

      case 'ALLOW':
      default:
        this.logInfo(riskAssessment, metrics);
        break;
    }

    // Additional specific threat detection
    await this.detectSpecificThreats(metrics, context, queryString);
  }

  /**
   * Detect specific security threats
   */
  async detectSpecificThreats(metrics, context, queryString) {
    // Introspection detection
    if (metrics.introspection && this.config.enableIntrospectionDetection) {
      this.handleSecurityEvent(EVENT_TYPES.INTROSPECTION_ATTEMPT, { metrics });
    }

    // Injection pattern detection
    if (metrics.injections.length > 0 && this.config.enableInjectionDetection) {
      this.handleSecurityEvent(EVENT_TYPES.INJECTION_DETECTED, { 
        patterns: metrics.injections,
        query: queryString.substring(0, 200) // Truncated for security
      });
    }

    // Alias flood detection
    if (metrics.aliases > this.config.aliasThreshold && this.config.enableAliasFloodDetection) {
      this.handleSecurityEvent(EVENT_TYPES.ALIAS_FLOOD, { 
        aliasCount: metrics.aliases,
        threshold: this.config.aliasThreshold
      });
    }
  }

  /**
   * Handle security events
   */
  handleSecurityEvent(eventType, data, error = null) {
    const event = this.metrics.recordEvent(eventType, data);
    
    if (this.onRiskEvent) {
      this.onRiskEvent(event);
    }

    if (error) {
      console.error(`🚫 GraphGuard Security Event: ${eventType}`, data);
    }
  }

  /**
   * Extract context information
   */
  extractContext(context, request) {
    return {
      userAgent: request.http?.headers['user-agent'],
      ip: request.http?.headers['x-forwarded-for'] || request.ip,
      userId: context.context.user?.id,
      userRole: context.context.user?.role,
      source: this.detectQuerySource(request),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Detect query source (playground, client app, etc.)
   */
  detectQuerySource(request) {
    const userAgent = request.http?.headers['user-agent'] || '';
    const referer = request.http?.headers['referer'] || '';
    
    if (userAgent.includes('GraphQL Playground')) return 'playground';
    if (userAgent.includes('Insomnia')) return 'insomnia';
    if (userAgent.includes('Postman')) return 'postman';
    if (referer.includes('graphql')) return 'browser';
    if (userAgent.includes('curl')) return 'curl';
    
    return 'unknown';
  }

  /**
   * Update performance tracking
   */
  updatePerformanceMetrics(analysisTime) {
    this.performanceMetrics.totalQueries++;
    this.performanceMetrics.totalAnalysisTime += analysisTime;
    this.performanceMetrics.averageAnalysisTime = 
      this.performanceMetrics.totalAnalysisTime / this.performanceMetrics.totalQueries;
  }

  /**
   * Logging methods
   */
  logInfo(riskAssessment, metrics) {
    if (this.config.logLevel === 'debug' || this.config.enableDetailedLogging) {
      console.log(`🛡️ GraphGuard: risk=${riskAssessment.totalRisk.toFixed(1)} depth=${metrics.depth} selections=${metrics.selections} aliases=${metrics.aliases}`);
    }
  }

  logWarning(riskAssessment, metrics) {
    console.warn(`⚠️ GraphGuard WARNING: risk=${riskAssessment.totalRisk.toFixed(1)} action=${riskAssessment.action} depth=${metrics.depth} selections=${metrics.selections} aliases=${metrics.aliases}`);
    if (metrics.introspection) console.warn('   - Introspection detected');
    if (metrics.injections.length > 0) console.warn(`   - Injection patterns: ${metrics.injections.length}`);
  }

  /**
   * Get security analytics
   */
  getAnalytics(timeRange = '1h') {
    return this.metrics.getAnalytics(timeRange);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheStats: this.analyzer.getCacheStats()
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig) {
    this.config = mergeConfig(this.config, newConfig);
    console.log('🛡️ GraphGuard configuration updated');
  }

  /**
   * Get current version
   */
  getVersion() {
    return '2.0.0';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.metrics.destroy();
    this.analyzer.clearCache();
  }
}

/**
 * Factory function to create GraphGuard plugin
 */
function graphGuardPlugin(options = {}) {
  const graphGuard = new GraphGuard(options);
  return graphGuard.createPlugin();
}

/**
 * Create GraphGuard instance for advanced usage
 */
function createGraphGuard(options = {}) {
  return new GraphGuard(options);
}

module.exports = {
  graphGuardPlugin,
  createGraphGuard,
  GraphGuard,
  CONFIG,
  EVENT_TYPES
};