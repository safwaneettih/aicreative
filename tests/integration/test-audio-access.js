const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server/.env') });

async function testAudioEndpoints() {
  const baseUrl = 'http://localhost:5000';

  console.log('🧪 Testing Audio File Access...\n');

  // Test files we know exist
  const testFiles = [
    'uploads/voiceovers/voiceover_46ff2f40-9295-4d12-bd5a-cfbd34ab9d54.mp3',
    'uploads/voiceovers/voiceover_73c4c13a-bb6d-41d0-8e99-a5109154f703.mp3',
    'uploads/voiceovers/voiceover_fafc6b3d-bc34-41f8-9409-361170a731bc.mp3'
  ];

  for (const filePath of testFiles) {
    const fullUrl = `${baseUrl}/${filePath}`;

    try {
      console.log(`Testing: ${fullUrl}`);

      const response = await fetch(fullUrl, { method: 'HEAD' });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const corsHeader = response.headers.get('access-control-allow-origin');

        console.log(`✅ Accessible (${response.status})`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Content-Length: ${contentLength} bytes`);
        console.log(`   CORS: ${corsHeader || 'Not set'}`);
      } else {
        console.log(`❌ Not accessible (${response.status} ${response.statusText})`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log('---');
  }

  // Test CORS from different origins
  console.log('\n🌐 Testing CORS from localhost:3003...');

  try {
    const response = await fetch(`${baseUrl}/${testFiles[0]}`, {
      method: 'HEAD',
      headers: {
        'Origin': 'http://localhost:3003'
      }
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('access-control-allow-origin'),
      'Access-Control-Allow-Credentials': response.headers.get('access-control-allow-credentials'),
      'Vary': response.headers.get('vary')
    };

    console.log('CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      console.log(`  ${key}: ${value || 'Not set'}`);
    });

  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
  }

  console.log('\n✅ Test completed!');
}

// Use dynamic import for node-fetch if needed, or use built-in fetch
const fetch = global.fetch || require('node-fetch');

testAudioEndpoints().catch(console.error);
