# 🚨 SECURITY NOTICE

## API Keys Exposure - Immediate Action Required

**Date:** June 24, 2025  
**Severity:** HIGH  
**Status:** PATCHED (but keys need rotation)

### What Happened
API keys for Google Gemini and ElevenLabs were accidentally committed to the repository in test files:
- `tests/integration/test-ai.js` 
- `tests/integration/test-tts-workflow.js`

### Keys That Were Exposed
- Google Gemini API Key: `AIzaSyACSPZ5B6ZVYI-Km4OcvXpWTlzVMzJTpo4` (REDACTED - see Git history)
- ElevenLabs API Key: `sk_2f3ae479b03b5e01290fca484a33424a6d51f6196ec5b76e` (REDACTED - see Git history)

### Immediate Actions Taken
✅ Removed hardcoded keys from source code  
✅ Committed security fix to repository  
✅ Updated files to use environment variables  

### Required Actions
🔴 **CRITICAL - Do this immediately:**

1. **Rotate Google Gemini API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Credentials
   - Delete the exposed key: `AIzaSyAC...Tpo4` (see Git history for full key)
   - Generate a new API key
   - Update your `.env` files with the new key

2. **Rotate ElevenLabs API Key**
   - Go to [ElevenLabs Dashboard](https://beta.elevenlabs.io/)
   - Navigate to Profile Settings > API Keys
   - Delete the exposed key: `sk_2f3a...76e` (see Git history for full key)
   - Generate a new API key
   - Update your `.env` files with the new key

3. **Monitor API Usage**
   - Check both services for any unauthorized usage
   - Review billing and usage reports
   - Set up usage alerts if available

### Prevention Measures Implemented
- Updated `.gitignore` to exclude all `.env` files
- Added environment variable instructions in test files
- Created security documentation

### Long-term Security Improvements
- [ ] Implement git hooks to prevent secret commits
- [ ] Use secret scanning tools
- [ ] Regular security audits of codebase
- [ ] Environment variable validation in CI/CD

### Contact
If you notice any suspicious activity or unauthorized usage, immediately contact the development team.

---
**Remember:** Even though we fixed the code, the keys are still visible in Git history. Key rotation is MANDATORY.
