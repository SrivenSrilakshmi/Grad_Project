// GraphGuard Core Library - Main Entry Point
// Enhanced version with better architecture and extensibility

const { GraphGuardPlugin } = require('./lib/plugin');
const { RiskCalculator } = require('./lib/risk-calculator');
const { SecurityMetrics } = require('./lib/metrics');
const { PatternDetector } = require('./lib/pattern-detector');
const { CONFIG } = require('./lib/config');

// Main plugin factory function
function graphGuardPlugin(options = {}) {
  return new GraphGuardPlugin(options);
}

// Export core components for advanced usage
module.exports = {
  graphGuardPlugin,
  GraphGuardPlugin,
  RiskCalculator,
  SecurityMetrics,
  PatternDetector,
  CONFIG
};