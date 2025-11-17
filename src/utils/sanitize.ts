const CONTROL_CHAR_PATTERN = /[\p{Cc}]/gu;
/**
 * Security Utilities - XSS Protection and Input Sanitization
 * 
 * Provides comprehensive sanitization for HTML, URLs, and user input
 * to prevent XSS attacks and injection vulnerabilities.
 */

import DOMPurify, { Config } from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Uses DOMPurify with strict configuration
 */
export function sanitizeHtml(html: string, options?: {
  allowImages?: boolean;
  allowLinks?: boolean;
  allowTables?: boolean;
}): string {
  const config: Config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  };

  // Allow images if requested
  if (options?.allowImages) {
    config.ALLOWED_TAGS!.push('img');
    config.ALLOWED_ATTR!.push('src', 'alt', 'title');
  }

  // Allow links if requested
  if (options?.allowLinks) {
    config.ALLOWED_TAGS!.push('a');
    config.ALLOWED_ATTR!.push('href', 'title', 'target');
    // Sanitize href attributes to prevent javascript: and data: URLs
    config.ALLOW_DATA_ATTR = false;
  }

  // Allow tables if requested
  if (options?.allowTables) {
    config.ALLOWED_TAGS!.push('table', 'thead', 'tbody', 'tr', 'th', 'td');
  }

  return DOMPurify.sanitize(html, config) as string;
}

/**
 * Sanitize plain text by escaping HTML entities
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validate and sanitize URLs
 * Only allows http:// and https:// protocols
 * 
 * @throws Error if URL is invalid or uses disallowed protocol
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol: ${parsed.protocol}. Only http:// and https:// are allowed.`);
    }

    // Block javascript: and data: URLs (shouldn't reach here, but double-check)
    if (parsed.href.toLowerCase().startsWith('javascript:') || 
        parsed.href.toLowerCase().startsWith('data:')) {
      throw new Error('JavaScript and data URLs are not allowed');
    }

    // Limit URL length to prevent DoS
    if (parsed.href.length > 2048) {
      throw new Error('URL exceeds maximum length of 2048 characters');
    }

    return parsed.href;
  } catch (error) {
    if (error instanceof TypeError) {
      // Invalid URL format
      throw new Error(`Invalid URL format: ${url}`);
    }
    throw error;
  }
}

/**
 * Validate URL without throwing (returns boolean)
 */
export function isValidUrl(url: string): boolean {
  try {
    sanitizeUrl(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize user input for use in prompts/queries
 * Removes potentially dangerous characters and limits length
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  // Remove null bytes and control characters
  let sanitized = input.replace(CONTROL_CHAR_PATTERN, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    console.warn('[Sanitize] Input truncated to', maxLength, 'characters');
  }
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize JSON to prevent prototype pollution
 */
export function sanitizeJson<T>(json: string): T {
  try {
    const parsed = JSON.parse(json);
    
    // Check for prototype pollution attempts
    if (parsed && typeof parsed === 'object') {
      const keys = Object.keys(parsed);
      if (keys.some(key => key.startsWith('__proto__') || key.startsWith('constructor'))) {
        throw new Error('Prototype pollution attempt detected');
      }
    }
    
    return parsed as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Escape special characters for use in regular expressions
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

