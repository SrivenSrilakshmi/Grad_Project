// Enhanced Risk Calculator with Multiple Algorithms
// Supports different risk calculation strategies and custom scoring

const { RISK_LEVELS, getRiskLevel } = require('./config');

class RiskCalculator {
  constructor(config = {}) {
    this.config = config;
    this.customRiskCalculator = config.customRiskCalculator;
    this.enableMLScoring = config.enableMLScoring || false;
    this.mlModel = config.mlModel || null;
  }

  /**
   * Main risk calculation method
   * @param {Object} metrics - Query metrics from analysis
   * @param {Object} context - Additional context (user, headers, etc.)
   * @returns {Object} Risk assessment with score and breakdown
   */
  calculateRisk(metrics, context = {}) {
    let riskAssessment;

    if (this.customRiskCalculator) {
      riskAssessment = this.customRiskCalculator(metrics, this.config, context);
    } else if (this.enableMLScoring && this.mlModel) {
      riskAssessment = this.calculateMLRisk(metrics, context);
    } else {
      riskAssessment = this.calculateHeuristicRisk(metrics, context);
    }

    // Ensure we have a valid risk assessment structure
    if (typeof riskAssessment === 'number') {
      riskAssessment = { totalRisk: riskAssessment, breakdown: {} };
    }

    // Add risk level classification
    const riskLevel = getRiskLevel(riskAssessment.totalRisk);
    riskAssessment.level = riskLevel.level;
    riskAssessment.action = riskLevel.action;
    riskAssessment.color = riskLevel.color;

    return riskAssessment;
  }

  /**
   * Heuristic-based risk calculation (default algorithm)
   */
  calculateHeuristicRisk(metrics, context = {}) {
    const breakdown = {
      base: this.config.baseCost || 1,
      depth: 0,
      selections: 0,
      aliases: 0,
      introspection: 0,
      injections: 0,
      length: 0,
      complexity: 0,
      patterns: 0
    };

    // Depth scoring with exponential growth for extreme depths
    if (metrics.depth > 0) {
      breakdown.depth = metrics.depth <= this.config.maxAllowedDepth 
        ? metrics.depth * 2 
        : (metrics.depth * 3) + 20; // Penalty for exceeding safe depth
    }

    // Selection complexity with diminishing returns
    if (metrics.selections > 0) {
      breakdown.selections = Math.min(metrics.selections / 5, 40);
      if (metrics.selections > this.config.maxSelectionsSoft) {
        breakdown.selections += 15; // Additional penalty for very large selection sets
      }
    }

    // Alias scoring with flood detection
    if (metrics.aliases > 0) {
      breakdown.aliases = metrics.aliases;
      if (metrics.aliases > this.config.aliasThreshold) {
        breakdown.aliases += 25; // Alias flood penalty
      }
    }

    // Introspection penalty
    if (metrics.introspection && this.config.enableIntrospectionDetection) {
      breakdown.introspection = this.config.introspectionCost || 50;
    }

    // Query length penalty
    if (metrics.length > this.config.lengthThreshold) {
      breakdown.length = 25;
    }

    // Injection pattern penalty
    if (metrics.injections && metrics.injections.length > 0) {
      breakdown.injections = metrics.injections.length * 40;
    }

    // Additional complexity factors
    if (metrics.fragments > 10) {
      breakdown.complexity += 10;
    }

    if (metrics.variables > 20) {
      breakdown.complexity += 5;
    }

    // Suspicious pattern detection
    breakdown.patterns = this.calculatePatternRisk(metrics, context);

    const totalRisk = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

    return {
      totalRisk,
      breakdown,
      algorithm: 'heuristic'
    };
  }

  /**
   * Machine Learning based risk calculation (future enhancement)
   */
  calculateMLRisk(metrics, context = {}) {
    if (!this.mlModel) {
      console.warn('GraphGuard: ML scoring enabled but no model provided, falling back to heuristic');
      return this.calculateHeuristicRisk(metrics, context);
    }

    try {
      // Feature vector for ML model
      const features = [
        metrics.depth,
        metrics.selections,
        metrics.aliases,
        metrics.introspection ? 1 : 0,
        metrics.injections.length,
        metrics.length,
        context.userRole === 'admin' ? 1 : 0,
        context.source === 'playground' ? 1 : 0
      ];

      const mlScore = this.mlModel.predict(features);
      const heuristicRisk = this.calculateHeuristicRisk(metrics, context);

      // Combine ML score with heuristic as fallback
      const combinedRisk = (mlScore * 0.7) + (heuristicRisk.totalRisk * 0.3);

      return {
        totalRisk: combinedRisk,
        breakdown: {
          ml: mlScore,
          heuristic: heuristicRisk.totalRisk,
          combined: combinedRisk
        },
        algorithm: 'ml-hybrid'
      };
    } catch (error) {
      console.error('GraphGuard ML scoring error:', error);
      return this.calculateHeuristicRisk(metrics, context);
    }
  }

  /**
   * Pattern-based risk calculation for advanced threats
   */
  calculatePatternRisk(metrics, context = {}) {
    let patternRisk = 0;

    // Time-based analysis (rapid successive queries)
    if (context.recentQueryCount > 10) {
      patternRisk += 15;
    }

    // User behavior analysis
    if (context.user && context.user.isNew && metrics.complexity > 50) {
      patternRisk += 10; // New users with complex queries
    }

    // Geographic/source analysis
    if (context.source === 'unknown' || context.userAgent === 'automated') {
      patternRisk += 20;
    }

    // Query structure patterns
    if (metrics.depth > 8 && metrics.aliases > 20) {
      patternRisk += 25; // Combined deep + alias attack
    }

    return patternRisk;
  }

  /**
   * Calculate risk trend over time
   */
  calculateRiskTrend(currentRisk, historicalRisks = []) {
    if (historicalRisks.length < 2) {
      return { trend: 'insufficient_data', slope: 0 };
    }

    const recentRisks = historicalRisks.slice(-10); // Last 10 queries
    const avgRisk = recentRisks.reduce((sum, r) => sum + r, 0) / recentRisks.length;
    
    const trend = currentRisk > avgRisk * 1.5 ? 'increasing' : 
                  currentRisk < avgRisk * 0.5 ? 'decreasing' : 'stable';

    return {
      trend,
      currentRisk,
      averageRisk: avgRisk,
      slope: (currentRisk - avgRisk) / avgRisk
    };
  }
}

module.exports = { RiskCalculator };