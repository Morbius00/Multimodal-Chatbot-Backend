const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testGeminiAPI() {
  console.log('Testing Gemini API...\n');
  
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET');
  
  if (!apiKey || apiKey === 'demo-key') {
    console.error('❌ GOOGLE_GENAI_API_KEY is not set or is using demo value!');
    console.error('Please set a valid Google Gemini API key in your .env file');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // First, list available models
    console.log('\nFetching available models...');
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    
    for (const modelName of models) {
      try {
        console.log(`\nTrying model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello! Respond with just "Hi"');
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName} WORKS!`);
        console.log('Response:', text);
        break;
      } catch (err) {
        console.log(`❌ ${modelName} failed:`, err.message.substring(0, 100));
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERROR calling Gemini API:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    console.error('\nFull error:', error);
  }
}

testGeminiAPI();
