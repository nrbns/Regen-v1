# Regen Memory Directory

This directory stores all markdown memory files for real-time event-driven updates.

- Any file added, changed, or removed here will trigger a real-time event to the backend event bus and UI/AI/automation via WebSocket.
- No polling, no database sync loops.
- This is the single source of truth for memory.
