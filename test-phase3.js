// Test script for Phase 3 - Retrieval & Guardrails
const http = require('http');

const testEndpoint = (path, method = 'GET', data = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token',
        ...headers
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

async function testPhase3() {
  console.log('🧪 Testing Phase 3 - Retrieval & Guardrails\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await testEndpoint('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.body, null, 2)}\n`);

    // Test 2: Knowledge base stats (admin endpoint)
    console.log('2. Testing knowledge base stats...');
    const stats = await testEndpoint('/api/admin/knowledge/stats');
    console.log(`   Status: ${stats.status}`);
    console.log(`   Response: ${JSON.stringify(stats.body, null, 2)}\n`);

    // Test 3: List collections
    console.log('3. Testing collections list...');
    const collections = await testEndpoint('/api/admin/knowledge/collections');
    console.log(`   Status: ${collections.status}`);
    console.log(`   Response: ${JSON.stringify(collections.body, null, 2)}\n`);

    // Test 4: Knowledge search
    console.log('4. Testing knowledge search...');
    const search = await testEndpoint('/api/admin/knowledge/search', 'POST', {
      query: 'study techniques',
      collections: ['edu_faq'],
      topK: 5,
      minScore: 0.5
    });
    console.log(`   Status: ${search.status}`);
    console.log(`   Response: ${JSON.stringify(search.body, null, 2)}\n`);

    // Test 5: Test chat with retrieval (if knowledge is seeded)
    console.log('5. Testing chat with retrieval...');
    const chat = await testEndpoint('/api/chat', 'POST', {
      conversationId: 'test-conversation',
      agentKey: 'education',
      text: 'What are some effective study techniques?'
    });
    console.log(`   Status: ${chat.status}`);
    console.log(`   Response: ${JSON.stringify(chat.body, null, 2)}\n`);

    // Test 6: Test output gate with out-of-domain query
    console.log('6. Testing output gate with out-of-domain query...');
    const outOfDomain = await testEndpoint('/api/chat', 'POST', {
      conversationId: 'test-conversation',
      agentKey: 'medical',
      text: 'What is the best investment strategy?'
    });
    console.log(`   Status: ${outOfDomain.status}`);
    console.log(`   Response: ${JSON.stringify(outOfDomain.body, null, 2)}\n`);

    console.log('✅ Phase 3 tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if server is running first
testEndpoint('/health')
  .then(() => {
    console.log('🚀 Server is running, starting Phase 3 tests...\n');
    return testPhase3();
  })
  .catch((error) => {
    console.error('❌ Server is not running. Please start the server with: npm run dev');
    console.error('Error:', error.message);
  });
