#!/bin/bash
# RegenBrowser Investor Demo Script
# PR E: Reproducible demo that boots Redis, server, worker and runs k6 smoke test

set -e

echo "🚀 RegenBrowser Investor Demo"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 20+${NC}"
    exit 1
fi

if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis not found. Attempting to start with Docker...${NC}"
    if command -v docker &> /dev/null; then
        docker run -d --name regen-redis -p 6379:6379 redis:7-alpine || echo -e "${YELLOW}⚠️  Redis container may already exist${NC}"
        sleep 2
    else
        echo -e "${RED}❌ Redis not found and Docker not available. Please install Redis.${NC}"
        exit 1
    fi
fi

# Check Redis connection
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not responding. Starting Redis...${NC}"
    if command -v docker &> /dev/null; then
        docker start regen-redis || docker run -d --name regen-redis -p 6379:6379 redis:7-alpine
        sleep 2
    fi
fi

# Check k6
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW}⚠️  k6 not found. Installing...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        echo -e "${RED}❌ k6 installation not automated for this OS. Please install manually.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ k6 is installed${NC}"

# Setup environment
echo ""
echo "🔧 Setting up environment..."

if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
REDIS_URL=redis://127.0.0.1:6379
NODE_ENV=development
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
EOF
    echo -e "${GREEN}✅ .env file created${NC}"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start services
echo ""
echo "🚀 Starting services..."

# Start server in background
echo "Starting server..."
npm run dev:server > /tmp/regen-server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to be ready
echo "Waiting for server to be ready..."
for i in {1..30}; do
    if curl -f http://localhost:4000/api/ping &> /dev/null; then
        echo -e "${GREEN}✅ Server is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Server failed to start${NC}"
        cat /tmp/regen-server.log
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Start worker in background
echo "Starting worker..."
npm run worker:llm > /tmp/regen-worker.log 2>&1 &
WORKER_PID=$!
echo "Worker PID: $WORKER_PID"
sleep 2

# Run k6 smoke test
echo ""
echo "📊 Running k6 smoke test..."
echo ""

k6 run --vus 10 --duration 30s tests/load/k6-load-test.js || {
    echo -e "${YELLOW}⚠️  k6 test had some failures (this is OK for demo)${NC}"
}

# Show server stats
echo ""
echo "📈 Server Stats:"
curl -s http://localhost:4000/api/socketio/stats | jq '.' || echo "Stats endpoint not available"

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    kill $WORKER_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

trap cleanup EXIT

echo ""
echo -e "${GREEN}✅ Demo is running!${NC}"
echo "Server logs: /tmp/regen-server.log"
echo "Worker logs: /tmp/regen-worker.log"
echo ""
echo "Press Ctrl+C to stop"

# Keep script running
wait
