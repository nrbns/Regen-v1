/**
 * AI Configuration
 * 
 * User-configurable settings for AI timeouts and retries
 */

export interface AIConfig {
  /** Default timeout in milliseconds */
  defaultTimeout: number;
  /** Default max retries */
  defaultMaxRetries: number;
  /** Default retry delay in milliseconds */
  defaultRetryDelay: number;
  /** Use exponential backoff for retries */
  useExponentialBackoff: boolean;
  /** Timeouts per action type */
  timeouts: Record<string, number>;
  /** Max retries per action type */
  maxRetries: Record<string, number>;
}

const DEFAULT_CONFIG: AIConfig = {
  defaultTimeout: 10000,
  defaultMaxRetries: 3,
  defaultRetryDelay: 1000,
  useExponentialBackoff: true,
  timeouts: {
    'pattern-detection': 5000,
    'command': 10000,
    'automation': 30000,
    'idle-trigger': 8000,
  },
  maxRetries: {
    'pattern-detection': 2,
    'command': 3,
    'automation': 2,
    'idle-trigger': 3,
  },
};

let currentConfig: AIConfig = { ...DEFAULT_CONFIG };

/**
 * Get current AI configuration
 */
export function getAIConfig(): AIConfig {
  return { ...currentConfig };
}

/**
 * Update AI configuration
 */
export function updateAIConfig(updates: Partial<AIConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...updates,
    timeouts: {
      ...currentConfig.timeouts,
      ...(updates.timeouts || {}),
    },
    maxRetries: {
      ...currentConfig.maxRetries,
      ...(updates.maxRetries || {}),
    },
  };

  // Persist to localStorage
  try {
    localStorage.setItem('regen_ai_config', JSON.stringify(currentConfig));
    console.log('[AIConfig] Configuration updated');
  } catch (error) {
    console.warn('[AIConfig] Failed to save configuration:', error);
  }
}

/**
 * Load AI configuration from localStorage
 */
export function loadAIConfig(): void {
  try {
    const stored = localStorage.getItem('regen_ai_config');
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AIConfig>;
      currentConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        timeouts: {
          ...DEFAULT_CONFIG.timeouts,
          ...(parsed.timeouts || {}),
        },
        maxRetries: {
          ...DEFAULT_CONFIG.maxRetries,
          ...(parsed.maxRetries || {}),
        },
      };
      console.log('[AIConfig] Configuration loaded from storage');
    }
  } catch (error) {
    console.warn('[AIConfig] Failed to load configuration:', error);
    currentConfig = { ...DEFAULT_CONFIG };
  }
}

/**
 * Reset to default configuration
 */
export function resetAIConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
  try {
    localStorage.removeItem('regen_ai_config');
    console.log('[AIConfig] Configuration reset to defaults');
  } catch (error) {
    console.warn('[AIConfig] Failed to reset configuration:', error);
  }
}

/**
 * Get timeout for action type
 */
export function getTimeoutForActionType(actionType: string): number {
  return currentConfig.timeouts[actionType] || currentConfig.defaultTimeout;
}

/**
 * Get max retries for action type
 */
export function getMaxRetriesForActionType(actionType: string): number {
  return currentConfig.maxRetries[actionType] || currentConfig.defaultMaxRetries;
}

// Load configuration on module load
if (typeof window !== 'undefined') {
  loadAIConfig();
}
