/**
 * Skill Sandbox Environment
 * Secure execution environment for skills
 */

import type { Skill } from './types';

/**
 * Sandbox security policies
 */
export interface SandboxPolicy {
  allowNetwork?: boolean;
  allowStorage?: boolean;
  allowClipboard?: boolean;
  allowDOM?: boolean;
  allowedOrigins?: string[];
  maxExecutionTime?: number; // ms
}

/**
 * Default sandbox policy
 */
const DEFAULT_POLICY: SandboxPolicy = {
  allowNetwork: false,
  allowStorage: false,
  allowClipboard: false,
  allowDOM: false,
  allowedOrigins: [],
  maxExecutionTime: 5000, // 5 seconds
};

/**
 * Create sandbox environment for skill execution
 */
export function createSandbox(skill: Skill, policy: SandboxPolicy = DEFAULT_POLICY) {
  const sandbox = {
    // Limited global objects
    console: {
      log: (...args: any[]) => console.log(`[Sandbox:${skill.id}]`, ...args),
      error: (...args: any[]) => console.error(`[Sandbox:${skill.id}]`, ...args),
      warn: (...args: any[]) => console.warn(`[Sandbox:${skill.id}]`, ...args),
    },

    // Limited utilities
    utils: {
      // Date operations
      now: () => Date.now(),

      // String operations
      escapeHtml: (str: string) => {
        const map: Record<string, string> = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        };
        return str.replace(/[&<>"']/g, m => map[m]);
      },

      // JSON operations
      parse: (str: string) => JSON.parse(str),
      stringify: (obj: any) => JSON.stringify(obj),
    },

    // Skill-specific data
    skill: {
      id: skill.id,
      name: skill.manifest.name,
      settings: skill.settings,
    },
  };

  // Add network access if allowed
  if (policy.allowNetwork) {
    (sandbox as any).fetch = createSecureFetch(skill.id, policy);
  }

  // Add storage access if allowed
  if (policy.allowStorage) {
    (sandbox as any).storage = createSecureStorage(skill.id);
  }

  // Add clipboard access if allowed
  if (policy.allowClipboard) {
    (sandbox as any).clipboard = {
      read: () => navigator.clipboard.readText(),
      write: (text: string) => navigator.clipboard.writeText(text),
    };
  }

  // Add DOM access if allowed (limited)
  if (policy.allowDOM) {
    (sandbox as any).dom = createSecureDOM(skill.id);
  }

  return sandbox;
}

/**
 * Create secure fetch function
 */
function createSecureFetch(skillId: string, policy: SandboxPolicy): typeof fetch {
  return async (input: RequestInfo | URL, options?: RequestInit) => {
    // Validate origin
    const urlString =
      typeof input === 'string' || input instanceof URL ? input.toString() : String(input);

    if (policy.allowedOrigins && policy.allowedOrigins.length > 0) {
      const urlObj = new URL(urlString);
      const isAllowed = policy.allowedOrigins.some(
        origin => urlObj.origin === origin || urlObj.origin.endsWith(origin)
      );

      if (!isAllowed) {
        throw new Error(`Origin ${urlObj.origin} not allowed`);
      }
    }

    // Execute fetch
    return fetch(urlString, options);
  };
}

/**
 * Create secure storage interface
 */
function createSecureStorage(skillId: string) {
  const prefix = `skill-${skillId}-`;

  return {
    get: (key: string) => {
      try {
        const value = localStorage.getItem(prefix + key);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    },

    set: (key: string, value: any) => {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove: (key: string) => {
      try {
        localStorage.removeItem(prefix + key);
        return true;
      } catch {
        return false;
      }
    },

    clear: () => {
      try {
        const keys = Object.keys(localStorage);
        keys.filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/**
 * Create secure DOM interface
 */
function createSecureDOM(_skillId: string) {
  return {
    // Read-only operations
    querySelector: (selector: string) => {
      // This would be restricted to safe selectors
      return document.querySelector(selector);
    },

    getTextContent: (selector: string) => {
      const el = document.querySelector(selector);
      return el?.textContent || null;
    },

    getAttribute: (selector: string, attr: string) => {
      const el = document.querySelector(selector);
      return el?.getAttribute(attr) || null;
    },
  };
}

/**
 * Execute code in sandbox with timeout
 */
export async function executeInSandbox<T>(
  code: (sandbox: any) => T | Promise<T>,
  sandbox: any,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Execution timeout'));
    }, timeout);

    try {
      let result: T | Promise<T>;

      // For v1 we disallow executing string-based code using `new Function`.
      // Callers must pass a function `(sandbox) => {}` which operates against the provided sandbox.
      if (typeof code !== 'function') {
        throw new Error('String-based sandbox execution disabled; pass a function instead');
      }

      result = code(sandbox);

      if (result instanceof Promise) {
        result
          .then(value => {
            clearTimeout(timer);
            resolve(value);
          })
          .catch(error => {
            clearTimeout(timer);
            reject(error);
          });
      } else {
        clearTimeout(timer);
        resolve(result);
      }
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}
