/**
 * Action Executor - Safely executes parsed actions on the DOM
 * PR: Agent system core component
 */

import type { ParsedAction } from './intentParser';
import type { PageSnapshot } from './domAnalyzer';
import { findElementBySelector } from './domAnalyzer';

export interface ExecutionResult {
  ok: boolean;
  action: ParsedAction;
  error?: string;
  info?: any;
  duration: number;
}

export interface ExecutionOptions {
  stopOnError?: boolean;
  delayBetween?: number;
  onProgress?: (index: number, result: ExecutionResult) => void;
}

/**
 * Execute a single action
 */
export async function execAction(
  action: ParsedAction,
  snapshot?: PageSnapshot
): Promise<ExecutionResult> {
  const startTime = performance.now();

  try {
    let result: any;

    switch (action.kind) {
      case 'click':
        result = await executeClick(action, snapshot);
        break;
      case 'type':
        result = await executeType(action, snapshot);
        break;
      case 'scroll':
        result = await executeScroll(action);
        break;
      case 'navigate':
        result = await executeNavigate(action);
        break;
      case 'extract':
        result = await executeExtract(action, snapshot);
        break;
      case 'wait':
        result = await executeWait(action);
        break;
      case 'screenshot':
        result = await executeScreenshot();
        break;
      default:
        throw new Error(`Unknown action kind: ${action.kind}`);
    }

    const duration = performance.now() - startTime;

    return {
      ok: true,
      action,
      info: result,
      duration,
    };
  } catch (error) {
    const duration = performance.now() - startTime;

    return {
      ok: false,
      action,
      error: (error as Error).message,
      duration,
    };
  }
}

/**
 * Execute multiple actions in sequence
 */
export async function execActions(
  actions: ParsedAction[],
  snapshot?: PageSnapshot,
  options: ExecutionOptions = {}
): Promise<ExecutionResult[]> {
  const {
    stopOnError = false,
    delayBetween = 500,
    onProgress,
  } = options;

  const results: ExecutionResult[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const result = await execAction(action, snapshot);

    results.push(result);
    onProgress?.(i, result);

    if (!result.ok && stopOnError) {
      break;
    }

    // Delay between actions
    if (i < actions.length - 1 && delayBetween > 0) {
      await new Promise(resolve => setTimeout(resolve, delayBetween));
    }
  }

  return results;
}

/**
 * Execute click action
 */
async function executeClick(action: ParsedAction, snapshot?: PageSnapshot): Promise<any> {
  if (!action.selector) {
    throw new Error('Click action requires selector');
  }

  const element = findElementBySelector(action.selector, snapshot);

  if (!element) {
    throw new Error(`Element not found: ${action.selector}`);
  }

  // Scroll into view
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await new Promise(resolve => setTimeout(resolve, 300));

  // Click
  (element as HTMLElement).click();

  return { selector: action.selector, clicked: true };
}

/**
 * Execute type action
 */
async function executeType(action: ParsedAction, snapshot?: PageSnapshot): Promise<any> {
  if (!action.selector) {
    throw new Error('Type action requires selector');
  }

  if (!action.text && !action.value) {
    throw new Error('Type action requires text or value');
  }

  const { findElementBySelector } = await import('./domAnalyzer');
  const element = findElementBySelector(action.selector, snapshot) as HTMLInputElement | HTMLTextAreaElement;

  if (!element) {
    throw new Error(`Input element not found: ${action.selector}`);
  }

  // Focus
  element.focus();
  await new Promise(resolve => setTimeout(resolve, 100));

  // Clear and type
  element.value = '';
  const text = action.text || action.value || '';
  
  // Simulate typing character by character for better compatibility
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));

  return { selector: action.selector, text, typed: true };
}

/**
 * Execute scroll action
 */
async function executeScroll(action: ParsedAction): Promise<any> {
  const direction = action.value?.toLowerCase() || 'down';
  const amount = parseInt(action.metadata?.amount || '500', 10);

  if (direction === 'down') {
    window.scrollBy({ top: amount, behavior: 'smooth' });
  } else if (direction === 'up') {
    window.scrollBy({ top: -amount, behavior: 'smooth' });
  } else if (direction === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (direction === 'bottom') {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  return { direction, scrolled: true };
}

/**
 * Execute navigate action
 */
async function executeNavigate(action: ParsedAction): Promise<any> {
  if (!action.url) {
    throw new Error('Navigate action requires URL');
  }

  window.location.href = action.url;

  return { url: action.url, navigated: true };
}

/**
 * Execute extract action
 */
async function executeExtract(action: ParsedAction, snapshot?: PageSnapshot): Promise<any> {
  if (!action.selector) {
    // Extract all text from page
    return {
      text: document.body.innerText,
      extracted: true,
    };
  }

  const element = findElementBySelector(action.selector, snapshot);

  if (!element) {
    throw new Error(`Element not found: ${action.selector}`);
  }

  return {
    selector: action.selector,
    text: element.textContent || (element instanceof HTMLElement ? element.innerText : ''),
    html: element.innerHTML,
    extracted: true,
  };
}

/**
 * Execute wait action
 */
async function executeWait(action: ParsedAction): Promise<any> {
  const duration = parseInt(action.value || action.metadata?.duration || '1000', 10);
  await new Promise(resolve => setTimeout(resolve, duration));

  return { waited: duration };
}

/**
 * Execute screenshot action
 */
async function executeScreenshot(): Promise<any> {
  // Use html2canvas or similar library if available
  // For now, return a placeholder
  return {
    screenshot: 'data:image/png;base64,...', // Placeholder
    captured: true,
  };
}
