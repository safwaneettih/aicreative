# Tests

This directory contains all test files for the AI Ads Platform.

## Test Structure

### Unit Tests (`/unit`)
Tests for individual functions, components, and modules in isolation.

### Integration Tests (`/integration`)
Tests for API endpoints, database operations, and service integrations.

### End-to-End Tests (`/e2e`)
Tests for complete user workflows and system functionality.

## Running Tests

### Prerequisites
- Node.js installed
- Dependencies installed (`npm install`)
- Test database configured
- Environment variables set

### Commands

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Files

### Integration Tests
- `test-ai.js` - AI service integration tests
- `test-audio-access.js` - Audio file access tests
- `test-bulk-delete.js` - Bulk delete functionality tests
- `test-cors-network.js` - CORS and network configuration tests
- `test-server-api.js` - Server API endpoint tests
- `test-tts-workflow.js` - Text-to-speech workflow tests
- `test-url-generation.js` - URL generation tests
- `check-voiceovers.js` - Voiceover system verification
- `audio-test.html` - Audio playback testing
- `cors-test.html` - CORS configuration testing
- `test-cors-network.sh` - Network connectivity testing script

## Writing Tests

### Test Conventions
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Clean up test data after each test
- Use meaningful assertions

### Example Test Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup test data
  });

  afterEach(() => {
    // Cleanup test data
  });

  it('should perform expected behavior', () => {
    // Arrange
    const input = {};
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Testing Guidelines

1. **Unit Tests**: Test single functions or components
2. **Integration Tests**: Test API endpoints and database operations  
3. **E2E Tests**: Test complete user workflows
4. **Mock External Services**: Use mocks for third-party APIs
5. **Test Edge Cases**: Include error conditions and boundary values
6. **Maintain Test Data**: Keep test fixtures organized and up-to-date

## Test Configuration

### Environment Variables
```bash
NODE_ENV=test
TEST_DATABASE_URL=postgresql://localhost/aiads_test
ELEVENLABS_API_KEY=test_key
GEMINI_API_KEY=test_key
```

### Database Setup
- Create separate test database
- Run migrations before tests
- Seed test data as needed
- Clean database after test suites

## Coverage Requirements

- Minimum 80% code coverage for new features
- Critical paths must have 100% coverage
- All API endpoints must have integration tests
- UI components should have unit tests
