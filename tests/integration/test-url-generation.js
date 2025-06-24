// Test the URL generation functions
const { getApiBaseUrl, getApiUrl, getStaticFileUrl } = require('./client/src/utils/urlHelpers');

console.log('🧪 Testing URL generation...\n');

// Mock window.location for different scenarios
const testScenarios = [
  {
    name: 'Localhost access',
    hostname: 'localhost',
    expectedBase: 'http://localhost:5000'
  },
  {
    name: '127.0.0.1 access',
    hostname: '127.0.0.1',
    expectedBase: 'http://localhost:5000'
  },
  {
    name: 'Network IP access',
    hostname: '192.168.1.4',
    expectedBase: 'http://192.168.1.4:5000'
  },
  {
    name: 'Other network IP',
    hostname: '192.168.1.100',
    expectedBase: 'http://192.168.1.100:5000'
  }
];

testScenarios.forEach(scenario => {
  // Mock window.location.hostname
  global.window = { location: { hostname: scenario.hostname } };

  const baseUrl = getApiBaseUrl();
  const apiUrl = getApiUrl();
  const staticUrl = getStaticFileUrl('uploads/videos/test.mp4');

  console.log(`📱 ${scenario.name}:`);
  console.log(`   Hostname: ${scenario.hostname}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Static URL: ${staticUrl}`);
  console.log(`   Expected: ${scenario.expectedBase}`);
  console.log(`   ✅ ${baseUrl === scenario.expectedBase ? 'PASS' : 'FAIL'}\n`);
});

console.log('🎉 URL generation test completed!');
