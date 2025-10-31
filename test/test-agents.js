/**
 * Test script to verify all agents are available in the system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAgents() {
  log('\n' + '='.repeat(70), 'cyan');
  log('  AXORA MULTI-AGENT SYSTEM TEST', 'cyan');
  log('='.repeat(70), 'cyan');

  try {
    // Step 1: Login
    log('\n1. Authenticating...', 'blue');
    let authToken = '';
    
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      authToken = loginResponse.data.token;
      log('✓ Authentication successful', 'green');
    } catch (error) {
      log('✗ Login failed. Creating test user...', 'yellow');
      try {
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
        authToken = registerResponse.data.token;
        log('✓ User created and authenticated', 'green');
      } catch (regError) {
        log('✗ Failed to create user', 'red');
        return;
      }
    }

    // Step 2: Fetch all agents
    log('\n2. Fetching all available agents...', 'blue');
    const agentsResponse = await axios.get(`${BASE_URL}/agents?limit=20&offset=0`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const { agents, pagination } = agentsResponse.data;
    
    log(`✓ Found ${pagination.total} agents in the system`, 'green');
    
    // Display all agents
    log('\n' + '='.repeat(70), 'cyan');
    log('  AVAILABLE AGENTS', 'cyan');
    log('='.repeat(70), 'cyan');
    
    agents.forEach((agent, index) => {
      log(`\n${index + 1}. ${agent.displayName}`, 'magenta');
      log(`   Key: ${agent.key}`, 'blue');
      log(`   Model: ${agent.model.name}`, 'yellow');
      log(`   Temperature: ${agent.temperature}`, 'cyan');
      log(`   Max Tokens: ${agent.maxTokens}`, 'cyan');
      log(`   Tools: ${agent.enabledTools.join(', ')}`, 'yellow');
      
      // Show guardrails if any
      const guardrails = [];
      if (agent.guardrails.medicalDisclaimer) guardrails.push('Medical Disclaimer');
      if (agent.guardrails.financialDisclaimer) guardrails.push('Financial Disclaimer');
      if (agent.guardrails.legalDisclaimer) guardrails.push('Legal Disclaimer');
      if (guardrails.length > 0) {
        log(`   Guardrails: ${guardrails.join(', ')}`, 'red');
      }
    });

    // Step 3: Verify expected agents
    log('\n' + '='.repeat(70), 'cyan');
    log('  AGENT VERIFICATION', 'cyan');
    log('='.repeat(70), 'cyan');

    const expectedAgents = [
      'general',
      'education',
      'finance',
      'medical',
      'technology',
      'legal',
      'creative',
      'language',
      'business'
    ];

    const foundKeys = agents.map(a => a.key);
    
    log('\nExpected Agents:', 'blue');
    expectedAgents.forEach(key => {
      if (foundKeys.includes(key)) {
        log(`  ✓ ${key}`, 'green');
      } else {
        log(`  ✗ ${key} (MISSING!)`, 'red');
      }
    });

    // Check for unexpected agents
    const unexpected = foundKeys.filter(key => !expectedAgents.includes(key));
    if (unexpected.length > 0) {
      log('\nUnexpected Agents:', 'yellow');
      unexpected.forEach(key => log(`  • ${key}`, 'yellow'));
    }

    // Step 4: Test agent details
    log('\n' + '='.repeat(70), 'cyan');
    log('  TESTING AGENT DETAILS ENDPOINT', 'cyan');
    log('='.repeat(70), 'cyan');

    // Test fetching details for the new technology agent
    const techAgent = await axios.get(`${BASE_URL}/agents/technology`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('\n✓ Successfully fetched Technology Assistant details:', 'green');
    log(`  Display Name: ${techAgent.data.displayName}`, 'cyan');
    log(`  Model: ${techAgent.data.model.name}`, 'cyan');
    log(`  Collections: ${techAgent.data.retrieval.collections.join(', ')}`, 'cyan');

    // Summary
    log('\n' + '='.repeat(70), 'cyan');
    log('  TEST SUMMARY', 'cyan');
    log('='.repeat(70), 'cyan');
    
    if (pagination.total === 9 && foundKeys.length === expectedAgents.length) {
      log('\n✓ SUCCESS! All 9 agents are properly configured and available!', 'green');
      log('\nYou can now:', 'blue');
      log('  1. Create conversations with any agent', 'cyan');
      log('  2. The General Assistant will intelligently delegate to specialists', 'cyan');
      log('  3. Access specialized expertise across 9 domains', 'cyan');
    } else {
      log('\n⚠ WARNING: Agent count mismatch', 'yellow');
      log(`  Expected: 9 agents`, 'yellow');
      log(`  Found: ${pagination.total} agents`, 'yellow');
    }

  } catch (error) {
    log('\n✗ Test failed:', 'red');
    if (error.response) {
      log(`  Status: ${error.response.status}`, 'red');
      log(`  Error: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`  ${error.message}`, 'red');
    }
  }

  log('\n' + '='.repeat(70), 'cyan');
  log('  TEST COMPLETED', 'cyan');
  log('='.repeat(70) + '\n', 'cyan');
}

// Run the test
testAgents().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
