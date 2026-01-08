# Regen Real-Time AI Setup & Demo Guide

## 🚀 QUICK START (5 minutes)

### 1. Install llama.cpp

```bash
# Clone and build llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make

# Download a small model (Qwen 2.5 1.5B)
mkdir -p ../models
wget -O ../models/qwen2.5-1.5b.gguf \
  https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_0.gguf
```

### 2. Start Regen

```bash
cd Regenbrowser
npm run dev:web
```

### 3. Test Real-Time AI

1. Open browser to `http://localhost:5173`
2. Select any text on the page
3. Watch the **Intent Badge** appear instantly
4. See **Task** created immediately
5. Watch **Output stream** live
6. Check **Logs** for decisions
7. **Cancel** anytime

---

## 🎥 DEMO SCRIPT (5-7 minutes)

### Scene 1: Normal Browser
- Load any article (news, blog, etc.)
- Show normal browsing experience

### Scene 2: Trigger Intelligence
- Select paragraph of text
- **Intent Badge** appears instantly: `Intent: ANALYZE_SELECTION`
- **Task** appears in list: `RUNNING`

### Scene 3: Real-Time Proof
- **Output streams** word-by-word
- **Logs show**: "Using local GGUF model"
- **CPU bar moves** during processing
- **Model indicator**: `Local (fast, private)`

### Scene 4: Control & Interrupt
- Click **Cancel** → Task stops immediately
- Click **Retry** → New task starts
- Show **Pause/Resume** if running long

### Scene 5: Multiple Tasks
- Start several tasks simultaneously
- Show task list managing multiple operations
- Demonstrate interruptibility

---

## ✅ SUCCESS CHECKLIST

- [ ] UI reacts in <100ms to user actions
- [ ] No frozen screens or loading spinners
- [ ] Output appears incrementally (not all at once)
- [ ] Logs visible and informative
- [ ] Model status shows "Local" or "Online"
- [ ] Cancel/Pause/Resume work instantly
- [ ] Multiple tasks can run simultaneously

---

## 🔧 TROUBLESHOOTING

### If llama.cpp not working:
- The system falls back to simulation
- Model status shows "Local" but uses mock responses
- Still demonstrates real-time streaming architecture

### If UI not updating:
- Check browser console for task events
- Verify preload script loaded
- Check network panel for IPC events

### Performance issues:
- Reduce model size (try 0.5B parameter models)
- Check CPU usage in task manager
- Close other applications

---

## 🏗️ ARCHITECTURE OVERVIEW

```
User Action → Intent Detection → Task Creation → Agent Runtime → Streaming UI

Components:
├── AgentRuntime (core/agent/) - Execution orchestration
├── AgentContext (core/agent/) - Browser state capture
├── AgentRouter (core/agent/) - Model selection
├── LocalLLM (core/ai/offline/) - llama.cpp integration
├── TaskManager (core/execution/) - Event-driven task system
├── Zustand Store (state/) - Reactive UI state
├── RealTimePanel (components/) - Live streaming UI
└── IPC Bridge (electron/) - Cross-process communication
```

---

## 🚀 NEXT STEPS

Once this demo works perfectly:

1. **Add more agents** (web search, code analysis, etc.)
2. **Expand offline models** (specialized GGUF models)
3. **Add cloud fallback** (GPT-4 for complex tasks)
4. **Performance optimization** (model quantization, caching)
5. **User customization** (model selection, parameters)

But first: **Make this demo flawless.** The real-time streaming experience is what makes Regen feel like AI, not just a tool.
