# GraphGuard Layer

GraphGuard is an intelligent, heuristic security middleware for GraphQL operations. It sits logically *after* transport handling (Express/Apollo Server request parsing) and *before* resolver execution, evaluating every incoming operation for indicators of abuse.

## Goals
- Detect high-risk operations early (nested depth, excessive selection fan-out, alias flooding).
- Flag or reject attempts at schema reconnaissance (introspection) or crude injection payloads.
- Provide explainable, tunable scoring as a foundation for future ML/anomaly approaches.

## How It Works
1. Parses the operation AST via Apollo request lifecycle (`didResolveOperation`).
2. Computes metrics:
   - Depth (recursive selection traversal)
   - Total selection count
   - Alias count
   - Introspection presence (`__schema`, `__type`)
   - Query string length
   - Injection pattern matches (regex heuristics)
3. Assigns weighted risk contributions. Example defaults:
   - Depth: `depth * 2`
   - Selections: `min(selections / 5, 40)` (bounded scaling)
   - Aliases: `+1 each`
   - Introspection: `+50` (or tuned higher)
   - Long query (>5000 chars): `+25`
   - Injection signature: `+40`
   - Threshold exceedances (depth > maxAllowedDepth, aliases > aliasThreshold): additional penalties.
4. Compares final score against thresholds:
   - `riskWarnScore` (e.g., 30): log WARN, continue.
   - `riskBlockScore` (e.g., 60): reject request pre-execution.
   - Hard failsafe: depth > `depthHardBlock` → immediate block.
5. Attaches `graphGuard` object to context with metrics & decision for downstream logging / analytics.

## Configuration (excerpt)
```js
graphGuardPlugin({
  maxAllowedDepth: 10,
  depthHardBlock: 20,
  riskBlockScore: 60,
  riskWarnScore: 30,
  introspectionCost: 70,
  aliasThreshold: 25
});
```

## Sample Log Meanings
- `🛡️ risk=22.0 action=ALLOW ...` → Normal traffic.
- `⚠️ risk=45.0 action=WARN introspection=true` → Suspicious; monitor.
- `🚫 risk=68.5 action=BLOCK injections=["/<script/i"]` → Rejected; potential attack.

## Extensibility Ideas
- Time-based adaptation (raise penalties if similar high-risk queries repeat in a short window).
- Per-field historical cost profiling to refine weights.
- Integration with a vector store / anomaly model for outlier detection.
- Federation-aware partition scoring (risk isolated per subgraph).

## Limitations
- Heuristic approach can yield false positives/negatives; tuning required.
- Does not replace robust auth, validation, or query complexity scoring—complements them.
- Injection regex list is intentionally conservative and not exhaustive.

## Ethical Use
GraphGuard is for defensive evaluation and research. The lab requires `--lab` or `NODE_ENV=lab` flags for attack scripts to reduce misuse risk in non-lab environments.

---
*For deeper academic context see the Implementation section (GraphGuard subsection) in `RESEARCH_PAPER.md`.*
