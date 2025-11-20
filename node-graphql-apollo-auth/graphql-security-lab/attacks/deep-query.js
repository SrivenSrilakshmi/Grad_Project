#!/usr/bin/env node
// Lab-only deep query simulator. Targets localhost only.
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('maxDepth', { type: 'number', default: 12, description: 'Maximum query depth' })
  .option('port', { type: 'number', default: 4000, description: 'Target port (4000=vulnerable, 4001=hardened)' })
  .option('lab', { type: 'boolean', default: false, description: 'Enable lab mode' })
  .argv;

if (!argv.lab && process.env.NODE_ENV !== 'lab') {
  console.log('This script must be run with --lab or NODE_ENV=lab to prevent accidental misuse.');
  process.exit(1);
}

const maxDepth = argv.maxDepth;
const endpoint = `http://localhost:${argv.port}/graphql`;

// Build a valid deeply nested query based on the schema:
// posts -> author -> posts -> author -> ... -> id
function buildDeepQuery(depth) {
  let inner = 'id';
  for (let i = 0; i < depth; i++) {
    inner = `author { posts { ${inner} } }`;
  }
  return `query Deep { posts { ${inner} } }`;
}

(async () => {
  for (let d = 1; d <= maxDepth; d++) {
    const query = buildDeepQuery(d);
    console.log(`Testing depth ${d}...`);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
      const json = await res.json();
      console.log('OK', JSON.stringify(json).slice(0, 200));
    } catch (e) {
      console.error('Error at depth', d, e.message);
      break;
    }
  }
})();
