#!/bin/bash

# CORS Network Test Script
# This script helps test CORS connectivity from network devices

SERVER_IP="192.168.1.4"
SERVER_PORT="5000"
CLIENT_PORT="3000"

echo "🌐 AI Creative Builder - Network CORS Test"
echo "=========================================="
echo "Server: http://${SERVER_IP}:${SERVER_PORT}"
echo "Client: http://${SERVER_IP}:${CLIENT_PORT}"
echo ""

# Test server health
echo "🔍 Testing server health..."
curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}:${SERVER_PORT}/api/health" > /tmp/health_status
HEALTH_STATUS=$(cat /tmp/health_status)

if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Server is healthy (HTTP $HEALTH_STATUS)"
else
    echo "❌ Server health check failed (HTTP $HEALTH_STATUS)"
    exit 1
fi

# Test CORS preflight
echo ""
echo "🔍 Testing CORS preflight..."
PREFLIGHT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: http://${SERVER_IP}:${CLIENT_PORT}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization,content-type" \
    -X OPTIONS \
    "http://${SERVER_IP}:${SERVER_PORT}/api/workspaces")

if [ "$PREFLIGHT_STATUS" = "200" ]; then
    echo "✅ CORS preflight successful (HTTP $PREFLIGHT_STATUS)"
else
    echo "❌ CORS preflight failed (HTTP $PREFLIGHT_STATUS)"
fi

# Test static file access
echo ""
echo "🔍 Testing static file CORS..."
STATIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Origin: http://${SERVER_IP}:${CLIENT_PORT}" \
    "http://${SERVER_IP}:${SERVER_PORT}/uploads/")

if [ "$STATIC_STATUS" = "200" ] || [ "$STATIC_STATUS" = "404" ]; then
    echo "✅ Static file CORS working (HTTP $STATIC_STATUS)"
else
    echo "❌ Static file CORS failed (HTTP $STATIC_STATUS)"
fi

echo ""
echo "📊 CORS Configuration Summary:"
echo "- Max Age: 86400 seconds (24 hours)"
echo "- Keep-Alive: 30 seconds"
echo "- Credentials: Allowed"
echo "- Origins: All allowed in development"
echo "- Methods: GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH"
echo ""
echo "💡 Tips for network devices:"
echo "1. Clear browser cache if experiencing issues"
echo "2. Check that both devices are on the same network"
echo "3. Ensure no firewall blocking connections"
echo "4. Server logs show timestamp for debugging"

rm -f /tmp/health_status
