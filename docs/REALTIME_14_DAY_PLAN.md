## Regen 14-Day Real-Time Execution Plan

This is a strict, execution-only plan. Follow in order.

### Day 1 - Instant UI reaction
- Ensure every user action creates a visible task immediately.
- No UI waits for AI/network/filesystem.

### Day 2 - TaskManager gate
- Identify all execution entry points.
- Route everything through `TaskManager`.

### Day 3 - Task lifecycle enforcement
- Standardize task states: CREATED -> RUNNING -> DONE/FAILED/CANCELED.
- Make UI show every transition.

### Day 4 - Stream state (not just output)
- Emit step/progress updates for tasks.
- Wire progress into task UI.

### Day 5 - True cancel (part 1)
- Add cancellation tokens per task.
- Executors check token frequently.

### Day 6 - True cancel (part 2)
- Verify cancel stops work immediately.
- Ensure canceled tasks never continue.

### Day 7 - Tabs baseline
- Open/close/switch/reload stable.
- Tasks survive tab switching.

### Day 8 - Center screen never empty
- Always show web content, new tab, or idle message.
- Remove blank canvas states.

### Day 9 - Megan event-only
- Megan reacts to events only.
- Remove auto-observe/auto-act behaviors.

### Day 10 - Delete fake features
- Remove "coming soon", background observers, magic wording.
- Hide unfinished UI that lies.

### Day 11 - Freeze recovery
- Watchdog for stuck tasks.
- Mark FAILED and keep UI responsive.

### Day 12 - Crash handling
- Kill frozen execution safely.
- Ensure state is consistent post-crash.

### Day 13 - 3-4 hour soak
- Multi-tab, multi-task, long session.
- Fix only freezes, lies, delays, cancel failures.

### Day 14 - Final real-time checklist
- UI reacts instantly.
- Tasks appear immediately.
- State updates stream.
- Cancel always works.
- Tabs feel normal.
- Tasks survive tab switching.
- Screen is never empty.
- Megan never auto-acts.
- App survives hours of use.
