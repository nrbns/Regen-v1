/**
 * Safe Action Execution System
 * User-controlled, safe, predictable action execution
 */
class SafeActionExecutor {
    pendingConsents = new Map();
    consentHistory = [];
    /**
     * Execute action with safety checks
     */
    async execute(action, options) {
        const actionId = action.id || `action-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        // Check if action requires consent
        if (action.requiresConsent && !options?.autoApprove) {
            const approved = options?.onConsentRequired
                ? await options.onConsentRequired(action)
                : await this.requestConsent(action, actionId);
            if (!approved) {
                return {
                    success: false,
                    error: 'Action rejected by user',
                    actionId,
                };
            }
            // Record consent
            this.consentHistory.push({
                actionId,
                approved: true,
                timestamp: Date.now(),
            });
        }
        // Validate action
        const validation = this.validateAction(action);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error || 'Invalid action',
                actionId,
            };
        }
        // Execute action
        try {
            const result = await this.executeAction(action, actionId);
            return {
                success: true,
                result,
                actionId,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Action execution failed',
                actionId,
            };
        }
    }
    /**
     * Execute multiple actions in sequence
     */
    async executeBatch(actions, options) {
        const results = [];
        const stopOnError = options?.stopOnError ?? true;
        for (const action of actions) {
            const result = await this.execute(action, {
                autoApprove: options?.autoApprove,
                onConsentRequired: options?.onConsentRequired,
            });
            results.push(result);
            if (!result.success && stopOnError) {
                break;
            }
        }
        return results;
    }
    /**
     * Request user consent for action
     */
    async requestConsent(action, actionId) {
        return new Promise(resolve => {
            // Store consent resolver
            this.pendingConsents.set(actionId, resolve);
            // Emit consent request event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('action-consent-required', {
                    detail: { action, actionId },
                }));
            }
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.pendingConsents.has(actionId)) {
                    this.pendingConsents.delete(actionId);
                    resolve(false);
                }
            }, 30000);
        });
    }
    /**
     * Approve action consent
     */
    approveConsent(actionId) {
        const resolver = this.pendingConsents.get(actionId);
        if (resolver) {
            resolver(true);
            this.pendingConsents.delete(actionId);
        }
    }
    /**
     * Reject action consent
     */
    rejectConsent(actionId) {
        const resolver = this.pendingConsents.get(actionId);
        if (resolver) {
            resolver(false);
            this.pendingConsents.delete(actionId);
        }
    }
    /**
     * Validate action before execution
     */
    validateAction(action) {
        // Check required fields
        if (!action.type) {
            return { valid: false, error: 'Action type is required' };
        }
        // Validate action-specific args
        switch (action.type) {
            case 'navigate':
                if (!action.args.url || typeof action.args.url !== 'string') {
                    return { valid: false, error: 'Navigate action requires url' };
                }
                // Validate URL
                try {
                    new URL(action.args.url);
                }
                catch {
                    return { valid: false, error: 'Invalid URL' };
                }
                break;
            case 'click':
            case 'type':
                if (!action.args.selector || typeof action.args.selector !== 'string') {
                    return { valid: false, error: `${action.type} action requires selector` };
                }
                break;
            case 'open_tab':
                if (!action.args.url || typeof action.args.url !== 'string') {
                    return { valid: false, error: 'Open tab action requires url' };
                }
                break;
            case 'fill_form':
                if (!action.args.formId || typeof action.args.formId !== 'string') {
                    return { valid: false, error: 'Fill form action requires formId' };
                }
                if (!action.args.data || typeof action.args.data !== 'object') {
                    return { valid: false, error: 'Fill form action requires data' };
                }
                break;
        }
        return { valid: true };
    }
    /**
     * Execute action
     */
    async executeAction(action, actionId) {
        // Use Tauri invoke for safe execution
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('execute_actions', {
                    actions: [action],
                    actionId,
                });
                return result;
            }
            catch (error) {
                throw new Error(`Tauri execution failed: ${error.message}`);
            }
        }
        // Fallback: HTTP API
        try {
            const response = await fetch('http://127.0.0.1:4000/api/actions/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions: [action], actionId }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`HTTP execution failed: ${error.message}`);
        }
    }
    /**
     * Get consent history
     */
    getConsentHistory() {
        return [...this.consentHistory];
    }
    /**
     * Clear consent history
     */
    clearConsentHistory() {
        this.consentHistory = [];
    }
}
// Singleton instance
export const safeActionExecutor = new SafeActionExecutor();
// Listen for consent responses
if (typeof window !== 'undefined') {
    window.addEventListener('action-consent-approved', ((event) => {
        safeActionExecutor.approveConsent(event.detail.actionId);
    }));
    window.addEventListener('action-consent-rejected', ((event) => {
        safeActionExecutor.rejectConsent(event.detail.actionId);
    }));
}
