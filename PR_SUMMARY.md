# PR Summary — Minimal Regen v1 / Docs & Heavy UI Removal

This change set prepares a minimal, privacy-first Regen v1 by removing demo/docs and neutralizing heavy AI/demo UI and services.

Key changes:
- Added a no-op framer-motion shim: `src/shims/framer-motion.tsx` and aliased in `vite.config.ts` to reduce bundle/runtime animation dependencies.
- Replaced/added minimal UI stubs for heavy components (safe-deferral pattern). Examples: `src/components/voice/VoiceControl.tsx` (stub), many originals moved to `src/_deferred/`.
- Added `src/lib/serviceGuards.ts` and gated Redis usage by env flags. Patched Redis client in `server/config/redis.js` to provide a harmless mock when `OB_DISABLE_HEAVY_SERVICES` / `DISABLE_HEAVY_SERVICES` is set.
- Guarded worker Redis usage in `workers/example.worker.ts` similarly.
- Removed the `docs/` folder and API docs to produce a smaller, focused repo for v1.
- Tests and dev server: ran `npx vitest run` (result: 348 passed, 1 skipped) and started Vite dev server (local: http://localhost:5174/).

Notes:
- Deferred originals are kept under `src/_deferred/` for easy rollback.
- To run local dev without heavy services, set `OB_DISABLE_HEAVY_SERVICES=1` (or `DISABLE_HEAVY_SERVICES=1`).
- Suggested next steps: create a git commit with these edits and open a PR; optionally prune more deferred UI files or restore selected docs.

Files added/modified (high level):
- Added: `src/shims/framer-motion.tsx`, `src/lib/serviceGuards.ts`, `PR_SUMMARY.md`
- Modified: `vite.config.ts`, `server/config/redis.js`, `workers/example.worker.ts`, many UI components (stubs/deferrals)
- Removed: `docs/` (entire folder)

If you want, I can create a single patch file, commit these changes, and prepare a PR description ready to paste into your repo host.
