/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REDIX_CORE_URL?: string;
  readonly VITE_REDIX_WS_URL?: string;
  readonly VITE_REDIX_HTTP_URL?: string;
  readonly VITE_REDIX_SSE_URL?: string;
  readonly VITE_DISABLE_REDIX?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_ANTHROPIC_API_KEY?: string;
  readonly VITE_MISTRAL_API_KEY?: string;
  readonly VITE_OLLAMA_BASE_URL?: string;
  readonly VITE_OPENAI_BASE_URL?: string;
  readonly VITE_BING_API_KEY?: string;
  readonly VITE_BHASHINI_API_KEY?: string;
  readonly VITE_N8N_BASE_URL?: string;
  readonly VITE_N8N_WEBHOOK_URL?: string;
  readonly VITE_N8N_API_KEY?: string;
  readonly VITE_SEARCH_PROXY_URL?: string;
  readonly VITE_TRADE_API_BASE?: string;
  readonly VITE_TRADE_API_KEY?: string;
  readonly VITE_METRICS_INTERVAL_MS?: string;
  readonly VITE_MEILI_URL?: string;
  readonly VITE_MEILI_MASTER_KEY?: string;
  readonly OPENAI_API_KEY?: string;
  readonly ANTHROPIC_API_KEY?: string;
  readonly MISTRAL_API_KEY?: string;
  readonly OLLAMA_BASE_URL?: string;
  readonly OPENAI_BASE_URL?: string;
  readonly BING_API_KEY?: string;
  readonly BHASHINI_API_KEY?: string;
  readonly N8N_BASE_URL?: string;
  readonly N8N_WEBHOOK_URL?: string;
  readonly N8N_API_KEY?: string;
  readonly DISABLE_REDIX?: string;
  readonly DEV?: boolean;
  readonly NODE_ENV?: 'development' | 'production' | 'test';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
