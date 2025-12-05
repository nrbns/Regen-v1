# Project Architecture

## Overview

This document describes the overall architecture of the Omnibrowser project.

## Directory Structure

```
Omnibrowser/
├── architecture/          # Architecture scripts and documentation
│   ├── setup/            # Initialization scripts
│   ├── analysis/         # Analysis tools
│   ├── deployment/       # Deployment scripts
│   ├── monitoring/       # Health checks
│   ├── docs/            # Architecture docs
│   └── utils/           # Shared utilities
├── src/                  # Frontend source code
├── server/               # Backend server code
├── scripts/              # General utility scripts
├── docs/                 # Project documentation
└── tests/                # Test files
```

## Architecture Principles

1. **Separation of Concerns**: Clear separation between frontend, backend, and infrastructure
2. **Modularity**: Components are organized into logical modules
3. **Scalability**: Architecture supports horizontal and vertical scaling
4. **Maintainability**: Code is organized for easy maintenance and updates

## Components

### Frontend (`src/`)
- React-based UI components
- State management with Zustand
- TypeScript for type safety

### Backend (`server/`)
- Fastify-based API server
- Real-time WebSocket support
- Service-oriented architecture

### Scripts (`scripts/` & `architecture/`)
- Organized by purpose
- Reusable utilities
- Automated workflows

## Scripts Organization

Architecture scripts are organized by purpose:

- **Setup**: Initialization and configuration
- **Analysis**: Code and performance analysis
- **Deployment**: Deployment validation and automation
- **Monitoring**: Health checks and metrics
- **Utils**: Shared utilities

## Usage

Run architecture scripts from the project root:

```bash
# Initialize architecture
node architecture/setup/init-architecture.js

# Analyze structure
node architecture/analysis/analyze-structure.js

# Check deployment readiness
node architecture/deployment/deploy-check.js

# Run health check
node architecture/monitoring/health-check.js
```

