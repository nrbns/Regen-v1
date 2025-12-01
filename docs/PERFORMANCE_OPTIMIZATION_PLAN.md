# Performance Optimization Plan

**Date:** December 1, 2025  
**Focus:** Realtime updates, GVE lag, lag reduction, and polish

---

## 🎯 Priority Order

### Phase 1: Lag Reduction (Highest Impact) ✅

1. **Aggressive Tab Hibernation** - Reduce thresholds, unload on blur
2. **Optimize Tauri IPC** - Use sync calls where possible
3. **Memory Limits** - Auto-disable vision mode under 2GB RAM

### Phase 2: Realtime Updates (High Impact)

4. **WebSocket/SSE Upgrade** - Replace polling with realtime streaming
5. **Request Caching** - Add Redis/IndexedDB caching with TTL

### Phase 3: GVE Performance (Medium Impact)

6. **Vector Caching** - Cache embeddings in IndexedDB
7. **Web Workers** - Move vector ops off main thread

### Phase 4: Polish (Lower Priority)

8. **Settings UI** - Full settings interface
9. **Bookmarks & Workspaces** - Add persistence

---

## 📋 Implementation Status

- [ ] Phase 1: Lag Reduction
- [ ] Phase 2: Realtime Updates
- [ ] Phase 3: GVE Performance
- [ ] Phase 4: Polish

---

**Starting with Phase 1 - Lag Reduction**
