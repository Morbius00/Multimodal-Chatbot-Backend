// Simple API test script
const http = require('http');

const testEndpoint = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token' // Mock token for testing
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, body: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await testEndpoint('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.body, null, 2)}\n`);

    // Test agents endpoint
    console.log('2. Testing agents endpoint...');
    const agents = await testEndpoint('/api/agents');
    console.log(`   Status: ${agents.status}`);
    console.log(`   Response: ${JSON.stringify(agents.body, null, 2)}\n`);

    // Test conversations endpoint
    console.log('3. Testing conversations endpoint...');
    const conversations = await testEndpoint('/api/conversations');
    console.log(`   Status: ${conversations.status}`);
    console.log(`   Response: ${JSON.stringify(conversations.body, null, 2)}\n`);

    // Test creating a conversation
    console.log('4. Testing conversation creation...');
    const newConversation = await testEndpoint('/api/conversations', 'POST', {
      agentKey: 'general',
      title: 'Test Conversation'
    });
    console.log(`   Status: ${newConversation.status}`);
    console.log(`   Response: ${JSON.stringify(newConversation.body, null, 2)}\n`);

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running first
testEndpoint('/health')
  .then(() => {
    console.log('🚀 Server is running, starting tests...\n');
    return runTests();
  })
  .catch((error) => {
    console.error('❌ Server is not running. Please start the server with: npm run dev');
    console.error('Error:', error.message);
  });
