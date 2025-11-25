/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REDIX_CORE_URL?: string;
  readonly VITE_REDIX_WS_URL?: string;
  readonly OPENAI_API_KEY?: string;
  readonly ANTHROPIC_API_KEY?: string;
  readonly BING_API_KEY?: string;
  readonly OLLAMA_BASE_URL?: string;
  readonly HUGGINGFACE_API_KEY?: string;
  readonly SENTRY_DSN?: string;
  readonly NODE_ENV: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
