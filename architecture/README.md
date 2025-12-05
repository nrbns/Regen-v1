# Architecture Scripts

This directory contains architecture-related scripts organized by purpose.

## Directory Structure

```
architecture/
├── setup/          # Setup and initialization scripts
├── analysis/       # Analysis and diagnostic scripts
├── deployment/     # Deployment related scripts
├── monitoring/     # Monitoring and health check scripts
├── docs/          # Architecture documentation
└── utils/         # Utility scripts
```

## Script Categories

### Setup (`setup/`)
Scripts for initializing and setting up the project architecture.

### Analysis (`analysis/`)
Scripts for analyzing code, performance, and architecture patterns.

### Deployment (`deployment/`)
Scripts for deploying and managing deployments.

### Monitoring (`monitoring/`)
Scripts for monitoring system health, performance, and metrics.

### Documentation (`docs/`)
Architecture documentation and diagrams.

### Utilities (`utils/`)
Shared utility scripts used across different architectural concerns.

## Usage

Each subdirectory contains scripts specific to its purpose. Refer to individual script files for usage instructions.

## Quick Fix for Service Issues

If AI Agent or Research features are not working:

```bash
# Run the fix script
npm run arch:fix

# Or directly
node architecture/fix-services.js
```

This will:
- Check if the server is running
- Verify API endpoints
- Start the server if needed
- Diagnose connection issues
- Provide fix recommendations

