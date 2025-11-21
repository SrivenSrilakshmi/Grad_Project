// Configuration Management for GraphGuard
// Centralized configuration with environment variable support

const CONFIG = {
  // Query Analysis Thresholds
  maxAllowedDepth: parseInt(process.env.GRAPHGUARD_MAX_DEPTH) || 12,
  depthHardBlock: parseInt(process.env.GRAPHGUARD_DEPTH_HARD_BLOCK) || 25,
  maxSelectionsSoft: parseInt(process.env.GRAPHGUARD_MAX_SELECTIONS) || 300,
  aliasThreshold: parseInt(process.env.GRAPHGUARD_ALIAS_THRESHOLD) || 30,
  lengthThreshold: parseInt(process.env.GRAPHGUARD_LENGTH_THRESHOLD) || 5000,
  
  // Risk Scoring
  riskBlockScore: parseFloat(process.env.GRAPHGUARD_RISK_BLOCK) || 80,
  riskWarnScore: parseFloat(process.env.GRAPHGUARD_RISK_WARN) || 40,
  introspectionCost: parseFloat(process.env.GRAPHGUARD_INTROSPECTION_COST) || 50,
  baseCost: parseFloat(process.env.GRAPHGUARD_BASE_COST) || 1,
  
  // Feature Flags
  enableIntrospectionDetection: process.env.GRAPHGUARD_ENABLE_INTROSPECTION !== 'false',
  enableInjectionDetection: process.env.GRAPHGUARD_ENABLE_INJECTION !== 'false',
  enableAliasFloodDetection: process.env.GRAPHGUARD_ENABLE_ALIAS_FLOOD !== 'false',
  enableDepthAnalysis: process.env.GRAPHGUARD_ENABLE_DEPTH !== 'false',
  
  // Logging and Monitoring
  enableDetailedLogging: process.env.GRAPHGUARD_DETAILED_LOGGING === 'true',
  logLevel: process.env.GRAPHGUARD_LOG_LEVEL || 'info', // error, warn, info, debug
  enableMetrics: process.env.GRAPHGUARD_ENABLE_METRICS !== 'false',
  metricsRetentionHours: parseInt(process.env.GRAPHGUARD_METRICS_RETENTION) || 24,
  
  // Performance Settings
  enableCaching: process.env.GRAPHGUARD_ENABLE_CACHING !== 'false',
  maxCacheSize: parseInt(process.env.GRAPHGUARD_MAX_CACHE_SIZE) || 1000,
  cacheTtlSeconds: parseInt(process.env.GRAPHGUARD_CACHE_TTL) || 300,
  
  // Advanced Features
  enableMLScoring: process.env.GRAPHGUARD_ENABLE_ML === 'true',
  mlModelPath: process.env.GRAPHGUARD_ML_MODEL_PATH || null,
  enableCustomRules: process.env.GRAPHGUARD_ENABLE_CUSTOM_RULES !== 'false'
};

// Risk level classifications
const RISK_LEVELS = {
  LOW: { min: 0, max: 39, color: '🟢', action: 'ALLOW' },
  MEDIUM: { min: 40, max: 79, color: '🟡', action: 'WARN' },
  HIGH: { min: 80, max: 999, color: '🔴', action: 'BLOCK' }
};

// Security event types
const EVENT_TYPES = {
  QUERY_BLOCKED: 'query_blocked',
  QUERY_WARNED: 'query_warned',
  INTROSPECTION_ATTEMPT: 'introspection_attempt',
  INJECTION_DETECTED: 'injection_detected',
  ALIAS_FLOOD: 'alias_flood',
  DEPTH_EXCEEDED: 'depth_exceeded',
  COMPLEXITY_HIGH: 'complexity_high'
};

function validateConfig(config) {
  const errors = [];
  
  if (config.riskBlockScore <= config.riskWarnScore) {
    errors.push('riskBlockScore must be greater than riskWarnScore');
  }
  
  if (config.maxAllowedDepth >= config.depthHardBlock) {
    errors.push('depthHardBlock must be greater than maxAllowedDepth');
  }
  
  if (config.riskBlockScore < 0 || config.riskBlockScore > 1000) {
    errors.push('riskBlockScore must be between 0 and 1000');
  }
  
  return errors;
}

function getRiskLevel(score) {
  for (const [level, config] of Object.entries(RISK_LEVELS)) {
    if (score >= config.min && score <= config.max) {
      return { level, ...config };
    }
  }
  return RISK_LEVELS.HIGH; // Default to high risk for scores > 999
}

function mergeConfig(defaultConfig, userConfig = {}) {
  const merged = { ...defaultConfig, ...userConfig };
  const errors = validateConfig(merged);
  
  if (errors.length > 0) {
    throw new Error(`GraphGuard Configuration Error: ${errors.join(', ')}`);
  }
  
  return merged;
}

module.exports = {
  CONFIG,
  RISK_LEVELS,
  EVENT_TYPES,
  validateConfig,
  getRiskLevel,
  mergeConfig
};