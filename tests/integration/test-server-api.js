const axios = require('axios');

async function testServerAPI() {
  try {
    console.log('🧪 Testing server API for TTS-ready scripts...\n');

    // First, let's test if the server is running
    const healthCheck = await axios.get('http://localhost:5000/api/health').catch(() => null);
    if (!healthCheck) {
      console.log('ℹ️ No health endpoint, trying auth endpoint...');
    }

    // Test script generation endpoint
    // Note: This might fail due to auth, but we can see the response format
    const testData = {
      workspaceId: 1,
      title: "Test TTS Script",
      style: "conversational",
      tone: "engaging",
      target_audience: "25-34",
      prompt: "Create a clean TTS-ready script"
    };

    console.log('📤 Testing script generation endpoint...');
    console.log('URL: http://localhost:5000/api/scripts/generate');
    console.log('Data:', testData);

    try {
      const response = await axios.post('http://localhost:5000/api/scripts/generate', testData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // This will likely fail, but we can see the error
        }
      });

      console.log('✅ Script generation response:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('⚠️ Expected auth error, but server is responding:');
        console.log('Status:', error.response.status);
        console.log('Error:', error.response.data.error || error.response.statusText);
        console.log('✅ Server is running and accepting requests');
      } else {
        console.log('❌ Server connection failed:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Server test failed:', error.message);
  }
}

testServerAPI();
