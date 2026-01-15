## Why Regen

Regen is the controlled-execution browser. Other browsers let AI act; Regen makes AI ask.

### What it means
- Every AI action is visible, logged, and cancellable.
- No silent background work.
- Tabs and tasks stay honest: if something isn’t running, it says so.

### Who it’s for
- Developers and researchers who need traceability, not magic.
- Privacy- and security-conscious users who demand proof of what runs.
- Teams that need auditability and hard stops.

### What you get
- Task lifecycle you can see and stop.
- Navigation and tabs that behave like a real browser first.
- No hallucinated “help”—the AI explains, you approve.

### What you won’t get
- Autonomous surprises.
- Hidden agents.
- Flashy demos that break under load.

### One-line answer to “Why Regen?”
Because Regen treats AI like code execution: explicit, auditable, and always under your control.

---

## Feature Comparison: Build vs Drop

**Build (double down)**
- Controlled execution pipeline: all actions flow through TaskManager; hard cancel.
- Transparent navigation/tabs: reliable tab open/close/switch; clear loading/idle states.
- Evented AI with consent: AI can suggest; user approves; never auto-acts.
- Audit & logs: per-action logging; visible status; no silent background jobs.
- Recovery & long-session stability: survive 2–4h sessions; restart and resume safely.
- Context with proof: context collection only from explicit events; user-visible.

**Drop/Defer**
- Autonomous agents and auto-observe modes.
- New modes/skills/integrations that aren’t required for alpha stability.
- Visual flourish panels that don’t improve trust or control.
- Advanced analytics dashboards; keep a simple system bar for now.
- “Wow” demos optimized for hype over correctness.

**Neutral/Maybe Later**
- Enterprise policy hooks (after alpha stability).
- Third-party AI backends beyond the one stable path you harden first.
- Complex multi-profile/multi-tenant features.

---

## Target vs Non-Target Checklist (for site/onboarding)

**Target**
- Developers who want deterministic, cancellable execution.
- Researchers who need step-by-step reasoning and logs.
- Privacy/security-minded users who require “no silent background work.”
- Teams that care about auditability and controllable AI.

**Non-target**
- Casual consumers looking for “AI does everything for me.”
- Demo-first/hype-driven users who value flash over control.
- Users who expect autonomous browsing/automation without approval.
- Productivity-chasers who prefer maximal automation to explicit consent.

**Onboarding guardrails**
- Emphasize: “AI suggests, you approve.”
- Show cancel/stop prominently.
- Surface a short “What Regen will not do” list: no silent actions, no auto-run, no hidden tabs/tasks.
- Default to conservative settings (no background runs, no auto-observe).
