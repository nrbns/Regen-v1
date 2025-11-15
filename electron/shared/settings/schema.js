/**
 * Settings Schema (Zod)
 * Unified settings with validation and defaults
 */
import { z } from 'zod';
export const SettingsSchema = z.object({
    // General settings
    general: z.object({
        language: z.string().default('en'),
        defaultSearchEngine: z.enum(['google', 'duckduckgo', 'bing', 'yahoo']).default('google'),
        startupBehavior: z.enum(['newTab', 'continueSession', 'customPages']).default('newTab'),
        customStartupPages: z.array(z.string().url()).default([]),
        showBookmarksBar: z.boolean().default(false),
        showStatusBar: z.boolean().default(true),
    }).default({}),
    // Privacy settings
    privacy: z.object({
        burnOnClose: z.boolean().default(false),
        telemetry: z.enum(['off', 'on']).default('off'),
        doNotTrack: z.boolean().default(true),
        autoPurgeCookies: z.boolean().default(false),
        purgeAfterDays: z.number().min(1).max(365).default(30),
        blockTrackers: z.boolean().default(true),
        blockAds: z.boolean().default(true),
        blockFingerprinting: z.boolean().default(true),
    }).default({}),
    // Network settings
    network: z.object({
        doh: z.boolean().default(false),
        dohProvider: z.enum(['cloudflare', 'quad9']).default('cloudflare'),
        proxy: z.string().nullable().default(null),
        perTabProxy: z.boolean().default(false),
        quic: z.boolean().default(true),
    }).default({}),
    // Downloads settings
    downloads: z.object({
        requireConsent: z.boolean().default(true),
        defaultPath: z.string().default(''),
        checksum: z.boolean().default(true),
        autoOpen: z.boolean().default(false),
        showNotifications: z.boolean().default(true),
    }).default({}),
    // AI settings
    ai: z.object({
        provider: z.enum(['openai', 'huggingface', 'ollama', 'local']).default('openai'),
        openaiModel: z.string().default('gpt-4o-mini'),
        huggingfaceModel: z.string().default('meta-llama/Meta-Llama-3-8B-Instruct'),
        ollamaModel: z.string().default('llama3.2'),
        maxTokens: z.number().default(8192),
        temperature: z.number().min(0).max(2).default(0.7),
        enableStreaming: z.boolean().default(true),
    }).default({}),
    // Appearance settings
    appearance: z.object({
        theme: z.enum(['light', 'dark', 'auto']).default('dark'),
        compactMode: z.boolean().default(false),
        showProxyBadge: z.boolean().default(true),
        fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
        fontFamily: z.string().default('system'),
        animations: z.boolean().default(true),
    }).default({}),
    // Performance settings
    performance: z.object({
        tabSleepMins: z.number().min(1).max(120).default(20),
        memoryCapMB: z.number().min(100).max(8192).default(2048),
        gpuAcceleration: z.boolean().default(true),
        hardwareAcceleration: z.boolean().default(true),
        enablePrefetch: z.boolean().default(true),
        efficiencyMode: z.enum(['eco', 'balanced', 'performance']).default('balanced'),
    }).default({}),
    // Diagnostics settings
    diagnostics: z.object({
        telemetryOptIn: z.boolean().default(false),
        crashReporting: z.boolean().default(false),
        performanceMonitoring: z.boolean().default(true),
    }).default({}),
    // Startup settings (kept for backwards compatibility)
    startup: z.object({
        behavior: z.enum(['newTab', 'continueSession', 'customPages']).default('newTab'),
        customPages: z.array(z.string().url()).default([]),
    }).default({}),
});
/**
 * Default settings
 */
export const defaultSettings = SettingsSchema.parse({});
/**
 * Merge partial settings with defaults
 */
export function mergeSettings(partial) {
    return SettingsSchema.parse({ ...defaultSettings, ...partial });
}
