#!/usr/bin/env node
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('lab', { 
    type: 'boolean', 
    default: false,
    description: 'Enable lab mode to run the introspection check'
  })
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

const endpoint = 'http://localhost:4000/graphql';
(async () => {
  try {
    console.log(`Testing introspection on ${endpoint}...`);
    const res = await fetch(endpoint, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ query: introspectionQuery }) 
    });
    
    const json = await res.json();
    
    if (json.data && json.data.__schema) {
      console.log('✅ Introspection available: schema types count =', json.data.__schema.types.length);
      console.log('🚨 VULNERABILITY: GraphQL introspection is enabled!');
    } else if (json.errors) {
      console.log('❌ Introspection appears disabled or blocked.');
      console.log('Errors:', json.errors);
    } else {
      console.log('❓ Unexpected response:', json);
    }
  } catch (error) {
    console.error('❌ Error making request:', error.message);
  }
})();