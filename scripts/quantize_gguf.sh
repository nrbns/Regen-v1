#!/bin/bash
# Quantize a GGUF model to reduce size
# Usage: ./quantize_gguf.sh <input.gguf> [output.gguf] [qtype]

set -e

INPUT="$1"
OUTPUT="${2:-${INPUT%.gguf}.q4_0.gguf}"
QTYPE="${3:-q4_0}"
LLAMA_CPP_DIR="${LLAMA_CPP_DIR:-$HOME/llama.cpp}"

if [ -z "$INPUT" ]; then
    echo "Usage: $0 <input.gguf> [output.gguf] [qtype]"
    echo ""
    echo "Quantization types:"
    echo "  q4_0  - 4-bit, fast, good quality (recommended)"
    echo "  q4_1  - 4-bit, slower, better quality"
    echo "  q5_0  - 5-bit, slower, higher quality"
    echo "  q8_0  - 8-bit, slowest, highest quality"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo "❌ Input file not found: $INPUT"
    exit 1
fi

if [ ! -d "$LLAMA_CPP_DIR" ]; then
    echo "❌ llama.cpp not found at $LLAMA_CPP_DIR"
    echo "📥 Clone and build llama.cpp first:"
    echo "   git clone https://github.com/ggerganov/llama.cpp.git $LLAMA_CPP_DIR"
    echo "   cd $LLAMA_CPP_DIR && make"
    exit 1
fi

QUANTIZE_BIN="$LLAMA_CPP_DIR/quantize"

if [ ! -f "$QUANTIZE_BIN" ]; then
    echo "❌ quantize binary not found. Build llama.cpp first:"
    echo "   cd $LLAMA_CPP_DIR && make"
    exit 1
fi

echo "🔄 Quantizing $INPUT..."
echo "📊 Type: $QTYPE"
echo "📁 Output: $OUTPUT"

"$QUANTIZE_BIN" "$INPUT" "$OUTPUT" "$QTYPE"

# Get file sizes
INPUT_SIZE=$(du -h "$INPUT" | cut -f1)
OUTPUT_SIZE=$(du -h "$OUTPUT" | cut -f1)

echo "✅ Quantization complete!"
echo "📦 Original size: $INPUT_SIZE"
echo "📦 Quantized size: $OUTPUT_SIZE"
echo "💾 Saved to: $OUTPUT"


