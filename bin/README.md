# Binary Assets Directory

This directory is for bundled binaries (optional).

## Bundled Binaries

If you want to bundle binaries with the app, place them here:

### Windows

- `ollama.exe` - Ollama runtime (if bundling)
- `whisper.cpp.exe` - Whisper speech-to-text (if bundling)
- `tor.exe` - TOR client (if bundling)

### macOS/Linux

- `ollama` - Ollama runtime
- `whisper.cpp` - Whisper speech-to-text
- `tor` - TOR client

## Current Approach

Currently, binaries are expected to be:

1. **In system PATH** (user installs separately)
2. **Auto-downloaded** (Ollama pulls models on first use)

## Bundling Strategy

If bundling binaries:

1. Place platform-specific binaries in subdirectories:
   - `bin/windows/ollama.exe`
   - `bin/macos/ollama`
   - `bin/linux/ollama`
2. Update `src-tauri/src/services/ollama_service.rs` to use bundled path
3. Add binaries to `tauri.conf.json` → `bundle.resources`

## Size Considerations

- Ollama binary: ~50MB
- Whisper.cpp: ~10MB
- TOR: ~5MB

Total bundled size: ~65MB (before models)
