#!/usr/bin/env node
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('lab', { type: 'boolean', default: false, description: 'Enable lab mode' })
  .option('port', { type: 'number', default: 4000, description: 'Target port (4000=vulnerable, 4001=hardened)' })
  .argv;
if (!argv.lab && process.env.NODE_ENV !== 'lab') {
  console.log('This script must be run with --lab or NODE_ENV=lab to prevent accidental misuse.');
  process.exit(1);
}

const introspectionQuery = `
  query IntrospectionQuery {
    __schema { types { name } }
  }
`;

const endpoint = `http://localhost:${argv.port}/graphql`;
(async () => {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: introspectionQuery }) });
  const json = await res.json();
  if (json.data && json.data.__schema) {
    console.log('Introspection available: schema types count =', json.data.__schema.types.length);
  } else {
    console.log('Introspection appears disabled or blocked.');
  }
})();


