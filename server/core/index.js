/* eslint-env node */
/**
 * Core Provider Exports
 * Single entry point for all providers
 */

export { getMode, isOffline, isOnline, detectSystemCapabilities, getRecommendedModel } from './mode-manager.js';
export { getLLM } from './llm-provider.js';
export { getVisionModel } from './vision-provider.js';
export { getSTTProvider, getTTSProvider } from './voice-provider.js';
export { getSearchProvider } from './search-provider.js';

/**
 * Initialize all providers based on mode
 */
export async function initializeProviders() {
  const { getMode, detectSystemCapabilities } = await import('./mode-manager.js');
  const mode = getMode();
  const capabilities = await detectSystemCapabilities();

  console.log(`[Core] Initializing in ${mode.toUpperCase()} mode`);
  console.log(`[Core] System: ${capabilities.totalMemory / (1024**3)}GB RAM, GPU: ${capabilities.gpu ? 'Yes' : 'No'}`);

  return {
    mode,
    capabilities,
    llm: await import('./llm-provider.js').then(m => m.getLLM()),
    vision: await import('./vision-provider.js').then(m => m.getVisionModel()),
    stt: await import('./voice-provider.js').then(m => m.getSTTProvider()),
    tts: await import('./voice-provider.js').then(m => m.getTTSProvider()),
    search: await import('./search-provider.js').then(m => m.getSearchProvider()),
  };
}







