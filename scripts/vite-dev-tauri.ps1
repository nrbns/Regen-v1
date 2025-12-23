#!/usr/bin/env pwsh
# Vite dev server launcher for Tauri with large HTTP header support
# This script starts the Vite dev server with increased HTTP header size limits
# to prevent HTTP 431 errors when the Tauri WebView sends large headers

$env:NODE_OPTIONS = "--max-http-header-size=262144"
$env:JSDOM_NO_CANVAS = "1"

# Run vite directly with maximum header size
npx vite --mode development
