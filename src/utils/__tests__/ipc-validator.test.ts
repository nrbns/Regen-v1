/**
 * Unit Tests for IPC Validator
 * DAY 10 FIX: Tests for critical security utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateCommandName,
  sanitizeString,
  sanitizeUrl,
  validateIpcRequest,
} from '../ipc-validator';

describe('IPC Validator', () => {
  describe('validateCommandName', () => {
    it('should accept valid command names', () => {
      expect(validateCommandName('research_agent')).toBe(true);
      expect(validateCommandName('tabs:create')).toBe(true);
      expect(validateCommandName('system:getStatus')).toBe(true);
    });

    it('should reject dangerous commands', () => {
      expect(validateCommandName('eval')).toBe(false);
      expect(validateCommandName('exec')).toBe(false);
      expect(validateCommandName('system')).toBe(false);
      expect(validateCommandName('shell')).toBe(false);
      expect(validateCommandName('research_eval')).toBe(false);
    });

    it('should reject invalid patterns', () => {
      expect(validateCommandName('command with spaces')).toBe(false);
      expect(validateCommandName('command<script>')).toBe(false);
      expect(validateCommandName('command|pipe')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove null bytes', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('hello\x01\x02world')).toBe('helloworld');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(20000);
      const sanitized = sanitizeString(longString);
      expect(sanitized.length).toBe(10000);
    });

    it('should handle normal strings', () => {
      expect(sanitizeString('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
      expect(sanitizeUrl('regen://settings')).toBe('regen://settings');
    });

    it('should reject invalid protocols', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>')).toBeNull();
    });

    it('should reject malicious URLs', () => {
      expect(sanitizeUrl('https://example.com<script>')).toBeNull();
    });

    it('should handle non-strings', () => {
      expect(sanitizeUrl(null as any)).toBeNull();
      expect(sanitizeUrl(123 as any)).toBeNull();
    });
  });

  describe('validateIpcRequest', () => {
    it('should validate simple string payload', () => {
      const result = validateIpcRequest('test_command', 'hello');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('hello');
    });

    it('should validate object payload', () => {
      const payload = { url: 'https://example.com', query: 'test' };
      const result = validateIpcRequest('test_command', payload);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toHaveProperty('url', 'https://example.com');
      expect(result.sanitized).toHaveProperty('query', 'test');
    });

    it('should sanitize URLs in payload', () => {
      const payload = { url: 'javascript:alert(1)' };
      const result = validateIpcRequest('test_command', payload);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toHaveProperty('url', null);
    });

    it('should reject invalid command names', () => {
      const result = validateIpcRequest('eval', {});
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle nested objects', () => {
      const payload = {
        config: {
          apiUrl: 'https://api.example.com',
          timeout: 5000,
        },
      };
      const result = validateIpcRequest('test_command', payload);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toHaveProperty('config');
      expect((result.sanitized as any).config).toHaveProperty('apiUrl', 'https://api.example.com');
    });
  });
});
