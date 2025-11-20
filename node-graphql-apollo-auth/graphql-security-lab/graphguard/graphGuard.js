// GraphGuard Layer: Intelligent GraphQL Security Plugin
// Position: Between transport (Express/Apollo) and resolver execution.
// Purpose: Inspect incoming operations, compute heuristic risk score, optionally block.
// This is intentionally lightweight and explainable (rule-based) but structured for future ML.

const { visit } = require('graphql');

// Configuration thresholds (can be tuned or moved to env vars)
const CONFIG = {
  maxAllowedDepth: 12,          // Beyond this contributes heavy risk
  depthHardBlock: 25,           // Automatic rejection if exceeded (failsafe)
  maxSelectionsSoft: 300,       // Large selection count increases risk
  aliasThreshold: 30,           // Excessive alias usage triggers resource exhaustion suspicion
  lengthThreshold: 5000,        // Long query string threshold
  riskBlockScore: 80,           // Reject if risk >= this
  riskWarnScore: 40,            // Warn/log if risk >= this
  introspectionCost: 50,        // Base cost when __schema or __type detected
  baseCost: 1                   // Base starting score
};

// Simple patterns for injection-like payload detection (not exhaustive)
const INJECTION_PATTERNS = [
  /<script/i,
  /union\s+select/i,
  /sleep\(/i,
  /;\s*drop\s+table/i,
  /\$\{.*\}/,          // potential template injection
];

function computeDepth(node) {
  if (!node || !node.selectionSet) return 0;
  let depths = node.selectionSet.selections.map(sel => computeDepth(sel));
  return 1 + (depths.length ? Math.max(...depths) : 0);
}

function countSelections(node) {
  if (!node || !node.selectionSet) return 0;
  let count = node.selectionSet.selections.length;
  return count + node.selectionSet.selections.reduce((acc, sel) => acc + countSelections(sel), 0);
}

function countAliases(document) {
  let aliasCount = 0;
  visit(document, {
    Field(field) {
      if (field.alias) aliasCount += 1;
    }
  });
  return aliasCount;
}

function containsIntrospection(document) {
  let found = false;
  visit(document, {
    Field(field) {
      const name = field.name.value;
      if (name === '__schema' || name === '__type') {
        found = true;
      }
    }
  });
  return found;
}

function checkInjectionStrings(queryString) {
  return INJECTION_PATTERNS.some(rx => rx.test(queryString))
    ? INJECTION_PATTERNS.filter(rx => rx.test(queryString)).map(r => r.toString())
    : [];
}

function graphGuardPlugin(options = {}) {
  const cfg = { ...CONFIG, ...options };

  return {
    async requestDidStart(requestContext) {
      const { request } = requestContext;
      const queryString = request.query || '';
      const startTime = Date.now();
      let risk = cfg.baseCost;
      let metrics = {
        depth: 0,
        selections: 0,
        aliases: 0,
        introspection: false,
        injections: [],
        length: queryString.length
      };

      return {
        async didResolveOperation(context) {
          const op = context.operation;
          const doc = context.document;
          // Depth
          metrics.depth = computeDepth(op);
          // Selection count
          metrics.selections = countSelections(op);
          // Alias count
          metrics.aliases = countAliases(doc);
          // Introspection detection
          metrics.introspection = containsIntrospection(doc);
          // Injection heuristic
          metrics.injections = checkInjectionStrings(queryString);

          // Scoring logic
          risk += metrics.depth * 2; // depth cost
          risk += Math.min(metrics.selections / 5, 40); // scale selection cost
          risk += metrics.aliases; // each alias adds cost
          if (metrics.introspection) risk += cfg.introspectionCost;
          if (metrics.length > cfg.lengthThreshold) risk += 25;
          if (metrics.injections.length) risk += 40; // heavy penalty for suspected injection patterns
          if (metrics.depth > cfg.maxAllowedDepth) risk += 20;
          if (metrics.aliases > cfg.aliasThreshold) risk += 25;

          // Hard block on extreme depth
          if (metrics.depth > cfg.depthHardBlock) {
            throw new Error(`GraphGuard: Operation depth ${metrics.depth} exceeds hard limit ${cfg.depthHardBlock}`);
          }

          // Decide action
          const action = risk >= cfg.riskBlockScore ? 'BLOCK' : risk >= cfg.riskWarnScore ? 'WARN' : 'ALLOW';

          // Attach to context for resolvers if needed
          context.context.graphGuard = { risk, metrics, action, timestamp: new Date().toISOString() };

          // Logging (can be replaced with structured logger)
          const baseLog = `GraphGuard risk=${risk.toFixed(1)} action=${action} depth=${metrics.depth} selections=${metrics.selections} aliases=${metrics.aliases}`;
          if (action === 'BLOCK') {
            console.warn('🚫', baseLog, 'injections=', metrics.injections);
            throw new Error(`GraphGuard: Query rejected (risk score ${risk.toFixed(1)})`);
          } else if (action === 'WARN') {
            console.warn('⚠️', baseLog, 'introspection=', metrics.introspection, 'injections=', metrics.injections);
          } else {
            console.log('🛡️', baseLog);
          }
        },
        async willSendResponse(ctx) {
          const duration = Date.now() - startTime;
          if (ctx.context.graphGuard) {
            ctx.context.graphGuard.durationMs = duration;
          }
        }
      };
    }
  };
}

module.exports = { graphGuardPlugin, CONFIG };