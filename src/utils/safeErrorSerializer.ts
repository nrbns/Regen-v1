/**
 * Safe Error Serializer
 * Handles circular references and React/DOM elements when serializing errors
 */

/**
 * Get a safe string representation of an error
 */
export function safeErrorString(error: unknown): string {
  if (error === null || error === undefined) {
    return String(error);
  }

  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    try {
      // Try to serialize with circular reference handling
      return JSON.stringify(error, getCircularReplacer(), 2);
    } catch {
      // If that fails, try to extract useful info
      try {
        const errorObj = error as Record<string, unknown>;
        const safeObj: Record<string, unknown> = {};

        for (const key in errorObj) {
          if (Object.prototype.hasOwnProperty.call(errorObj, key)) {
            const value = errorObj[key];
            if (isSafeValue(value)) {
              safeObj[key] = value;
            } else if (value instanceof Error) {
              safeObj[key] = `${value.name}: ${value.message}`;
            } else if (typeof value === 'object' && value !== null) {
              // Skip circular references and React/DOM elements
              if (isReactElement(value) || isDOMElement(value)) {
                safeObj[key] = `[${getTypeName(value)}]`;
              } else {
                try {
                  safeObj[key] = JSON.stringify(value, getCircularReplacer(), 2);
                } catch {
                  safeObj[key] = `[${getTypeName(value)}]`;
                }
              }
            } else {
              safeObj[key] = String(value);
            }
          }
        }

        return JSON.stringify(safeObj, null, 2);
      } catch {
        return `[Object: ${getTypeName(error)}]`;
      }
    }
  }

  return String(error);
}

/**
 * Check if a value is safe to serialize
 */
function isSafeValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return true;
  if (Array.isArray(value)) {
    return value.every(isSafeValue);
  }
  if (typeof value === 'object') {
    // Check for React elements
    if (isReactElement(value)) return false;
    // Check for DOM elements
    if (isDOMElement(value)) return false;
    // Check for functions
    if (typeof value === 'function') return false;
  }
  return false;
}

/**
 * Check if value is a React element
 */
function isReactElement(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.$$typeof !== undefined ||
    obj._reactInternalFiber !== undefined ||
    obj._reactInternalInstance !== undefined ||
    obj.__reactInternalInstance !== undefined
  );
}

/**
 * Check if value is a DOM element
 */
function isDOMElement(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  return (
    value instanceof HTMLElement ||
    value instanceof Element ||
    value instanceof Node ||
    typeof (value as any).nodeType === 'number'
  );
}

/**
 * Get type name of a value
 */
function getTypeName(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') {
    if (Array.isArray(value)) return 'Array';
    if (value.constructor) return value.constructor.name;
    return 'Object';
  }
  return typeof value;
}

/**
 * Circular reference replacer for JSON.stringify
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);

      // Skip React elements
      if (isReactElement(value)) {
        return '[ReactElement]';
      }

      // Skip DOM elements
      if (isDOMElement(value)) {
        return '[DOMElement]';
      }

      // Skip functions
      if (typeof value === 'function') {
        return '[Function]';
      }
    }
    return value;
  };
}
