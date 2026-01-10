/**
 * Tool Guard - Security system for tool execution
 * Implements allowlist-based tool execution with permission prompts
 */

export type ToolCategory = 
  | 'browser'      // Browser navigation, scraping
  | 'search'       // Web search, information retrieval
  | 'ai'          // AI tasks (summarize, analyze)
  | 'workspace'   // Workspace operations (save, read)
  | 'system'      // System operations (filesystem, network) - RESTRICTED
  | 'exec'        // Command execution - HIGHLY RESTRICTED
  | 'unknown';    // Unknown tools - BLOCKED

export interface ToolPermission {
  tool: string;
  category: ToolCategory;
  requiresExplicitConsent: boolean;
  allowed: boolean;
  reason?: string;
}

export interface ToolExecutionRequest {
  tool: string;
  input: Record<string, any>;
  context?: {
    userId?: string;
    sessionId?: string;
    tabId?: string;
  };
}

export interface ToolExecutionResult {
  allowed: boolean;
  requiresConsent: boolean;
  permission?: ToolPermission;
  error?: string;
}

/**
 * Audit Entry - Represents a single audit log entry
 */
export interface AuditEntry {
  timestamp: number;
  tool: string;
  inputPreview: string;
  decision: {
    allowed: boolean;
    reason: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    consentRequired: boolean;
    consentGranted: boolean;
  };
  context: Record<string, any>;
}

/**
 * Tool Allowlist - Only explicitly allowed tools can execute
 */
const TOOL_ALLOWLIST: Record<string, ToolCategory> = {
  // Browser tools - Safe, limited scope
  'navigate': 'browser',
  'scrape': 'browser',
  'getDom': 'browser',
  'clickElement': 'browser',
  'scroll': 'browser',
  
  // Search tools - Safe, read-only
  'search': 'search',
  'hybridSearch': 'search',
  'semanticSearch': 'search',
  'research': 'search',
  
  // AI tools - Safe, no side effects
  'summarize': 'ai',
  'analyze': 'ai',
  'translate': 'ai',
  'chat': 'ai',
  
  // Workspace tools - Safe, local storage only
  'saveToWorkspace': 'workspace',
  'readFromWorkspace': 'workspace',
  'deleteFromWorkspace': 'workspace',
};

/**
 * Tools that require explicit user consent
 */
const CONSENT_REQUIRED_TOOLS: Set<string> = new Set([
  'scrape',           // Scraping user data
  'saveToWorkspace',  // Saving user content
  'deleteFromWorkspace', // Deleting user content
]);

/**
 * Tools that are completely blocked
 */
const BLOCKED_TOOLS: Set<string> = new Set([
  'exec',            // System command execution
  'execSync',        // Synchronous command execution
  'spawn',           // Process spawning
  'fork',            // Process forking
  'eval',            // Code evaluation
  'writeFile',       // File writing (use workspace instead)
  'readFile',        // File reading (use workspace instead)
  'deleteFile',      // File deletion
  'accessFileSystem', // Filesystem access
  'networkRequest',  // Direct network requests (use API client)
]);

/**
 * Tool Guard - Evaluates tool execution requests
 */
class ToolGuard {
  private consentHistory: Map<string, boolean> = new Map(); // Track user consent decisions
  private auditLog: Array<{ timestamp: number; tool: string; allowed: boolean; reason: string }> = [];

  /**
   * Check if a tool can be executed
   */
  async checkPermission(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const { tool, input, context } = request;

    // 1. Check if tool is blocked
    if (BLOCKED_TOOLS.has(tool)) {
      const result: ToolExecutionResult = {
        allowed: false,
        requiresConsent: false,
        permission: {
          tool,
          category: 'exec',
          requiresExplicitConsent: false,
          allowed: false,
          reason: `Tool "${tool}" is blocked for security reasons`,
        },
        error: `Tool "${tool}" is blocked for security reasons`,
      };
      this.logAudit(tool, false, result.error);
      return result;
    }

    // 2. Check if tool is in allowlist
    const category = TOOL_ALLOWLIST[tool];
    if (!category) {
      const result: ToolExecutionResult = {
        allowed: false,
        requiresConsent: false,
        permission: {
          tool,
          category: 'unknown',
          requiresExplicitConsent: false,
          allowed: false,
          reason: `Tool "${tool}" is not in the allowlist`,
        },
        error: `Tool "${tool}" is not allowed. Only whitelisted tools can execute.`,
      };
      this.logAudit(tool, false, result.error);
      return result;
    }

    // 3. Check if tool requires explicit consent
    const requiresConsent = CONSENT_REQUIRED_TOOLS.has(tool) || category === 'system' || category === 'exec';
    
    if (requiresConsent) {
      // Check if user has already consented to this tool in this session
      const consentKey = `${tool}:${JSON.stringify(input)}`;
      if (!this.consentHistory.has(consentKey)) {
        const result: ToolExecutionResult = {
          allowed: false,
          requiresConsent: true,
          permission: {
            tool,
            category,
            requiresExplicitConsent: true,
            allowed: false,
            reason: `Tool "${tool}" requires explicit user consent`,
          },
          error: `Tool "${tool}" requires explicit user consent`,
        };
        this.logAudit(tool, false, 'Consent required');
        return result;
      }
    }

    // 4. Tool is allowed
    const result: ToolExecutionResult = {
      allowed: true,
      requiresConsent: requiresConsent,
      permission: {
        tool,
        category,
        requiresExplicitConsent: requiresConsent,
        allowed: true,
        reason: `Tool "${tool}" is allowed`,
      },
    };
    this.logAudit(tool, true, 'Execution allowed');
    return result;
  }

  /**
   * Request user consent for a tool
   */
  async requestConsent(request: ToolExecutionRequest): Promise<boolean> {
    const { tool, input } = request;
    const consentKey = `${tool}:${JSON.stringify(input)}`;
    
    // In a real implementation, this would show a permission prompt to the user
    // For now, we'll emit an event that the UI can listen to
    if (typeof window !== 'undefined') {
      const consentEvent = new CustomEvent('tool:consent:request', {
        detail: {
          tool,
          input,
          consentKey,
        },
      });
      window.dispatchEvent(consentEvent);
      
      // Wait for user response (this is a simplified implementation)
      // In production, this should use a proper async consent dialog
      return new Promise((resolve) => {
        const handleConsent = (e: CustomEvent) => {
          if (e.detail.consentKey === consentKey) {
            window.removeEventListener('tool:consent:response', handleConsent as EventListener);
            const granted = e.detail.granted === true;
            if (granted) {
              this.consentHistory.set(consentKey, true);
            }
            resolve(granted);
          }
        };
        window.addEventListener('tool:consent:response', handleConsent as EventListener);
        
        // Timeout after 30 seconds
        setTimeout(() => {
          window.removeEventListener('tool:consent:response', handleConsent as EventListener);
          resolve(false);
        }, 30000);
      });
    }
    
    return false;
  }

  /**
   * Record user consent decision
   */
  recordConsent(tool: string, input: Record<string, any>, granted: boolean): void {
    const consentKey = `${tool}:${JSON.stringify(input)}`;
    this.consentHistory.set(consentKey, granted);
    this.logAudit(tool, granted, granted ? 'Consent granted' : 'Consent denied');
  }

  /**
   * Execute tool with guard (main entry point)
   */
  async executeTool<T = any>(
    tool: string,
    input: Record<string, any>,
    executor: (input: Record<string, any>) => Promise<T>,
    context?: ToolExecutionRequest['context']
  ): Promise<T> {
    const request: ToolExecutionRequest = { tool, input, context };
    
    // Check permission
    const permission = await this.checkPermission(request);
    
    if (!permission.allowed) {
      // If consent is required, request it
      if (permission.requiresConsent) {
        const consentGranted = await this.requestConsent(request);
        if (!consentGranted) {
          throw new Error(`Tool "${tool}" execution denied: User did not grant consent`);
        }
        // Re-check permission after consent
        const recheck = await this.checkPermission(request);
        if (!recheck.allowed) {
          throw new Error(`Tool "${tool}" execution denied: ${recheck.error}`);
        }
      } else {
        throw new Error(`Tool "${tool}" execution denied: ${permission.error}`);
      }
    }

    // Execute tool
    try {
      const result = await executor(input);
      this.logAudit(tool, true, 'Execution completed');
      return result;
    } catch (error) {
      this.logAudit(tool, false, `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Log audit entry
   * FIX: Now uses persistent AuditLogManager instead of in-memory only
   */
  private logAudit(tool: string, allowed: boolean, reason: string): void {
    // Legacy in-memory log (for backward compatibility)
    this.auditLog.push({
      timestamp: Date.now(),
      tool,
      allowed,
      reason,
    });
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // FIX: Use persistent AuditLogManager for long-term storage
    // Import dynamically to avoid circular dependencies
    import('./AuditLog').then(({ auditLogManager }) => {
      auditLogManager.addEntry({
        timestamp: Date.now(),
        tool,
        inputPreview: '',
        decision: {
          allowed,
          reason,
          risk: 'low', // TODO: Determine risk from tool category
          consentRequired: false,
          consentGranted: allowed,
        },
        context: {},
      });
    }).catch((error) => {
      console.warn('[ToolGuard] Failed to add entry to AuditLogManager:', error);
    });
  }

  /**
   * Get audit log (now from persistent storage)
   */
  getAuditLog(limit: number = 100): Array<{ timestamp: number; tool: string; allowed: boolean; reason: string }> {
    // Return from persistent storage if available
    try {
      const { auditLogManager } = require('./AuditLog');
      const persistentEntries = auditLogManager.getEntries({ limit });
      return persistentEntries.map(entry => ({
        timestamp: entry.timestamp,
        tool: entry.tool,
        allowed: entry.decision.allowed,
        reason: entry.decision.reason || '',
      }));
    } catch {
      // Fallback to in-memory log
      return [...this.auditLog].slice(-limit);
    }
  }
}

// Singleton instance
export const toolGuard = new ToolGuard();
