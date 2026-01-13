#!/bin/bash
# Test script for new Regen v1 features
# Runs E2E tests for all new features

echo "🧪 Testing Regen v1 New Features..."
echo ""

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright not found. Installing..."
    npm install -D @playwright/test
fi

# Run E2E tests
echo "📋 Running E2E tests..."
echo ""

echo "1️⃣ Testing Realtime Features..."
npx playwright test tests/e2e/realtime-features.spec.ts --reporter=list

echo ""
echo "2️⃣ Testing Event Bus Performance..."
npx playwright test tests/e2e/event-bus-performance.spec.ts --reporter=list

echo ""
echo "3️⃣ Testing AI Features..."
npx playwright test tests/e2e/ai-features.spec.ts --reporter=list

echo ""
echo "4️⃣ Testing Performance Benchmarks..."
npx playwright test tests/e2e/performance-benchmarks.spec.ts --reporter=list

echo ""
echo "✅ All tests completed!"
echo ""
echo "📊 Test Summary:"
npx playwright test --reporter=list --reporter=html
