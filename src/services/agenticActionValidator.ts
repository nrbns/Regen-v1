/**
 * Action validation utilities for agent actions
 */

import { validateUrlForAgent } from '../core/security/urlSafety';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate a URL for agent actions
 */
export function validateActionUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  // Normalize URL (add protocol if missing)
  let normalized = url.trim();
  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  // Use existing security validation
  const securityCheck = validateUrlForAgent(normalized);
  if (!securityCheck.safe) {
    return {
      valid: false,
      error: securityCheck.reason || 'URL is not safe',
    };
  }

  // Basic URL format validation
  try {
    new URL(normalized);
    return { valid: true, sanitized: normalized };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate mode name
 */
export function validateMode(mode: string): ValidationResult {
  const validModes = ['browse', 'research', 'trade', 'docs'];
  const normalized = mode.toLowerCase().trim();

  if (!validModes.includes(normalized)) {
    return {
      valid: false,
      error: `Invalid mode. Valid modes: ${validModes.join(', ')}`,
    };
  }

  return { valid: true, sanitized: normalized };
}

/**
 * Validate trade action
 */
export function validateTradeAction(
  action: string,
  symbol: string,
  quantity: number
): ValidationResult {
  const validActions = ['BUY', 'SELL'];
  const upperAction = action.toUpperCase();

  if (!validActions.includes(upperAction)) {
    return {
      valid: false,
      error: `Invalid trade action. Valid actions: ${validActions.join(', ')}`,
    };
  }

  if (!symbol || symbol.trim().length === 0) {
    return { valid: false, error: 'Symbol is required' };
  }

  if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be a positive integer' };
  }

  return { valid: true };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { valid: false, error: 'Search query is required' };
  }

  if (query.trim().length > 500) {
    return { valid: false, error: 'Search query is too long (max 500 characters)' };
  }

  return { valid: true, sanitized: query.trim() };
}

/**
 * Log action execution for debugging
 */
export function logAction(action: string, success: boolean, error?: string): void {
  if (typeof window === 'undefined' || !window.console) return;

  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    success,
    error,
  };

  if (success) {
    console.log('[Agent Action]', logEntry);
  } else {
    console.warn('[Agent Action Failed]', logEntry);
  }

  // Store in localStorage for debugging (limit to last 50 actions)
  try {
    const key = 'regen:agent-actions-log';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(logEntry);
    const trimmed = existing.slice(-50); // Keep last 50
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Ignore localStorage errors
  }
}
