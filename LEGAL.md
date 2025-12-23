# Legal - Model Licenses & Usage

This document lists all AI models and libraries used by Regen Browser, along with their licenses and usage terms.

## AI Models & Libraries

### Ollama (Local LLM)

- **License**: MIT License
- **Repository**: https://github.com/ollama/ollama
- **Usage**: Local LLM inference, offline AI capabilities
- **Models Used**:
  - `phi3:mini` - MIT License
  - `llava:7b` - MIT License
  - `qwen2.5` - Apache 2.0 License
- **Terms**: Models run locally, no data sent to external services

### OpenAI API

- **License**: Proprietary (API Terms of Service)
- **Provider**: OpenAI
- **Usage**: Optional cloud-based LLM inference (user must provide API key)
- **Models Used**:
  - GPT-4, GPT-3.5-turbo
- **Terms**: Subject to OpenAI's Terms of Service and Privacy Policy
- **Data**: User queries sent to OpenAI when using OpenAI provider

### Anthropic Claude API

- **License**: Proprietary (API Terms of Service)
- **Provider**: Anthropic
- **Usage**: Optional cloud-based LLM inference (user must provide API key)
- **Models Used**: Claude 3 (various sizes)
- **Terms**: Subject to Anthropic's Terms of Service and Privacy Policy
- **Data**: User queries sent to Anthropic when using Claude provider

### Mistral API

- **License**: Proprietary (API Terms of Service)
- **Provider**: Mistral AI
- **Usage**: Optional cloud-based LLM inference (user must provide API key)
- **Models Used**: Mistral 7B, Mixtral
- **Terms**: Subject to Mistral's Terms of Service and Privacy Policy
- **Data**: User queries sent to Mistral when using Mistral provider

### Qwen (Local/API)

- **License**: Apache 2.0 License
- **Repository**: https://github.com/QwenLM/Qwen
- **Usage**: Local or cloud-based LLM inference
- **Models Used**: Qwen2.5 (various sizes)
- **Terms**: Apache 2.0 License (permissive)

## Third-Party Libraries

### React & React DOM

- **License**: MIT License
- **Repository**: https://github.com/facebook/react

### Vite

- **License**: MIT License
- **Repository**: https://github.com/vitejs/vite

### Socket.IO

- **License**: MIT License
- **Repository**: https://github.com/socketio/socket.io

### BullMQ (Job Queue)

- **License**: MIT License
- **Repository**: https://github.com/taskforcesh/bullmq

### Redis

- **License**: BSD 3-Clause License
- **Repository**: https://github.com/redis/redis

### Fastify

- **License**: MIT License
- **Repository**: https://github.com/fastify/fastify

### TypeScript

- **License**: Apache 2.0 License
- **Repository**: https://github.com/microsoft/TypeScript

### Zustand (State Management)

- **License**: MIT License
- **Repository**: https://github.com/pmndrs/zustand

### Yjs (CRDT)

- **License**: MIT License
- **Repository**: https://github.com/yjs/yjs

## Privacy & Data Usage

### Local Models (Ollama, Qwen)

- **Data Processing**: All processing happens locally on user's device
- **Data Transmission**: No data sent to external services
- **Privacy**: Fully private, user data never leaves device

### Cloud APIs (OpenAI, Anthropic, Mistral)

- **Data Processing**: Queries sent to provider's API
- **Data Transmission**: User queries and context sent to provider
- **Privacy**: Subject to provider's privacy policy
- **Opt-in**: Users must explicitly enable and provide API keys

## User Responsibilities

1. **API Keys**: Users are responsible for managing their own API keys
2. **Terms of Service**: Users must comply with each provider's Terms of Service
3. **Rate Limits**: Users must respect API rate limits
4. **Data Privacy**: Users should review provider privacy policies before using cloud APIs

## License Compliance

Regen Browser is open-source and released under MIT License. All third-party dependencies are properly licensed and compatible with MIT License.

## Updates

This document will be updated as new models or libraries are added. Last updated: 2024-12-11

## Contact

For legal inquiries: legal@regen.browser (if applicable)
