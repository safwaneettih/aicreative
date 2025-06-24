// Test CORS from different origins
async function testCorsFromNetworkDevice() {
    const serverUrl = 'http://192.168.1.4:5000';
    const testOrigins = [
        'http://localhost:3003',
        'http://127.0.0.1:3003',
        'http://192.168.1.4:3003',
        'http://192.168.1.5:3003', // Simulating another device
        null // No origin header
    ];

    console.log('🧪 Testing CORS from different network origins...\n');

    for (const origin of testOrigins) {
        try {
            console.log(`📱 Testing from origin: ${origin || 'No origin'}`);

            // Test OPTIONS preflight request
            const headers = {
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, Authorization'
            };

            if (origin) {
                headers['Origin'] = origin;
            }

            const preflightResponse = await fetch(`${serverUrl}/api/health`, {
                method: 'OPTIONS',
                headers
            });

            console.log(`   Preflight Status: ${preflightResponse.status}`);
            console.log(`   CORS Headers:`);
            console.log(`     - Access-Control-Allow-Origin: ${preflightResponse.headers.get('access-control-allow-origin')}`);
            console.log(`     - Access-Control-Allow-Methods: ${preflightResponse.headers.get('access-control-allow-methods')}`);
            console.log(`     - Access-Control-Allow-Headers: ${preflightResponse.headers.get('access-control-allow-headers')}`);
            console.log(`     - Access-Control-Allow-Credentials: ${preflightResponse.headers.get('access-control-allow-credentials')}`);

            // Test actual request
            const actualResponse = await fetch(`${serverUrl}/api/health`, {
                method: 'GET',
                headers: origin ? { 'Origin': origin } : {}
            });

            console.log(`   Actual Request Status: ${actualResponse.status}`);
            console.log(`   Response: ${actualResponse.ok ? '✅ Success' : '❌ Failed'}\n`);

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}\n`);
        }
    }
}

// Test login endpoint specifically
async function testLoginCors() {
    const serverUrl = 'http://192.168.1.4:5000';
    const networkOrigin = 'http://192.168.1.4:3003';

    console.log('🔐 Testing login endpoint CORS...\n');

    try {
        const response = await fetch(`${serverUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': networkOrigin
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'testpassword'
            })
        });

        console.log(`Login Status: ${response.status}`);
        console.log(`CORS Headers:`);
        console.log(`  - Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
        console.log(`  - Access-Control-Allow-Credentials: ${response.headers.get('access-control-allow-credentials')}`);

        if (response.status === 401) {
            console.log('✅ CORS working (401 = invalid credentials, which is expected)');
        } else if (response.status === 400) {
            console.log('✅ CORS working (400 = bad request format)');
        } else {
            console.log(`Status: ${response.status} - ${response.statusText}`);
        }

    } catch (error) {
        console.log(`❌ Login CORS Error: ${error.message}`);
    }
}

if (typeof fetch === 'undefined') {
    console.log('❌ This test requires fetch. Run in a browser or install node-fetch.');
} else {
    testCorsFromNetworkDevice().then(() => testLoginCors());
}
