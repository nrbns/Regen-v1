# Omnibrowser Tauri Backend

This directory contains the Rust backend for the Omnibrowser Tauri desktop application.

## Structure

- `src/main.rs` - Main application entry point and Tauri setup
- `src/commands.rs` - IPC commands exposed to React frontend
- `src/handlers.rs` - Business logic and event handlers
- `src/state.rs` - Application state management
- `src/ipc.rs` - IPC message types and handlers
- `Cargo.toml` - Rust dependencies and package configuration

## Building

```bash
# Development
cargo build

# Release
cargo build --release
```

## Architecture

The Rust backend uses Tauri's IPC layer to communicate with the React frontend in `/src`. Key commands:

- `search()` - Route search queries to appropriate agents
- `fetch_agent()` - Load agent configurations
- `execute_booking()` - Execute booking transactions
- `generate_presentation()` - PPT generation via PPT agent
- `send_mail()` - Email sending via Mail agent

## Integration Path

1. Keep existing `/server` Node.js services for now (compatibility)
2. Gradually migrate service logic from Node.js to Rust modules
3. Replace Node.js services with Rust equivalents in phases
