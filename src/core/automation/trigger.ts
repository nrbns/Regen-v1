/**
 * Automation Trigger System
 * 
 * Listens to events and executes enabled automation rules
 * LAYER 4: Explicit, visible, cancelable automations
 */

import { regenEventBus } from '../events/eventBus';
import { automationEngine } from './engine';
import { getRulesForTrigger, type AutomationRule } from './rules';

/**
 * Initialize automation trigger system
 * Listens to events and executes enabled rules via automationEngine
 */
export function initAutomationTriggers(): () => void {
  console.log('[Automation] Trigger system initialized');

  // Listen to TAB_OPEN events
  const unsubscribeTabOpen = regenEventBus.subscribe((event) => {
    // Check for TAB_OPEN event (regenEventBus uses { type, payload } format)
    if (event.type === 'TAB_OPEN') {
      const rules = getRulesForTrigger('TAB_OPEN');
      for (const rule of rules) {
        // Extract URL from payload (can be string, object with url, or direct URL)
        const payload = typeof event.payload === 'string' 
          ? event.payload 
          : (event.payload?.url || event.payload || window.location.href);
        if (!rule.match || rule.match(payload)) {
          // Execute via automationEngine for proper tracking
          automationEngine.executeAction(rule.action, payload, rule.id).catch((error) => {
            console.error(`[Automation] Failed to execute rule ${rule.id}:`, error);
          });
        }
      }
    }
  });

  // Listen to URL_CHANGE events
  const unsubscribeUrlChange = regenEventBus.subscribe((event) => {
    // Check for URL_CHANGE event (regenEventBus uses { type, payload } format)
    if (event.type === 'URL_CHANGE') {
      const rules = getRulesForTrigger('URL_CHANGE');
      for (const rule of rules) {
        // Extract URL from payload (can be string or object)
        const payload = typeof event.payload === 'string' 
          ? event.payload 
          : (event.payload?.url || event.payload || window.location.href);
        if (!rule.match || rule.match(payload)) {
          automationEngine.executeAction(rule.action, payload, rule.id).catch((error) => {
            console.error(`[Automation] Failed to execute rule ${rule.id}:`, error);
          });
        }
      }
    }
  });

  // Listen to SCROLL_END events (from event bus)
  const unsubscribeScrollEnd = regenEventBus.subscribe((event) => {
    // Check for SCROLL_END event (regenEventBus uses { type, payload } format)
    if (event.type === 'SCROLL_END') {
      const rules = getRulesForTrigger('SCROLL_END');
      for (const rule of rules) {
        const payload = event.payload || { depth: 0.8 };
        if (!rule.match || rule.match(payload)) {
          automationEngine.executeAction(rule.action, payload, rule.id).catch((error) => {
            console.error(`[Automation] Failed to execute rule ${rule.id}:`, error);
          });
        }
      }
    }
  });

  // Listen to IDLE events
  const unsubscribeIdle = regenEventBus.subscribe((event) => {
    // Check for IDLE event (regenEventBus uses { type, payload } format)
    if (event.type === 'IDLE') {
      const rules = getRulesForTrigger('IDLE');
      for (const rule of rules) {
        // Extract duration from payload (can be number or object with duration)
        const payload = typeof event.payload === 'number' 
          ? event.payload 
          : (event.payload?.duration || event.payload || 0);
        if (!rule.match || rule.match(payload)) {
          automationEngine.executeAction(rule.action, payload, rule.id).catch((error) => {
            console.error(`[Automation] Failed to execute rule ${rule.id}:`, error);
          });
        }
      }
    }
  });

  return () => {
    unsubscribeTabOpen();
    unsubscribeUrlChange();
    unsubscribeScrollEnd();
    unsubscribeIdle();
    console.log('[Automation] Trigger system cleaned up');
  };
}
