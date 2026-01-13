# Regen Quick Start Guide

**Version:** 1.0  
**Date:** January 13, 2026

Get started with Regen in 5 minutes.

---

## 🚀 Installation

### Prerequisites
- Node.js 18+
- Rust 1.70+ (for Tauri desktop app)
- 4GB+ RAM (recommended)

### Quick Install

```bash
# Clone the repository
git clone https://github.com/nrbns/Regen-v1.git
cd Regenbrowser

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🎯 First Steps

### 1. Onboarding Tour

On first launch, Regen will show an interactive tour:
- **Welcome** - Introduction to Regen
- **AI Toggle** - How to control AI (silent mode)
- **Realtime Features** - Pattern detection
- **Privacy** - Local-first design
- **Settings** - Customization options

**Skip the tour?** Click "Skip Tour" or close the window.

---

### 2. AI Toggle

**Location:** Top-right navigation bar (brain icon)

**What it does:**
- Click to toggle AI on/off
- **Active** (purple): AI observes and suggests
- **Silenced** (gray): AI disabled for maximum performance

**When to use:**
- Silence AI when you need maximum performance
- Enable AI for intelligent browsing assistance

---

### 3. Settings

**Access:** Click gear icon (⚙️) in top-right → Settings

**Key Settings:**

#### System Tab
- **AI Performance Control** - Toggle AI silence
- **Local AI Setup (Ollama)** - Set up local AI models
- **Performance Benchmarks** - Test your device performance

#### Appearance Tab
- Theme (dark/light/system)
- Layout preferences

#### Safety Tab
- Privacy mode
- Ad blocker settings

---

## 🧠 Local AI Setup (Ollama)

### Option 1: Quick Setup Wizard

1. Open **Settings** → **System** tab
2. Scroll to **"Local AI Setup (Ollama)"**
3. Follow the wizard:
   - Install Ollama (if needed)
   - Start Ollama service
   - Download recommended model (phi3:mini)

### Option 2: Manual Setup

```bash
# Install Ollama
# Windows: Download from https://ollama.com/download
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve

# Download model (in another terminal)
ollama pull phi3:mini
```

---

## ⚡ Performance Tips

### For Low-Resource Devices (4GB RAM)

1. **Silence AI** when not needed (click brain icon)
2. **Enable Low-Data Mode** in Settings → System
3. **Close unused tabs** regularly
4. **Run benchmarks** to check performance (Settings → System)

### Benchmark Your Device

1. Open **Settings** → **System** tab
2. Scroll to **"Performance Benchmarks"**
3. Click **"Run Benchmarks"**
4. Review results:
   - **80%+ score**: Excellent performance
   - **60-80%**: Good performance
   - **<60%**: Consider optimizing

---

## 🎨 Key Features

### Realtime Intelligence

Regen automatically detects:
- **Redundant tabs** - Same domain opened multiple times
- **Search loops** - Repeated searches
- **Long scrolls** - Deep reading on articles
- **Idle time** - Extended inactivity

**AI suggests actions only when useful** - no interruptions.

### Privacy First

- **Local-first** - Everything runs on your device
- **Offline-ready** - Works without internet
- **No tracking** - No data exfiltration
- **Transparent** - All AI actions visible

### Event-Driven Architecture

- **Instant UI reactions** - No lag
- **Error recovery** - Automatic retry
- **Throttling** - Prevents CPU spikes
- **Metrics** - Dev mode dashboard

---

## 🛠️ Development

### Run in Dev Mode

```bash
npm run dev
```

**Dev Mode Features:**
- Realtime metrics dashboard (bottom-right)
- Hot module reloading
- Debug console
- Performance monitoring

### Build for Production

```bash
# Web build
npm run build

# Desktop app (Tauri)
npm run build:app

# Windows installer
npm run build:windows:installer
```

---

## 📚 Common Tasks

### Toggle AI Silent Mode
- Click brain icon in navigation bar
- Or: Settings → System → AI Performance Control

### Set Up Local AI
- Settings → System → Local AI Setup (Ollama)
- Follow wizard or install manually

### Check Performance
- Settings → System → Performance Benchmarks
- Click "Run Benchmarks"

### Join Beta Program
- Navigate to `/beta` route
- Or: Settings → Account → Beta Program

### Reset Onboarding Tour
- Settings → System → Reset Onboarding
- (Or clear localStorage: `regen:onboarding:completed`)

---

## 🐛 Troubleshooting

### AI Toggle Not Working
- Check console for errors
- Verify settings store is initialized
- Try refreshing the page

### Ollama Not Detected
- Ensure Ollama is installed
- Check if `ollama serve` is running
- Verify port 11434 is accessible

### Performance Issues
- Run benchmarks to identify bottlenecks
- Silence AI for maximum performance
- Enable Low-Data Mode
- Close unused tabs

### Metrics Dashboard Not Showing
- Ensure running in dev mode (`npm run dev`)
- Check `import.meta.env.DEV` is true
- Verify component is in AppShell

---

## 📖 Learn More

- **Full Documentation**: See `docs/` directory
- **Architecture**: `docs/architecture/`
- **API Reference**: `docs/architecture/API_DOCUMENTATION.md`
- **Investor Info**: `docs/INVESTORS.md`

---

## 💬 Support

- **GitHub Issues**: [Report bugs](https://github.com/nrbns/Regen-v1/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nrbns/Regen-v1/discussions)
- **Beta Program**: Join at `/beta` route

---

## 🎯 Next Steps

1. ✅ Complete onboarding tour
2. ✅ Set up local AI (Ollama)
3. ✅ Run performance benchmarks
4. ✅ Explore settings
5. ✅ Start browsing!

**Welcome to Regen!** 🚀

---

**Last updated:** January 13, 2026
