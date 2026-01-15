# Regen — Experimental Real-Time Browser

> **Regen is a real-time, task-based browser focused on transparency, control, and stability.**
> This is an **experimental release** intended for real usage and feedback.

---

## Why Regen Exists

> **Regen is unique NOT because of AI, agents, models, or training.  
> Regen is unique because it enforces things other AI browsers refuse to enforce.**

Most products **could** do this.  
They **won't**, because it hurts growth and demos.

### The Core Truth

Most modern AI browsers feel powerful, but they hide what is actually happening:

* AI runs in the background
* Tasks cannot be inspected or stopped reliably
* Network usage is unclear
* Failures are hidden behind "thinking…" screens

Regen takes a different approach.

> **"Regen is a browser where AI cannot act without the user."**

Not faster AI. Not smarter AI. Not autonomous AI.  
**Restricted AI.**

That sounds weaker. It is actually stronger.

---

## Positioning, Targets, and What to Build

For a concise summary of why Regen exists, what to double down on, and who it serves, see [`docs/WHY_REGEN.md`](docs/WHY_REGEN.md).

---

## What This Release Is

**Regen v0.1 (Experimental)** is:

* A real, installable browser
* Multi-tab capable
* Usable for long sessions
* Built around a visible task system
* Designed for real-world testing

This is **not a mock, demo, or concept UI**.

---

## What Regen Is (v0.1)

* A **Chromium-based browser** (multi-tab, full navigation)
* A **real-time task execution system** (visible, cancelable, streamed)
* A **control-first AI integration** (task-based, no background execution)
* A **local-first architecture** (works offline, explicit network usage)
* A **transparent UI** (task panel always visible, system truth bar)
* A **layered execution system** (L0: Core, L1: Intelligence, L2: Agents, L3: Recovery)
* A **Megan guide system** (event-driven, explains but never executes)

---

## What Regen Is NOT (Intentionally)

* ❌ Not an autonomous AI agent
* ❌ Not a chatbot browser
* ❌ Not a finished consumer product
* ❌ Not a replacement for Chrome (yet)

### What Does NOT Make Regen Unique (Important)

These do NOT make Regen unique (and chasing them will kill you):

* ❌ Using LLMs (everyone does)
* ❌ Agents (everyone claims)
* ❌ Neo4j / graphs (overused)
* ❌ Multimodal buzzwords
* ❌ Saying "we trained our AI"

Do not fight on crowded ground.

Regen is designed to be **honest and inspectable**, not magical.

---

## The 5 Things That Make Regen Unique (Real, Defensible)

These are not buzzwords. These are **system-level differences**.

### 1️⃣ Regen Enforces a **Task Runtime** (THIS IS THE BIG ONE)

**Everyone else:**
* AI browsers = chat + hidden execution
* Agents run invisibly
* No real lifecycle

**Regen:**
* **Nothing happens unless it becomes a task**
* Tasks have: `CREATED → RUNNING → DONE / FAILED / CANCELED`
* Tasks are: visible, stoppable, auditable

👉 This turns AI from *magic* into *machinery*.

That alone makes Regen **not a wrapper**.

### 2️⃣ Regen Separates **Navigation, Execution, and Intelligence**

| Layer   | Other AI browsers | Regen             |
| ------- | ----------------- | ----------------- |
| Tabs    | Mixed with AI     | Pure navigation   |
| AI      | Acts autonomously | Tool inside tasks |
| UI      | Decorative        | Truthful          |
| Control | Weak              | Absolute          |

Most products mix everything → confusion.  
Regen separates → **clarity**.

This is **OS thinking**, not app thinking.

### 3️⃣ Regen's AI Learns **Behavior**, Not Language

* You are NOT training an LLM
* You are training:
  * how tasks should behave
  * which prompts work
  * when models fail
  * how users cancel
  * what users trust

> **Regen improves by learning execution patterns, not by sounding smarter.**

### 4️⃣ Megan is Not an Agent — She is a **System Interpreter**

**Other products:**
* AI = actor
* User = spectator

**Regen:**
* User = controller
* Tasks = actor
* Megan = interpreter

Megan: explains, previews, warns, summarizes.  
She **never acts**.

This preserves: trust, safety, professionalism.

### 5️⃣ Regen Chooses **Trust Over Growth Hacks**

Regen enforces:
* no background AI
* no silent scraping
* no hidden retries
* no fake "thinking"
* cancel always works

Big companies avoid this because it slows onboarding and reduces wow factor.  
You embrace it.

That is why Regen feels **real**, not flashy.

---

## Core Principles (Enforced in Code)

1. **Explicit Execution**
   Nothing runs unless the user triggers it.

2. **Task-Based Runtime**
   Every action becomes a task with a clear lifecycle:

   ```
   CREATED → RUNNING → DONE / FAILED / CANCELED
   ```

3. **Always Visible**
   Tasks are never hidden.

4. **Always Stoppable**
   Cancel works immediately.

5. **UI Never Lies**
   If something is idle, it says idle.
   If something fails, it shows why.

---

## Megan (System Guide)

Regen includes **Megan**, a guided interaction layer.

Megan:

* Explains what actions will do
* Reflects task state changes
* Warns about privacy or network usage
* Summarizes completed tasks

Megan **does not**:

* Start tasks
* Run in the background
* Act autonomously

Megan exists to **keep the user in control**, not replace them.

---

## AI in Regen (Honest Status)

* AI is used as a **tool**, not a decision-maker
* All AI usage is **task-based**
* No background AI execution
* No silent context scraping
* Local-first by default

Regen does **not** claim proprietary AI models.
The value is **how intelligence is controlled**, not who trained it.

---

## Privacy & Network Behavior

* No background network calls
* Network usage only happens on explicit user action
* Execution mode is always visible (Local / Online)
* System status bar reflects real CPU, RAM, and network activity

If Regen cannot guarantee privacy for an action, it blocks it.

---

## Current Limitations (Important)

This is an **experimental release**.

Known limitations:

* No account sync
* No extensions
* Limited AI actions
* Possible crashes or bugs
* UI polish is secondary to stability

These limitations are **intentional** at this stage.

---

## Who This Is For

Regen's real users:

* **Developers** (need control, hate magic)
* **Researchers** (need auditability)
* **Security teams** (need transparency)
* **Enterprise users** (need compliance)
* **Power users** (need reliability)
* **People burned by hallucinating AI** (need trust)

These users pay for **control**, not magic.

If you want AI to "just do things for you", Regen may not be for you (yet).

---

## How to Test Regen

**Quick Test (15 minutes):**

1. **Install and Start**
   ```bash
   git clone https://github.com/nrbns/Regen-v1.git
   cd Regenbrowser
   npm install
   npm run dev:tauri
   ```

2. **Basic Functionality**
   - Open 5-10 tabs
   - Navigate between tabs
   - Create a task (try summarizing a page)
   - Cancel a task mid-execution
   - Check the task panel (should always be visible)

3. **What to Look For**
   - Tasks appear instantly when created
   - Cancel button works immediately
   - Task panel shows all tasks
   - No background network calls (check system bar)
   - Megan explains actions but doesn't execute them

**Stability Test (1-2 hours):**

1. Open 20-30 tabs
2. Browse normally for 1-2 hours
3. Create tasks periodically
4. Monitor memory usage (should stay stable)
5. Report any crashes, lag, or memory growth

**What to Report:**

* Crashes (when, what were you doing)
* Lag or freezing (which actions trigger it)
* Memory leaks (RAM growing continuously)
* Tasks not canceling
* Network activity without user action
* UI confusion (what's unclear)

See [Alpha Testing Guide](./docs/ALPHA_TESTING_GUIDE.md) for detailed test procedures.

---

## How to Help

We are actively looking for:

* Bug reports
* Stability feedback
* UX clarity feedback
* Real usage observations

**What helps most:**

* Using Regen for 30–60 minutes
* Reporting where it feels confusing, slow, or fragile
* Being honest (positive or negative)

---

## Experimental Disclaimer

This software is provided **as-is**.

* Expect bugs
* Expect rough edges
* Expect change

But also expect **real behavior**, not demos.

---

## Roadmap (High Level)

* Improve browser stability
* Harden task runtime
* Expand controlled AI actions
* Optional online execution (explicit only)
* Better crash recovery

Features will only be added if they respect Regen's core principles.

---

## Philosophy

> **Regen is not unique because it does more.  
> Regen is unique because it refuses to do less safely.**

That's a rare position.  
That's a real position.  
That's a buildable position.

---

> **Most AI tools optimize for magic.  
> Regen optimizes for trust.**

Magic impresses once.  
Trust is what people rely on daily.

---

## Status

**Regen v0.1 — Experimental Real-Time Release**

This is the first step toward a controlled, transparent AI browser.

**Current Implementation Status:**

* ✅ Real-time task system (100% complete)
* ✅ Multi-tab browser core (working)
* ✅ Task enforcement (100% migrated)
* ✅ Megan guide system (event-driven, guide-only)
* ✅ System truth bar (CPU/RAM/Network/Mode)
* ✅ Crash recovery (watchdog, restart safety)
* 🚧 Stability testing (in progress)
* ⏳ Installer packaging (guides ready)

---

## For Investors / Partners

**What Regen Is:**

A real-time browser that makes AI execution **visible, controllable, and trustworthy**.

**The Problem:**

Current AI browsers hide execution, making it impossible to:
* Know what's running
* Stop unwanted actions
* Trust privacy guarantees
* Debug failures

**The Solution:**

Regen enforces **explicit execution** — nothing runs without user action, everything is visible, everything can be stopped.

**Current State:**

* **Code**: Core systems 100% implemented
* **Documentation**: Complete
* **Testing**: Alpha phase (stability testing in progress)
* **Packaging**: Guides ready, installer pending

**What's Different:**

* Not claiming proprietary AI models
* Not promising autonomous agents
* Not hiding limitations
* Focused on **control architecture**, not AI capabilities

**Market Position:**

* Privacy-first browsing (growing market)
* Developer tools (control over automation)
* Early adopter segment (values transparency)

**Ask:**

* $50-150k seed funding for:
  - Stability hardening (2-3 weeks)
  - Installer & packaging (1 week)
  - Early user outreach (ongoing)
  - Team expansion (1-2 developers)

**Traction:**

* 573+ commits
* Real-time foundation complete
* Active development
* Alpha-ready codebase

**Next Milestones:**

* Alpha release (2-3 weeks)
* 50-200 early adopters (4-6 weeks)
* Beta release (8-12 weeks)

**Contact:**

See [Project Vision](./docs/VISION.md) or reach out via GitHub.

---

### Final Note

Regen is not trying to look finished.
It is trying to be **real**.

If you are reading this and testing it — thank you.

---

## Quick Start

### Prerequisites

* Node.js 18+
* Rust 1.70+ (for Tauri desktop app)
* Ollama (optional, for local AI features)

### Installation

```bash
git clone https://github.com/nrbns/Regen-v1.git
cd Regenbrowser
npm install
```

### Development

```bash
# Start the backend server
npm run dev:backend

# Start the UI (in another terminal)
npm run dev:web

# Start the desktop app (Tauri)
npm run dev:tauri
```

### Setup Local AI (Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models (optional)
ollama pull phi3:mini
```

---

## Documentation

**Essential Guides:**
* [Alpha Launch Checklist](./docs/ALPHA_LAUNCH_CHECKLIST.md) - Complete alpha readiness checklist
* [Alpha Testing Guide](./docs/ALPHA_TESTING_GUIDE.md) - Step-by-step testing procedures
* [Alpha Build Guide](./docs/ALPHA_BUILD_GUIDE.md) - Build and packaging instructions
* [Alpha Launch Status](./docs/ALPHA_LAUNCH_STATUS.md) - Current alpha readiness status

**Architecture:**
* [Layers & Phases](./docs/LAYERS_AND_PHASES_COMPLETE.md) - Complete architecture documentation (4 interaction layers, 4 execution layers, 4 development phases)
* [Real-Time Verification](./docs/REALTIME_VERIFICATION_FINAL.md) - Code-level verification of all 10 real-time requirements

**Development:**
* [Enforcement Guide](./docs/ENFORCEMENT_GUIDE.md) - Task enforcement system guide
* [Migration Guide](./docs/MIGRATION_GUIDE.md) - Migration from direct AI calls to task-based execution

**Strategy:**
* [Positioning](./docs/POSITIONING.md) - Why Regen exists and what makes it unique

---

## License

MIT License (see LICENSE file for details)

---

**Built with discipline. Verified with code. Ready for reality.**
