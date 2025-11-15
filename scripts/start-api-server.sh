#!/bin/bash
# Start API Server from project root
# This ensures Python can find the apps.api module

echo "Starting OmniBrowser API Server..."
echo "Running from: $(pwd)"

# Check if we're in the project root
if [ ! -f "apps/api/main.py" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Start the server
python -m uvicorn apps.api.main:app --reload --port 8000


