# AI Models Directory

This directory is for bundled AI model files (optional).

## Model Storage

Models are typically managed by Ollama and stored in:

- **Windows**: `%USERPROFILE%\.ollama\models`
- **macOS/Linux**: `~/.ollama/models`

## Bundled Models (Optional)

If you want to bundle models with the app, place them here:

- `phi3:mini` - Small language model (~2GB)
- `llava:7b` - Vision-language model (~4GB)
- `qwen2:1.5b` - Ultra-small model (~1GB)

## Model Format

Models should be in GGUF format (quantized):

- Q4_K_M (recommended for balance)
- Q3_K_M (for lower RAM usage)

## Download Instructions

Models are automatically downloaded by Ollama when first used:

```bash
ollama pull phi3:mini
ollama pull llava:7b
```

For offline bundling, download models and place in this directory.
