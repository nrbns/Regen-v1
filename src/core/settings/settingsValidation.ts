/**
 * Settings Validation - Validate settings before saving
 * Phase 1, Day 4: Settings Panel improvements
 */

import type { SettingsData } from '../../state/settingsStore';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Phase 1, Day 4: Validate settings
 */
export function validateSettings(settings: Partial<SettingsData>): ValidationResult {
  const errors: Record<string, string> = {};

  // Validate account settings
  if (settings.account) {
    if (settings.account.email && !isValidEmail(settings.account.email)) {
      errors['account.email'] = 'Invalid email format';
    }
    if (settings.account.displayName && settings.account.displayName.length > 50) {
      errors['account.displayName'] = 'Display name must be 50 characters or less';
    }
    if (settings.account.avatarColor && !isValidColor(settings.account.avatarColor)) {
      errors['account.avatarColor'] = 'Invalid color format';
    }
  }

  // Validate API keys (if any are provided)
  // This would be called from the APIs panel when keys are entered
  // For now, we'll validate format if needed

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate color format (hex color)
 */
function isValidColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(key: string, apiType?: string): boolean {
  if (!key || key.trim().length === 0) {
    return false;
  }

  // Basic length check
  if (key.length < 10) {
    return false;
  }

  // Type-specific validation could be added here
  if (apiType === 'openai') {
    return key.startsWith('sk-') && key.length > 20;
  }
  if (apiType === 'anthropic') {
    return key.startsWith('sk-ant-') && key.length > 20;
  }

  return true;
}

