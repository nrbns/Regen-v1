#!/bin/bash
# Setup script for AI Bridge
# Makes everything ready to run

set -e

echo "🔧 Setting up AI Bridge..."

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Warning: Node.js 18+ recommended (current: $(node -v))"
fi

# Navigate to AI Bridge directory
cd "$(dirname "$0")/../server/ai-bridge"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Create token file if not exists
if [ ! -f .bridge_token ]; then
    echo "🔐 Creating token file..."
    echo "LOCAL_DEV_TOKEN" > .bridge_token
    echo "✅ Token file created"
else
    echo "✅ Token file already exists"
fi

# Create .env from .env.example if .env doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
        echo "✅ .env file created (edit it to configure providers)"
    fi
else
    echo "✅ .env file already exists"
fi

# Create models directory
if [ ! -d models ]; then
    echo "📁 Creating models directory..."
    mkdir -p models
    echo "✅ Models directory created"
else
    echo "✅ Models directory already exists"
fi

echo ""
echo "✅ AI Bridge setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start AI Bridge: node index.js"
echo "  2. Test it: npm run test:ai-bridge"
echo "  3. Or use with UI: npm run dev:with-ai"
echo ""


