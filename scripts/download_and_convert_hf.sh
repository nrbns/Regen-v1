#!/bin/bash
# Download and convert HuggingFace model to GGUF format
# Usage: ./download_and_convert_hf.sh <model_id> [output_dir]

set -e

MODEL_ID="${1:-microsoft/Phi-3-mini-4k-instruct}"
OUTPUT_DIR="${2:-./server/ai-bridge/models}"
LLAMA_CPP_DIR="${LLAMA_CPP_DIR:-$HOME/llama.cpp}"

echo "🚀 Downloading and converting model: $MODEL_ID"
echo "📁 Output directory: $OUTPUT_DIR"
echo "🔧 Llama.cpp directory: $LLAMA_CPP_DIR"

# Check if llama.cpp exists
if [ ! -d "$LLAMA_CPP_DIR" ]; then
    echo "❌ llama.cpp not found at $LLAMA_CPP_DIR"
    echo "📥 Clone llama.cpp first:"
    echo "   git clone https://github.com/ggerganov/llama.cpp.git $LLAMA_CPP_DIR"
    echo "   cd $LLAMA_CPP_DIR && make"
    exit 1
fi

# Check if python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ python3 not found. Please install Python 3"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Install required Python packages
echo "📦 Installing Python dependencies..."
pip3 install -q huggingface-hub transformers

# Download model from HuggingFace
echo "📥 Downloading model from HuggingFace..."
python3 << EOF
from huggingface_hub import snapshot_download
import os

model_id = "$MODEL_ID"
output_dir = "$OUTPUT_DIR/$MODEL_ID"
os.makedirs(output_dir, exist_ok=True)

print(f"Downloading {model_id} to {output_dir}...")
snapshot_download(
    repo_id=model_id,
    local_dir=output_dir,
    local_dir_use_symlinks=False
)
print("✅ Download complete!")
EOF

# Convert to GGUF using llama.cpp
echo "🔄 Converting to GGUF format..."
MODEL_NAME=$(basename "$MODEL_ID")
CONVERT_PY="$LLAMA_CPP_DIR/convert-hf-to-gguf.py"

if [ ! -f "$CONVERT_PY" ]; then
    echo "❌ convert-hf-to-gguf.py not found at $CONVERT_PY"
    echo "   Make sure llama.cpp is fully built"
    exit 1
fi

python3 "$CONVERT_PY" \
    "$OUTPUT_DIR/$MODEL_ID" \
    --outdir "$OUTPUT_DIR" \
    --outtype f16

echo "✅ Conversion complete!"
echo "📁 Model saved to: $OUTPUT_DIR"



