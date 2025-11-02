/**
 * Settings Schema (Zod)
 * Unified settings with validation and defaults
 */

import { z } from 'zod';

export const SettingsSchema = z.object({
  privacy: z.object({
    burnOnClose: z.boolean().default(false),
    telemetry: z.enum(['off', 'on']).default('off'),
    doNotTrack: z.boolean().default(true),
    autoPurgeCookies: z.boolean().default(false),
    purgeAfterDays: z.number().min(1).max(365).default(30),
  }).default({}),
  network: z.object({
    doh: z.boolean().default(false),
    dohProvider: z.enum(['cloudflare', 'quad9']).default('cloudflare'),
    proxy: z.string().nullable().default(null),
    perTabProxy: z.boolean().default(false),
    quic: z.boolean().default(true),
  }).default({}),
  downloads: z.object({
    requireConsent: z.boolean().default(true),
    defaultPath: z.string().default(''),
    checksum: z.boolean().default(true),
  }).default({}),
  performance: z.object({
    tabSleepMins: z.number().min(1).max(120).default(20),
    memoryCapMB: z.number().min(100).max(8192).default(2048),
    gpuAcceleration: z.boolean().default(true),
  }).default({}),
  ai: z.object({
    provider: z.enum(['local', 'openai', 'anthropic']).default('local'),
    model: z.string().default('qwen2.5-coder'),
    maxTokens: z.number().default(8192),
    temperature: z.number().min(0).max(2).default(0.7),
  }).default({}),
  ui: z.object({
    theme: z.enum(['light', 'dark', 'auto']).default('dark'),
    compactMode: z.boolean().default(false),
    showProxyBadge: z.boolean().default(true),
  }).default({}),
  startup: z.object({
    behavior: z.enum(['newTab', 'continueSession', 'customPages']).default('newTab'),
    customPages: z.array(z.string().url()).default([]),
  }).default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;

/**
 * Default settings
 */
export const defaultSettings: Settings = SettingsSchema.parse({});

/**
 * Merge partial settings with defaults
 */
export function mergeSettings(partial: Partial<Settings>): Settings {
  return SettingsSchema.parse({ ...defaultSettings, ...partial });
}

