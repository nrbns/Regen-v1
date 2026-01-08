/**
 * Stagehand-style Scripting API
 * Developer-friendly automation API for all modes
 * Inspired by Stagehand: https://github.com/cloudflare/stagehand
 */

import { isV1ModeEnabled } from '../config/mvpFeatureFlags';
import { requestExecution } from '../core/executor/ExecutionGate';

/**
 * Element selector types
 */
export type Selector = string | { text?: string; role?: string; label?: string; testId?: string };

/**
 * Action types
 */
export type Action =
  | { type: 'click'; selector: Selector }
  | { type: 'type'; selector: Selector; text: string }
  | { type: 'wait'; selector: Selector; timeout?: number }
  | { type: 'scroll'; selector: Selector; direction?: 'up' | 'down' | 'left' | 'right' }
  | { type: 'screenshot'; selector?: Selector }
  | { type: 'extract'; selector: Selector; attribute?: string }
  | { type: 'navigate'; url: string }
  | { type: 'evaluate'; script: string }
  | { type: 'fill'; selector: Selector; value: string }
  | { type: 'select'; selector: Selector; value: string };

/**
 * Stagehand-style automation API
 */
export class StagehandAPI {
  private context: 'research' | 'trade' | 'agent' | 'browse' = 'browse';
  private sessionId: string;

  constructor(context: 'research' | 'trade' | 'agent' | 'browse' = 'browse', sessionId?: string) {
    this.context = context;
    this.sessionId = sessionId || `stagehand-${Date.now()}`;
  }

  /**
   * Find element by selector
   */
  private async findElement(selector: Selector): Promise<Element | null> {
    if (typeof selector === 'string') {
      // CSS selector
      return document.querySelector(selector);
    }

    // Smart selector
    if (selector.text) {
      // Find by text content
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.find(el => el.textContent?.includes(selector.text!)) || null;
    }

    if (selector.role) {
      return document.querySelector(`[role="${selector.role}"]`) || null;
    }

    if (selector.label) {
      const label = document.querySelector(`label[for="${selector.label}"]`);
      if (label) {
        const id = label.getAttribute('for');
        return id ? document.getElementById(id) : null;
      }
    }

    if (selector.testId) {
      return document.querySelector(`[data-testid="${selector.testId}"]`) || null;
    }

    return null;
  }

  /**
   * Wait for element to appear
   */
  async wait(selector: Selector, timeout: number = 5000): Promise<Element> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = await this.findElement(selector);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Element not found: ${JSON.stringify(selector)}`);
  }

  /**
   * Click element
   */
  async click(selector: Selector): Promise<void> {
    const element = await this.wait(selector);
    if (element instanceof HTMLElement) {
      element.click();
    } else {
      throw new Error('Element is not clickable');
    }
  }

  /**
   * Type text into element
   */
  async type(selector: Selector, text: string): Promise<void> {
    const element = await this.wait(selector);
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      throw new Error('Element is not an input or textarea');
    }
  }

  /**
   * Fill form field
   */
  async fill(selector: Selector, value: string): Promise<void> {
    await this.type(selector, value);
  }

  /**
   * Select option in dropdown
   */
  async select(selector: Selector, value: string): Promise<void> {
    const element = await this.wait(selector);
    if (element instanceof HTMLSelectElement) {
      element.value = value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      throw new Error('Element is not a select');
    }
  }

  /**
   * Scroll to element
   */
  async scroll(
    selector: Selector,
    _direction: 'up' | 'down' | 'left' | 'right' = 'down'
  ): Promise<void> {
    const element = await this.wait(selector);
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /**
   * Extract text or attribute from element
   */
  async extract(selector: Selector, attribute?: string): Promise<string> {
    const element = await this.wait(selector);
    if (attribute) {
      return element.getAttribute(attribute) || '';
    }
    return element.textContent || '';
  }

  /**
   * Take screenshot (returns data URL)
   */
  async screenshot(selector?: Selector): Promise<string> {
    // Use html2canvas or similar for screenshot
    const _target = selector ? await this.wait(selector) : document.body;

    // Simplified - in production, use html2canvas
    return new Promise(resolve => {
      // Placeholder - implement with html2canvas
      resolve('data:image/png;base64,placeholder');
    });
  }

  /**
   * Navigate to URL
   */
  async navigate(url: string): Promise<void> {
    window.location.href = url;
    await this.wait({ text: 'loading' }, 1000).catch(() => {});
  }

  /**
   * Evaluate JavaScript in page context
   * SECURITY: This is inherently unsafe but required for browser automation.
   * Only use with trusted scripts from the automation system.
   */
  async evaluate(script: string): Promise<any> {
    // SECURITY WARNING: Function constructor can execute arbitrary code
    // This is only safe when script comes from trusted automation system
    // In production, add additional validation/sandboxing
    if (typeof script !== 'string' || script.length > 10000) {
      throw new Error('Invalid script: too long or not a string');
    }
    // Basic validation - reject dangerous patterns
    if (script.includes('eval') || script.includes('Function') || script.includes('import')) {
      throw new Error('Invalid script: contains dangerous patterns');
    }
    // In v1-mode, disallow direct in-page evaluation for safety.
    if (isV1ModeEnabled()) {
      // Route the request through ExecutionGate for auditing; by default this will be denied.
      return requestExecution({
        type: 'automation:evaluate',
        payload: { script, context: this.context, sessionId: this.sessionId },
      });
    }

    // Non-v1 builds may still need to execute trusted scripts; use Function only when explicitly allowed.
    return new Function(script)();
  }

  /**
   * Execute sequence of actions
   */
  async sequence(actions: Action[]): Promise<any[]> {
    const results: any[] = [];
    for (const action of actions) {
      let result: any;

      switch (action.type) {
        case 'click':
          await this.click(action.selector);
          break;
        case 'type':
          await this.type(action.selector, action.text);
          break;
        case 'wait':
          await this.wait(action.selector, action.timeout);
          break;
        case 'scroll':
          await this.scroll(action.selector, action.direction);
          break;
        case 'screenshot':
          result = await this.screenshot(action.selector);
          break;
        case 'extract':
          result = await this.extract(action.selector, action.attribute);
          break;
        case 'navigate':
          await this.navigate(action.url);
          break;
        case 'evaluate':
          result = await this.evaluate(action.script);
          break;
        case 'fill':
          await this.fill(action.selector, action.value);
          break;
        case 'select':
          await this.select(action.selector, action.value);
          break;
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Get current page state
   */
  getState(): {
    url: string;
    title: string;
    context: string;
    sessionId: string;
  } {
    return {
      url: window.location.href,
      title: document.title,
      context: this.context,
      sessionId: this.sessionId,
    };
  }
}

/**
 * Create Stagehand API instance
 */
export function createStagehand(
  context: 'research' | 'trade' | 'agent' | 'browse' = 'browse',
  sessionId?: string
): StagehandAPI {
  return new StagehandAPI(context, sessionId);
}

/**
 * Global Stagehand instance (for console access)
 */
declare global {
  interface Window {
    stagehand: StagehandAPI;
  }
}

// Auto-create global instance
if (typeof window !== 'undefined') {
  window.stagehand = createStagehand('browse');
}
