# Test Configuration Template

## Environment Variables for Testing

Before running integration tests, set the following environment variables:

```bash
# Copy this file to .env.test and fill in your actual values
# NEVER commit the actual .env.test file

# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# ElevenLabs API Key  
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Database URL for testing
TEST_DATABASE_URL=postgresql://localhost/aiads_test

# JWT Secret for testing
JWT_SECRET=your_test_jwt_secret_here
```

## Running Tests Securely

### Option 1: Using .env.test file
1. Copy this template to `.env.test`
2. Fill in your actual API keys
3. Run tests with: `npm run test`

### Option 2: Using inline environment variables
```bash
GEMINI_API_KEY=your_key ELEVENLABS_API_KEY=your_key npm run test:integration
```

### Option 3: Using export (for multiple test runs)
```bash
export GEMINI_API_KEY=your_gemini_key
export ELEVENLABS_API_KEY=your_elevenlabs_key
npm run test:integration
```

## Security Best Practices

1. **Never hardcode API keys in source files**
2. **Always use environment variables**
3. **Use different API keys for testing vs production**
4. **Regularly rotate your API keys**
5. **Monitor API usage for suspicious activity**
6. **Use API key restrictions when possible**

## API Key Management

### Google Gemini
- Create keys at: https://console.cloud.google.com/
- Restrict by IP address if possible
- Set usage quotas
- Monitor in Cloud Console

### ElevenLabs
- Create keys at: https://beta.elevenlabs.io/
- Monitor usage in dashboard
- Set monthly limits
- Use separate keys for development/production
