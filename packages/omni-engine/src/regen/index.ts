/**
 * Regen Integration for Omni Engine
 *
 * This will be populated by moving electron/services/regen/* here
 *
 * For now, this is a placeholder that shows the structure
 */

// TODO: Move from electron/services/regen/core.ts
export { handleMessage } from './core';
export type { RegenMessage, RegenResponse } from './core';

// TODO: Move from electron/services/regen/modes/
export { handleResearchQuery } from './modes/research';
export { handleTradeQuery } from './modes/trade';

// TODO: Move from electron/services/regen/language/
export { detectLanguage } from './language/detector';
export { findCommandAction } from './language/commands';

// TODO: Move from electron/services/regen/tools/
export * as browserTools from './tools/browserTools';
export * as n8nTools from './tools/n8nTools';
export * as searchTools from './tools/searchTools';
