/**
 * External APIs Configuration
 * Defines available external APIs for different modes
 */

export type OmniMode = 'research' | 'trade' | 'threat' | 'image';

export type AuthType = 'apiKey' | 'oauth' | 'none';

export interface ExternalAPI {
  id: string;
  name: string;
  description: string;
  mode: OmniMode | OmniMode[];
  authType: AuthType;
  baseUrl?: string;
  docsUrl?: string;
  authEnvKey?: string;
  rateLimitPerMin?: number;
}

export const EXTERNAL_APIS: ExternalAPI[] = [
  // Research mode APIs
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models for research and analysis',
    mode: 'research',
    authType: 'apiKey',
    authEnvKey: 'OPENAI_API_KEY',
    docsUrl: 'https://platform.openai.com/docs',
    rateLimitPerMin: 60,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models for research',
    mode: 'research',
    authType: 'apiKey',
    authEnvKey: 'ANTHROPIC_API_KEY',
    docsUrl: 'https://docs.anthropic.com',
    rateLimitPerMin: 50,
  },
  // Trade mode APIs
  {
    id: 'alpaca',
    name: 'Alpaca',
    description: 'Stock trading API',
    mode: 'trade',
    authType: 'apiKey',
    authEnvKey: 'ALPACA_API_KEY',
    docsUrl: 'https://alpaca.markets/docs',
  },
  // Threat mode APIs
  {
    id: 'virustotal',
    name: 'VirusTotal',
    description: 'Threat intelligence API',
    mode: 'threat',
    authType: 'apiKey',
    authEnvKey: 'VIRUSTOTAL_API_KEY',
    docsUrl: 'https://developers.virustotal.com',
    rateLimitPerMin: 4,
  },
  // Image mode APIs
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Image generation API',
    mode: 'image',
    authType: 'apiKey',
    authEnvKey: 'STABILITY_API_KEY',
    docsUrl: 'https://platform.stability.ai/docs',
  },
];

export interface DefaultEnabledApis {
  research: string[];
  trade: string[];
  threat: string[];
  image: string[];
}

export function getDefaultEnabledApis(): DefaultEnabledApis {
  return {
    research: [],
    trade: [],
    threat: [],
    image: [],
  };
}

export function getApiById(apiId: string): ExternalAPI | undefined {
  return EXTERNAL_APIS.find(api => api.id === apiId);
}

export function getApisForMode(mode: OmniMode): ExternalAPI[] {
  return EXTERNAL_APIS.filter(
    api => api.mode === mode || (Array.isArray(api.mode) && api.mode.includes(mode))
  );
}
