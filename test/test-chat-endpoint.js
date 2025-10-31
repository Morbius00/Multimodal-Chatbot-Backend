#!/usr/bin/env node
/**
 * Test script for the /api/chat endpoint
 * This script demonstrates the full flow: register -> login -> create conversation -> send chat message
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Helper function to make API requests
async function apiRequest(method, path, data = null, token = null) {
  const config = {
    method,
    url: `${BASE_URL}${path}`,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message,
    };
  }
}

async function testChatEndpoint() {
  console.log('🧪 Testing Chat Endpoint Flow\n');
  console.log('=' .repeat(60));

  let token = null;
  let conversationId = null;

  try {
    // Step 1: Register a test user
    console.log('\n1️⃣  Registering test user...');
    const registerData = {
      email: `test-${Date.now()}@example.com`,
      password: 'Test123!@#',
      name: 'Test User',
    };
    const registerResult = await apiRequest('POST', '/api/auth/register', registerData);
    
    if (registerResult.success) {
      console.log('✅ User registered successfully');
      console.log(`   Email: ${registerData.email}`);
      token = registerResult.data.accessToken;
    } else {
      // If registration fails (maybe user exists), try logging in
      console.log('ℹ️  Registration failed, attempting login...');
      const loginResult = await apiRequest('POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'Test123!@#',
      });
      
      if (loginResult.success) {
        console.log('✅ Logged in successfully');
        token = loginResult.data.accessToken;
      } else {
        console.error('❌ Both registration and login failed');
        console.error('   Error:', loginResult.error);
        return;
      }
    }

    // Step 2: Create a conversation
    console.log('\n2️⃣  Creating conversation...');
    const conversationResult = await apiRequest('POST', '/api/conversations', {
      agentKey: 'general',
      title: 'Test Chat Conversation',
    }, token);

    if (conversationResult.success) {
      console.log('✅ Conversation created successfully');
      conversationId = conversationResult.data.conversation._id;
      console.log(`   Conversation ID: ${conversationId}`);
    } else {
      console.error('❌ Failed to create conversation');
      console.error('   Error:', conversationResult.error);
      return;
    }

    // Step 3: Send a chat message
    console.log('\n3️⃣  Sending chat message...');
    const chatResult = await apiRequest('POST', '/api/chat', {
      conversationId,
      text: 'Hello! Can you help me understand what you can do?',
    }, token);

    if (chatResult.success) {
      console.log('✅ Chat message sent successfully');
      console.log('   Response:');
      console.log(JSON.stringify(chatResult.data, null, 2));
    } else {
      console.error('❌ Failed to send chat message');
      console.error('   Status:', chatResult.status);
      console.error('   Error:', chatResult.error);
      return;
    }

    // Step 4: Get messages from the conversation
    console.log('\n4️⃣  Fetching conversation messages...');
    const messagesResult = await apiRequest('GET', `/api/conversations/${conversationId}/messages`, null, token);

    if (messagesResult.success) {
      console.log('✅ Messages fetched successfully');
      console.log(`   Total messages: ${messagesResult.data.messages.length}`);
      messagesResult.data.messages.forEach((msg, idx) => {
        console.log(`\n   Message ${idx + 1} (${msg.role}):`);
        console.log(`   ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}`);
      });
    } else {
      console.error('❌ Failed to fetch messages');
      console.error('   Error:', messagesResult.error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('🚀 Server is running');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Port: ${response.data.port}`);
    console.log(`   Environment: ${response.data.environment}\n`);
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.error('   Please start the server with: npm run dev\n');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testChatEndpoint();
  }
})();
