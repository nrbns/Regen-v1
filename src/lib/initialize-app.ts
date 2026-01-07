/**
 * Application Initialization
 * Ensures all AI features, UI components, and browser integrations are properly connected
 */

import { agentApi, researchApi } from './api-client';
import { markBackendAvailable, markBackendUnavailable } from './backend-status';

const API_BASE_URL =
  typeof window !== 'undefined'
    ? (window as any).__API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000'
    : import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

export interface InitializationStatus {
  agentClient: boolean;
  apiClient: boolean;
  backendConnection: boolean;
  researchApi: boolean;
  agentApi: boolean;
  browserIntegration: boolean;
}

let initializationStatus: InitializationStatus = {
  agentClient: false,
  apiClient: false,
  backendConnection: false,
  researchApi: false,
  agentApi: false,
  browserIntegration: false,
};

/**
 * Check if backend is available
 */
async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      markBackendAvailable();
      return true;
    }
  } catch (error) {
    markBackendUnavailable(error);
    console.warn('[Init] Backend not available:', error);
  }
  return false;
}

/**
 * Verify agent client is initialized
 */
function verifyAgentClient(): boolean {
  if (typeof window === 'undefined') return false;

  const agent = (window as any).agent;
  const hasRequiredMethods =
    agent &&
    typeof agent.start === 'function' &&
    typeof agent.stop === 'function' &&
    typeof agent.runs === 'function' &&
    typeof agent.getRun === 'function';

  if (!hasRequiredMethods) {
    console.warn('[Init] Agent client not properly initialized');
    return false;
  }

  return true;
}

/**
 * Verify API client is available
 */
function verifyApiClient(): boolean {
  try {
    return !!agentApi && !!researchApi;
  } catch (error) {
    console.warn('[Init] API client not available:', error);
    return false;
  }
}

/**
 * Verify browser integration
 */
function verifyBrowserIntegration(): boolean {
  if (typeof window === 'undefined') return false;

  // Check if we're in a browser environment
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const hasLocalStorage = typeof localStorage !== 'undefined';

  return hasWindow && hasDocument && hasLocalStorage;
}

/**
 * Initialize all connections
 */
export async function initializeApp(): Promise<InitializationStatus> {
  console.log('[Init] Starting application initialization...');

  // 1. Verify browser integration
  initializationStatus.browserIntegration = verifyBrowserIntegration();
  if (!initializationStatus.browserIntegration) {
    console.error('[Init] Browser integration check failed');
    return initializationStatus;
  }
  console.log('[Init] ✓ Browser integration verified');

  // 2. Verify API client
  initializationStatus.apiClient = verifyApiClient();
  if (!initializationStatus.apiClient) {
    console.error('[Init] API client not available');
    return initializationStatus;
  }
  console.log('[Init] ✓ API client verified');

  // 3. Verify agent client
  initializationStatus.agentClient = verifyAgentClient();
  if (!initializationStatus.agentClient) {
    console.warn('[Init] ⚠ Agent client not initialized - will retry');
    // Retry after a short delay (agent-client might still be loading)
    await new Promise(resolve => setTimeout(resolve, 500));
    initializationStatus.agentClient = verifyAgentClient();
  }
  if (initializationStatus.agentClient) {
    console.log('[Init] ✓ Agent client verified');
  } else {
    console.warn('[Init] ⚠ Agent client still not available');
  }

  // 4. Check backend connection
  initializationStatus.backendConnection = await checkBackendConnection();
  if (initializationStatus.backendConnection) {
    console.log('[Init] ✓ Backend connection verified');
  } else {
    console.warn('[Init] ⚠ Backend not available - some features may not work');
  }

  // 5. Verify research API
  initializationStatus.researchApi = !!researchApi;
  if (initializationStatus.researchApi) {
    console.log('[Init] ✓ Research API verified');
  }

  // 6. Verify agent API
  initializationStatus.agentApi = !!agentApi;
  if (initializationStatus.agentApi) {
    console.log('[Init] ✓ Agent API verified');
  }

  // Summary
  const allCritical =
    initializationStatus.browserIntegration &&
    initializationStatus.apiClient &&
    initializationStatus.agentClient;

  if (allCritical) {
    console.log('[Init] ✅ Application initialization complete');
  } else {
    console.warn('[Init] ⚠ Some components not initialized');
  }

  // Store status globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).__APP_INIT_STATUS = initializationStatus;
  }

  return initializationStatus;
}

/**
 * Get current initialization status
 */
export function getInitializationStatus(): InitializationStatus {
  return { ...initializationStatus };
}

/**
 * Check if app is fully initialized
 */
export function isAppInitialized(): boolean {
  return (
    initializationStatus.browserIntegration &&
    initializationStatus.apiClient &&
    initializationStatus.agentClient
  );
}

// Auto-initialize when module loads (in browser)
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => initializeApp(), 100);
    });
  } else {
    setTimeout(() => initializeApp(), 100);
  }
}
