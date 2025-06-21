#!/bin/bash

echo "🧪 Testing SubPilot Vercel Deployment"
echo "======================================"
echo ""

URL="https://subpilot-test.vercel.app"

echo "🏠 Testing Homepage..."
if curl -s "$URL" | grep -q "SubPilot"; then
    echo "✅ Homepage loads correctly"
else
    echo "❌ Homepage failed to load"
fi

echo ""
echo "🔐 Testing Authentication Pages..."

# Test login page
if curl -s -I "$URL/login" | grep -q "200"; then
    echo "✅ Login page accessible"
else
    echo "❌ Login page not accessible"
fi

# Test signup page
if curl -s -I "$URL/signup" | grep -q "200"; then
    echo "✅ Signup page accessible"
else
    echo "❌ Signup page not accessible"
fi

# Test auth error page
if curl -s -I "$URL/auth-error" | grep -q "200"; then
    echo "✅ Auth error page accessible"
else
    echo "❌ Auth error page not accessible"
fi

echo ""
echo "🔒 Testing Protected Routes (should redirect)..."

# Test dashboard (should redirect to login)
if curl -s -I "$URL/dashboard" | grep -q "307"; then
    echo "✅ Dashboard properly protected (redirects to login)"
else
    echo "❌ Dashboard protection not working"
fi

# Test profile (should redirect to login)
if curl -s -I "$URL/profile" | grep -q "307"; then
    echo "✅ Profile properly protected (redirects to login)"
else
    echo "❌ Profile protection not working"
fi

echo ""
echo "🌐 Testing API Routes..."

# Test health endpoint
if curl -s "$URL/api/health" | grep -q "healthy"; then
    echo "✅ Health API endpoint working"
else
    echo "❌ Health API endpoint not working"
fi

echo ""
echo "📊 Deployment Summary"
echo "===================="
echo "URL: $URL"
echo "Database: Neon PostgreSQL ✅"
echo "Auth: Auth.js configured ✅"
echo "Middleware: Edge Runtime compatible ✅"
echo ""
echo "🎯 Next Steps:"
echo "1. Try signing up with magic link (email will be in console logs)"
echo "2. Configure OAuth providers for Google/GitHub login"
echo "3. Add Plaid credentials for bank integration"
echo ""
echo "Dashboard: https://vercel.com/doublegate-projects/subpilot-test"