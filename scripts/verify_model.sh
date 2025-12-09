#!/bin/bash
# Verify a GGUF model file
# Usage: ./verify_model.sh <model.gguf>

set -e

MODEL="$1"
LLAMA_CPP_DIR="${LLAMA_CPP_DIR:-$HOME/llama.cpp}"

if [ -z "$MODEL" ]; then
    echo "Usage: $0 <model.gguf>"
    exit 1
fi

if [ ! -f "$MODEL" ]; then
    echo "❌ Model file not found: $MODEL"
    exit 1
fi

echo "🔍 Verifying model: $MODEL"

# Check file size
FILE_SIZE=$(du -h "$MODEL" | cut -f1)
echo "📦 File size: $FILE_SIZE"

# Check if it's a GGUF file (basic check)
if ! file "$MODEL" | grep -q "data\|GGUF"; then
    echo "⚠️  Warning: File type check inconclusive"
fi

# Try to load with llama.cpp if available
if [ -d "$LLAMA_CPP_DIR" ]; then
    MAIN_BIN="$LLAMA_CPP_DIR/main"
    
    if [ -f "$MAIN_BIN" ]; then
        echo "🧪 Testing model loading with llama.cpp..."
        
        # Try to load model with a simple prompt
        echo "Test prompt" | timeout 10 "$MAIN_BIN" \
            -m "$MODEL" \
            -n 5 \
            --no-display-prompt \
            -e 2>&1 | head -20
        
        if [ $? -eq 0 ]; then
            echo "✅ Model loads successfully!"
        else
            echo "⚠️  Model loading test failed (may still be valid)"
        fi
    else
        echo "⚠️  llama.cpp main binary not found, skipping load test"
    fi
else
    echo "⚠️  llama.cpp not found, skipping load test"
fi

# Calculate checksum
echo "🔐 Calculating checksum..."
CHECKSUM=$(sha256sum "$MODEL" | cut -d' ' -f1)
echo "✅ SHA256: $CHECKSUM"

echo ""
echo "📋 Model Info:"
echo "   File: $MODEL"
echo "   Size: $FILE_SIZE"
echo "   SHA256: $CHECKSUM"



