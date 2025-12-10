# Regen Browser Beta User Guide

**Version**: 0.3.0 Beta  
**Date**: December 2025

---

## Welcome to Regen Browser Beta! 🚀

Thank you for being an early beta tester! Your feedback is invaluable in making Regen Browser the best AI-powered browser for India.

---

## What is Regen Browser?

Regen Browser is India's first AI-powered browser designed specifically for Indian users:

- **Offline AI**: Works without internet using local Ollama models
- **Multilingual**: Hindi-first UX with support for 22 Indian languages
- **Voice Commands**: Press `Ctrl+Space` anywhere to activate WISPR
- **Privacy-First**: Zero telemetry by default, opt-in only

---

## Quick Start

### 1. Installation

1. Download the latest beta build from the provided link
2. Install Ollama from [ollama.com](https://ollama.com/download)
3. Run: `ollama pull phi3:mini` (one-time setup)
4. Launch Regen Browser

### 2. First Launch

- **Onboarding Tour**: Complete the guided tour to learn the basics
- **Voice Setup**: Grant microphone permissions when prompted
- **Language Selection**: Choose your preferred language (Hindi/English)

### 3. Basic Usage

**Voice Commands**:

- Press `Ctrl+Space` anywhere
- Say: "Research Bitcoin" or "NIFTY kharido 50"
- Review and edit the command before execution

**Modes**:

- **Browse**: Standard browsing with AI enhancements
- **Research**: AI-powered research with citations
- **Trade**: Stock market charts and analysis
- **Docs**: Document editing and collaboration

---

## Key Features to Test

### 1. Voice Commands (WISPR)

**Test Scenarios**:

- [ ] Hindi voice commands ("Bitcoin kya hai?")
- [ ] English voice commands ("Research Tesla")
- [ ] Mixed language commands
- [ ] Voice command editing before execution

**What to Report**:

- Accuracy of voice recognition
- Response time
- Any failures or errors

### 2. Research Mode

**Test Scenarios**:

- [ ] Research queries in Hindi
- [ ] Research queries in English
- [ ] Scrape current page ("Summarize this page")
- [ ] Check citations and sources

**What to Report**:

- Quality of research results
- Speed of responses
- Accuracy of citations
- Any missing features

### 3. Trade Mode

**Test Scenarios**:

- [ ] View NIFTY 50 chart
- [ ] View other Indian stocks
- [ ] Voice commands for trading ("Show RELIANCE chart")
- [ ] Check real-time data updates

**What to Report**:

- Chart loading speed
- Data accuracy
- UI responsiveness
- Any missing stocks or features

### 4. Tab Management

**Test Scenarios**:

- [ ] Open 50+ tabs
- [ ] Drag and reorder tabs
- [ ] Close and reopen browser (check persistence)
- [ ] Search tabs using GVE

**What to Report**:

- Tab persistence after reload
- Performance with many tabs
- Any crashes or errors
- Memory usage

### 5. Offline Functionality

**Test Scenarios**:

- [ ] Disconnect internet
- [ ] Try voice commands offline
- [ ] Try research queries offline
- [ ] Reconnect and verify sync

**What to Report**:

- Offline functionality works
- Sync after reconnect
- Any data loss
- Performance offline vs online

---

## Known Issues (Beta)

1. **Linux**: Microphone icon may ghost during voice (platform-specific)
2. **Windows**: Build size is ~150MB (optimization in progress)
3. **Network**: Some features may be slow on 3G networks
4. **GPU**: GPU detection not yet implemented (CPU-only for now)

---

## How to Report Issues

### Bug Reports

**Include**:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- System info (OS, version)

**Report via**:

- Google Form: [Link to be provided]
- Discord: [Link to be provided]
- Email: beta@regenbrowser.com

### Feature Requests

**Include**:

- Feature description
- Use case
- Why it's important
- Any mockups or examples

---

## Feedback Priorities

### High Priority

- Crashes or data loss
- Voice recognition failures
- Performance issues
- UI/UX problems

### Medium Priority

- Feature requests
- Minor bugs
- UI improvements
- Documentation issues

### Low Priority

- Nice-to-have features
- Cosmetic improvements
- Future enhancements

---

## Testing Schedule

### Week 1: Initial Testing

- [ ] Install and setup
- [ ] Complete onboarding
- [ ] Test all modes
- [ ] Report initial feedback

### Week 2: Daily Usage

- [ ] Use for 1 hour/day
- [ ] Test on different networks
- [ ] Test offline functionality
- [ ] Report bugs and issues

### Week 3: Deep Testing

- [ ] Test edge cases
- [ ] Test with many tabs
- [ ] Test collaboration features
- [ ] Final feedback

---

## Support

**Need Help?**

- Discord: [Link to be provided]
- Email: beta@regenbrowser.com
- Documentation: [Link to be provided]

**Weekly Check-ins**:

- Optional video calls for feedback
- Schedule: [To be announced]

---

## Privacy & Data

- **Zero Telemetry**: No data is sent by default
- **Opt-in Only**: Enable Sentry error tracking in Settings → Safety
- **Local-First**: All data stays on your device
- **No Tracking**: No ads, no tracking, no data collection

---

## Thank You! 🙏

Your feedback helps make Regen Browser better for everyone. We appreciate your time and input!

**Questions?** Don't hesitate to reach out.

---

_Last Updated: December 10, 2025_  
_Beta Version: 0.3.0_
