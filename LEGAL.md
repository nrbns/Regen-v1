# Legal & License Compliance

**Regen Browser - Third-Party Licenses & Compliance**

---

## AI Models & Licenses

### Ollama Models

Regen Browser uses Ollama to run AI models locally. The following models are supported:

1. **phi3:mini** (Microsoft)
   - License: MIT
   - Commercial Use: ✅ Allowed
   - Source: https://ollama.com/library/phi3:mini

2. **llava:7b** (LLaVA Team)
   - License: Apache 2.0
   - Commercial Use: ✅ Allowed
   - Source: https://ollama.com/library/llava

### OpenAI API (Optional)

- Used only if `OPENAI_API_KEY` is provided
- Subject to OpenAI Terms of Service
- Commercial use allowed per OpenAI's terms
- User's API key, user's responsibility

### Anthropic API (Optional)

- Used only if `ANTHROPIC_API_KEY` is provided
- Subject to Anthropic Terms of Service
- Commercial use allowed per Anthropic's terms
- User's API key, user's responsibility

---

## Third-Party Dependencies

### Core Dependencies

- **Tauri** - Apache 2.0 / MIT
- **React** - MIT
- **Fastify** - MIT
- **Socket.IO** - MIT
- **BullMQ** - MIT
- **Redis** - BSD 3-Clause
- **Ollama** - MIT

### Search Engines

- **DuckDuckGo API** - Free, no API key required
- **Startpage** - Free, no API key required
- **Bing API** - Requires API key (user-provided)

---

## Commercial Usage

✅ **All components used in Regen Browser are suitable for commercial use**:

- All AI models (phi3:mini, llava) are MIT/Apache 2.0 licensed
- All core dependencies are MIT/Apache 2.0 licensed
- Search APIs are free for commercial use
- Optional paid APIs (OpenAI, Anthropic) require user's own API keys

---

## User Data & Privacy

- **100% Offline AI**: User data never leaves device when using Ollama
- **Optional APIs**: User must provide their own API keys
- **No Tracking**: Zero telemetry by default (opt-in only)
- **Local Storage**: All data stored locally

---

## Compliance Notes

1. **GDPR**: Compliant (no data collection, local storage only)
2. **DPDP (India)**: Compliant (privacy-first design)
3. **CCPA**: Compliant (no data sharing)

---

## Attribution

This project uses the following open-source components:

- Ollama (MIT) - https://ollama.com
- Tauri (Apache 2.0 / MIT) - https://tauri.app
- React (MIT) - https://react.dev
- Fastify (MIT) - https://fastify.dev

---

## Questions?

For license questions, contact: [Your Contact]

---

_Last Updated: December 2025_
