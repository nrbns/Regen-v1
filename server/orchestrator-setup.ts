/**
 * Orchestrator Setup - Day 5
 * Registers all agent handlers with the executor
 */

import { getTaskExecutor } from '../services/agentOrchestrator/executor';
import { MailAgentHandler } from '../services/agentOrchestrator/agents/mailAgent';
import { PPTAgentHandler } from '../services/agentOrchestrator/agents/pptAgent';
import { BookingAgentHandler } from '../services/agentOrchestrator/agents/bookingAgent';
import { ResearchAgentHandler } from '../services/agentOrchestrator/agents/researchAgent';

let initialized = false;

/**
 * Setup and register all agent handlers
 */
export function setupOrchestrator() {
  if (initialized) {
    console.log('[Orchestrator] Already initialized');
    return;
  }

  console.log('[Orchestrator] Initializing agent handlers...');

  const executor = getTaskExecutor();

  // Register all agents
  executor.registerAgent('mail', new MailAgentHandler());
  console.log('[Orchestrator] ✓ Mail agent registered');

  executor.registerAgent('ppt', new PPTAgentHandler());
  console.log('[Orchestrator] ✓ PPT agent registered');

  executor.registerAgent('booking', new BookingAgentHandler());
  console.log('[Orchestrator] ✓ Booking agent registered');

  executor.registerAgent('research', new ResearchAgentHandler());
  console.log('[Orchestrator] ✓ Research agent registered');

  // Browser agent (placeholder)
  executor.registerAgent('browser', {
    execute: async (action: string, params: any) => {
      console.log(`[BrowserAgent] ${action}`, params);
      return {
        success: true,
        action,
        message: 'Browser agent not yet implemented',
      };
    },
  });
  console.log('[Orchestrator] ✓ Browser agent registered (placeholder)');

  // File agent (placeholder)
  executor.registerAgent('file', {
    execute: async (action: string, params: any) => {
      console.log(`[FileAgent] ${action}`, params);
      return {
        success: true,
        action,
        message: 'File agent not yet implemented',
      };
    },
  });
  console.log('[Orchestrator] ✓ File agent registered (placeholder)');

  // Trading agent (placeholder - requires security)
  executor.registerAgent('trading', {
    execute: async (action: string, params: any) => {
      console.log(`[TradingAgent] ${action}`, params);
      return {
        success: true,
        action,
        message: 'Trading agent not yet implemented (requires 2FA)',
      };
    },
  });
  console.log('[Orchestrator] ✓ Trading agent registered (placeholder)');

  // General agent (fallback)
  executor.registerAgent('general', {
    execute: async (action: string, params: any) => {
      console.log(`[GeneralAgent] ${action}`, params);
      return {
        success: true,
        action,
        params,
        message: 'General agent handled request',
      };
    },
  });
  console.log('[Orchestrator] ✓ General agent registered (fallback)');

  initialized = true;
  console.log('[Orchestrator] ✅ All agents registered and ready!');
}

/**
 * Get orchestrator health status
 */
export function getOrchestratorHealth() {
  return {
    initialized,
    timestamp: new Date(),
    agents: [
      'mail',
      'ppt',
      'booking',
      'research',
      'browser',
      'file',
      'trading',
      'general',
    ],
  };
}

export default setupOrchestrator;
