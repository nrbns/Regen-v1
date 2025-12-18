#!/bin/bash
# Omnibrowser Demo Launcher
# Checks dependencies and starts all services

echo "========================================"
echo "  Omnibrowser Demo Launcher"
echo "========================================"
echo ""

errors=()

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    version=$(node --version)
    major=$(echo $version | sed 's/v\([0-9]*\).*/\1/')
    if [ "$major" -ge 18 ]; then
        echo "✓ Node.js $version found"
    else
        errors+=("Node.js version $version is too old (need v18+)")
    fi
else
    errors+=("Node.js not found. Install from https://nodejs.org/")
fi

# Check Redis
echo "Checking Redis..."
if command -v redis-cli &> /dev/null; then
    redis_version=$(redis-cli --version)
    echo "✓ Redis CLI found: $redis_version"
else
    errors+=("Redis not found. Install: brew install redis (macOS) or apt install redis (Ubuntu)")
fi

# Check if Redis is running
echo "Checking Redis connection..."
if redis-cli ping &> /dev/null; then
    echo "✓ Redis is running"
else
    errors+=("Redis is not running. Start with: redis-server")
fi

# Check npm dependencies
echo "Checking npm packages..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules found"
else
    echo "⚠ node_modules missing. Running npm install..."
    npm install
    if [ $? -ne 0 ]; then
        errors+=("npm install failed")
    fi
fi

echo ""

# Report errors
if [ ${#errors[@]} -gt 0 ]; then
    echo "========================================"
    echo "  Missing Dependencies"
    echo "========================================"
    echo ""
    for error in "${errors[@]}"; do
        echo "✗ $error"
    done
    echo ""
    echo "Please install missing dependencies and try again."
    echo "See docs/INSTALLATION.md for detailed instructions."
    exit 1
fi

# All checks passed
echo "========================================"
echo "  All Dependencies Ready"
echo "========================================"
echo ""

# Ask user what to start
echo "What would you like to start?"
echo "  1) Full stack (Redis + Server + Frontend)"
echo "  2) Server only (API + Socket.IO)"
echo "  3) Frontend only (Vite dev server)"
echo "  4) Run tests"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Starting full stack..."
        echo "  - Redis: localhost:6379"
        echo "  - Server: http://localhost:3000"
        echo "  - Frontend: http://localhost:5173"
        echo ""
        echo "Press Ctrl+C to stop all services"
        echo ""
        
        # Start services in background
        redis-server &
        REDIS_PID=$!
        sleep 2
        
        npm run dev:realtime &
        SERVER_PID=$!
        sleep 3
        
        npm run dev:web &
        FRONTEND_PID=$!
        sleep 5
        
        echo ""
        echo "Opening browser..."
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:5173
        elif command -v open &> /dev/null; then
            open http://localhost:5173
        fi
        
        echo ""
        echo "Services running. Press Ctrl+C to stop..."
        
        # Cleanup on exit
        trap "kill $REDIS_PID $SERVER_PID $FRONTEND_PID 2>/dev/null" EXIT
        wait
        ;;
    2)
        echo "Starting server..."
        npm run dev:realtime
        ;;
    3)
        echo "Starting frontend..."
        npm run dev:web
        ;;
    4)
        echo "Running tests..."
        npm run test:all
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
