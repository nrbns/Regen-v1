#!/bin/bash
# RegenBrowser Real-Time Demo Script
# Shows investors the real-time capabilities

set -e

echo "🚀 RegenBrowser Real-Time Demo"
echo "================================"
echo ""

# Check Redis
echo "📦 Checking Redis..."
if ! docker ps | grep -q redis; then
  echo "   Starting Redis container..."
  docker run -d --name regen-redis -p 6379:6379 redis:7-alpine
  sleep 2
fi
echo "   ✅ Redis running"

# Check environment
echo ""
echo "🔧 Checking environment..."
if [ ! -f .env ]; then
  echo "   ⚠️  .env file not found, creating from template..."
  cat > .env << EOF
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
JWT_SECRET=demo-secret-key-change-in-production
NODE_ENV=development
EOF
fi
echo "   ✅ Environment configured"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📥 Installing dependencies..."
  npm install
fi

# Start services
echo ""
echo "🎯 Starting services..."
echo ""

# Start server in background
echo "   Starting server..."
npm run dev:server > /tmp/regen-server.log 2>&1 &
SERVER_PID=$!
sleep 3

# Start worker in background
echo "   Starting worker..."
npm run worker:llm > /tmp/regen-worker.log 2>&1 &
WORKER_PID=$!
sleep 2

# Start client
echo "   Starting client..."
echo ""
echo "✅ All services started!"
echo ""
echo "📊 Service Status:"
echo "   - Server: http://localhost:4000"
echo "   - Socket.IO: ws://localhost:4000"
echo "   - Client: http://localhost:5173"
echo "   - Redis: localhost:6379"
echo ""
echo "🧪 Test Real-Time Features:"
echo "   1. Open http://localhost:5173"
echo "   2. Start a search/research query"
echo "   3. Watch real-time streaming results"
echo "   4. Test reconnection (disconnect network briefly)"
echo ""
echo "📈 Metrics:"
echo "   - DAU: Check server/analytics endpoint"
echo "   - Active connections: Check Socket.IO admin"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
trap "echo ''; echo '🛑 Stopping services...'; kill $SERVER_PID $WORKER_PID 2>/dev/null; docker stop regen-redis 2>/dev/null; echo '✅ Cleanup complete'; exit" INT TERM

# Wait for user interrupt
wait

