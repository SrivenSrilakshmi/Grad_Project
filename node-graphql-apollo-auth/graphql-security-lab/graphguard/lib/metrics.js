// Security Metrics Collection and Analysis
// Tracks security events and provides analytics capabilities

const { EVENT_TYPES } = require('./config');

class SecurityMetrics {
  constructor(config = {}) {
    this.config = config;
    this.enabled = config.enableMetrics !== false;
    this.retentionHours = config.metricsRetentionHours || 24;
    
    // In-memory storage (replace with Redis/Database in production)
    this.events = [];
    this.queryMetrics = [];
    this.riskHistory = [];
    this.blockedQueries = [];
    
    // Performance counters
    this.counters = {
      totalQueries: 0,
      blockedQueries: 0,
      warnedQueries: 0,
      allowedQueries: 0,
      introspectionAttempts: 0,
      injectionAttempts: 0,
      aliasFloods: 0
    };

    // Start cleanup interval
    if (this.enabled) {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
    }
  }

  /**
   * Record a security event
   */
  recordEvent(eventType, data = {}) {
    if (!this.enabled) return;

    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
      severity: this.getEventSeverity(eventType)
    };

    this.events.push(event);
    this.updateCounters(eventType, data);
    
    // Trigger alerts for high-severity events
    if (event.severity === 'high') {
      this.triggerAlert(event);
    }

    return event;
  }

  /**
   * Record query metrics for analysis
   */
  recordQueryMetrics(metrics, riskAssessment, context = {}) {
    if (!this.enabled) return;

    const queryRecord = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      metrics,
      risk: riskAssessment,
      context: {
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        userRole: context.userRole
      },
      performance: {
        analysisTimeMs: context.analysisTimeMs,
        executionTimeMs: context.executionTimeMs
      }
    };

    this.queryMetrics.push(queryRecord);
    this.riskHistory.push({
      timestamp: queryRecord.timestamp,
      risk: riskAssessment.totalRisk,
      level: riskAssessment.level
    });

    this.counters.totalQueries++;

    return queryRecord;
  }

  /**
   * Get security analytics and insights
   */
  getAnalytics(timeRange = '1h') {
    if (!this.enabled) return { enabled: false };

    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const recentEvents = this.events.filter(e => new Date(e.timestamp) > cutoffTime);
    const recentQueries = this.queryMetrics.filter(q => new Date(q.timestamp) > cutoffTime);

    return {
      enabled: true,
      timeRange,
      totalEvents: recentEvents.length,
      totalQueries: recentQueries.length,
      
      // Risk distribution
      riskDistribution: this.calculateRiskDistribution(recentQueries),
      
      // Top threats
      topThreats: this.getTopThreats(recentEvents),
      
      // Performance metrics
      performance: this.calculatePerformanceMetrics(recentQueries),
      
      // Security trends
      trends: this.calculateTrends(recentQueries),
      
      // Current counters
      counters: { ...this.counters },
      
      // Alerts and recommendations
      alerts: this.generateAlerts(recentEvents, recentQueries)
    };
  }

  /**
   * Calculate risk distribution across queries
   */
  calculateRiskDistribution(queries) {
    const distribution = { low: 0, medium: 0, high: 0 };
    
    queries.forEach(query => {
      const level = query.risk.level.toLowerCase();
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });

    const total = queries.length;
    return {
      counts: distribution,
      percentages: {
        low: total > 0 ? Math.round((distribution.low / total) * 100) : 0,
        medium: total > 0 ? Math.round((distribution.medium / total) * 100) : 0,
        high: total > 0 ? Math.round((distribution.high / total) * 100) : 0
      }
    };
  }

  /**
   * Identify top security threats
   */
  getTopThreats(events) {
    const threatCounts = {};
    
    events.forEach(event => {
      threatCounts[event.type] = (threatCounts[event.type] || 0) + 1;
    });

    return Object.entries(threatCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(queries) {
    if (queries.length === 0) {
      return { averageAnalysisTime: 0, averageExecutionTime: 0 };
    }

    const analysisTimes = queries
      .map(q => q.performance?.analysisTimeMs || 0)
      .filter(t => t > 0);
    
    const executionTimes = queries
      .map(q => q.performance?.executionTimeMs || 0)
      .filter(t => t > 0);

    return {
      averageAnalysisTime: analysisTimes.length > 0 
        ? Math.round(analysisTimes.reduce((sum, t) => sum + t, 0) / analysisTimes.length)
        : 0,
      averageExecutionTime: executionTimes.length > 0
        ? Math.round(executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length)
        : 0,
      queryCount: queries.length
    };
  }

  /**
   * Calculate security trends
   */
  calculateTrends(queries) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentQueries = queries.filter(q => new Date(q.timestamp) > oneHourAgo);
    const olderQueries = queries.filter(q => new Date(q.timestamp) <= oneHourAgo);

    const recentAvgRisk = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.risk.totalRisk, 0) / recentQueries.length
      : 0;
    
    const olderAvgRisk = olderQueries.length > 0
      ? olderQueries.reduce((sum, q) => sum + q.risk.totalRisk, 0) / olderQueries.length
      : 0;

    return {
      riskTrend: recentAvgRisk > olderAvgRisk ? 'increasing' : 'decreasing',
      recentAverageRisk: Math.round(recentAvgRisk * 100) / 100,
      previousAverageRisk: Math.round(olderAvgRisk * 100) / 100,
      queryVolumeTrend: recentQueries.length > olderQueries.length ? 'increasing' : 'decreasing'
    };
  }

  /**
   * Generate security alerts and recommendations
   */
  generateAlerts(events, queries) {
    const alerts = [];

    // High-risk query volume alert
    const highRiskQueries = queries.filter(q => q.risk.level === 'HIGH');
    if (highRiskQueries.length > 5) {
      alerts.push({
        level: 'warning',
        type: 'high_risk_volume',
        message: `${highRiskQueries.length} high-risk queries detected in recent period`,
        recommendation: 'Review query patterns and consider tightening security thresholds'
      });
    }

    // Repeated introspection attempts
    const introspectionEvents = events.filter(e => e.type === EVENT_TYPES.INTROSPECTION_ATTEMPT);
    if (introspectionEvents.length > 3) {
      alerts.push({
        level: 'critical',
        type: 'introspection_flood',
        message: `${introspectionEvents.length} introspection attempts detected`,
        recommendation: 'Possible reconnaissance attack - consider blocking source IP'
      });
    }

    // Performance degradation
    const avgExecutionTime = this.calculatePerformanceMetrics(queries).averageExecutionTime;
    if (avgExecutionTime > 1000) {
      alerts.push({
        level: 'warning',
        type: 'performance_degradation',
        message: `Average query execution time is ${avgExecutionTime}ms`,
        recommendation: 'Monitor for resource exhaustion attacks'
      });
    }

    return alerts;
  }

  /**
   * Utility methods
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getEventSeverity(eventType) {
    const severityMap = {
      [EVENT_TYPES.QUERY_BLOCKED]: 'high',
      [EVENT_TYPES.INJECTION_DETECTED]: 'critical',
      [EVENT_TYPES.INTROSPECTION_ATTEMPT]: 'medium',
      [EVENT_TYPES.ALIAS_FLOOD]: 'high',
      [EVENT_TYPES.DEPTH_EXCEEDED]: 'medium',
      [EVENT_TYPES.QUERY_WARNED]: 'low'
    };
    return severityMap[eventType] || 'low';
  }

  updateCounters(eventType, data) {
    switch (eventType) {
      case EVENT_TYPES.QUERY_BLOCKED:
        this.counters.blockedQueries++;
        break;
      case EVENT_TYPES.QUERY_WARNED:
        this.counters.warnedQueries++;
        break;
      case EVENT_TYPES.INTROSPECTION_ATTEMPT:
        this.counters.introspectionAttempts++;
        break;
      case EVENT_TYPES.INJECTION_DETECTED:
        this.counters.injectionAttempts++;
        break;
      case EVENT_TYPES.ALIAS_FLOOD:
        this.counters.aliasFloods++;
        break;
    }
  }

  getTimeRangeCutoff(timeRange) {
    const now = new Date();
    const ranges = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const ms = ranges[timeRange] || ranges['1h'];
    return new Date(now.getTime() - ms);
  }

  triggerAlert(event) {
    // Implement alert mechanism (email, Slack, webhook, etc.)
    console.warn(`🚨 GraphGuard Alert [${event.severity.toUpperCase()}]: ${event.type}`, event.data);
  }

  cleanup() {
    const cutoffTime = new Date(Date.now() - (this.retentionHours * 60 * 60 * 1000));
    
    this.events = this.events.filter(e => new Date(e.timestamp) > cutoffTime);
    this.queryMetrics = this.queryMetrics.filter(q => new Date(q.timestamp) > cutoffTime);
    this.riskHistory = this.riskHistory.filter(r => new Date(r.timestamp) > cutoffTime);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = { SecurityMetrics };