/**
 * Test script for conversation title auto-update feature
 * 
 * This script demonstrates how the conversation title
 * automatically changes from the agent name to the first message content.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
let authToken = '';
let conversationId = '';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  log('\n1. Logging in...', 'blue');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    authToken = response.data.token;
    log('✓ Login successful', 'green');
    return true;
  } catch (error) {
    log('✗ Login failed. Make sure you have a test user.', 'red');
    log('  Create one with: POST /api/auth/register', 'yellow');
    return false;
  }
}

async function createConversation() {
  log('\n2. Creating a new conversation...', 'blue');
  try {
    const response = await axios.post(
      `${BASE_URL}/conversations`,
      { agentKey: 'general' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    conversationId = response.data.id;
    log(`✓ Conversation created: ${conversationId}`, 'green');
    log(`  Initial title: "${response.data.title}"`, 'cyan');
    return true;
  } catch (error) {
    log('✗ Failed to create conversation', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function sendFirstMessage() {
  log('\n3. Sending first message to conversation...', 'blue');
  const firstMessage = "What are the best practices for machine learning model deployment?";
  log(`  Message: "${firstMessage}"`, 'yellow');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/chat`,
      {
        conversationId,
        text: firstMessage
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log('✓ Message sent successfully', 'green');
    return true;
  } catch (error) {
    log('✗ Failed to send message', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function checkConversationTitle() {
  log('\n4. Checking updated conversation title...', 'blue');
  
  // Wait a moment for the title update to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    const response = await axios.get(
      `${BASE_URL}/conversations`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const conversation = response.data.conversations.find(c => c._id === conversationId);
    
    if (conversation) {
      log(`✓ Updated title: "${conversation.title}"`, 'green');
      
      if (conversation.title === 'General Assistant') {
        log('⚠ Title was not updated (still showing agent name)', 'yellow');
        log('  This might indicate an issue with the auto-update feature', 'yellow');
      } else {
        log('✓ SUCCESS! Title was automatically updated from agent name to message content!', 'green');
      }
    } else {
      log('✗ Could not find the conversation', 'red');
    }
  } catch (error) {
    log('✗ Failed to fetch conversations', 'red');
    console.error(error.response?.data || error.message);
  }
}

async function testManualUpdate() {
  log('\n5. Testing manual title update...', 'blue');
  const customTitle = "ML Deployment Best Practices Discussion";
  
  try {
    const response = await axios.patch(
      `${BASE_URL}/conversations/${conversationId}`,
      { title: customTitle },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log(`✓ Title manually updated to: "${response.data.title}"`, 'green');
  } catch (error) {
    log('✗ Failed to update title manually', 'red');
    console.error(error.response?.data || error.message);
  }
}

async function runTests() {
  log('='.repeat(70), 'cyan');
  log('  CONVERSATION TITLE AUTO-UPDATE TEST', 'cyan');
  log('='.repeat(70), 'cyan');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\nTest aborted due to login failure.', 'red');
    return;
  }
  
  const createSuccess = await createConversation();
  if (!createSuccess) {
    log('\nTest aborted due to conversation creation failure.', 'red');
    return;
  }
  
  const sendSuccess = await sendFirstMessage();
  if (!sendSuccess) {
    log('\nTest aborted due to message send failure.', 'red');
    return;
  }
  
  await checkConversationTitle();
  await testManualUpdate();
  
  log('\n' + '='.repeat(70), 'cyan');
  log('  TEST COMPLETED', 'cyan');
  log('='.repeat(70), 'cyan');
  log('\nYou can now check your conversation list at:', 'blue');
  log(`  GET ${BASE_URL}/conversations`, 'yellow');
  log('\nAll new conversations will have their titles automatically', 'blue');
  log('updated based on the first message content!', 'blue');
}

// Run the tests
runTests().catch(error => {
  log('\nUnexpected error:', 'red');
  console.error(error);
  process.exit(1);
});
