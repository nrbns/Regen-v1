# Binaries Directory

Place the following binaries in this directory:

1. **ollama.exe** - Download from https://ollama.com/download/OllamaSetup.exe (extract ollama.exe)
2. **meilisearch.exe** - Download from https://github.com/meilisearch/meilisearch/releases/latest (meilisearch-windows-amd64.exe → rename to meilisearch.exe)
3. **n8n.exe** - Download from https://github.com/n8n-io/n8n/releases/latest (n8n.exe)

These binaries will be bundled with the application and automatically copied to the app's local data directory on first run.

## For Development

In dev mode, the app will look for binaries in this folder (`src-tauri/bin/`) and copy them to the app's local data directory.

## For Production Build

The binaries will be included in the bundle resources and extracted to the app's local data directory on first launch.






