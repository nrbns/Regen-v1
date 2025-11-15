/**
 * Settings Schema (Zod)
 * Unified settings with validation and defaults
 */
import { z } from 'zod';
export declare const SettingsSchema: z.ZodObject<{
    general: z.ZodDefault<z.ZodObject<{
        language: z.ZodDefault<z.ZodString>;
        defaultSearchEngine: z.ZodDefault<z.ZodEnum<["google", "duckduckgo", "bing", "yahoo"]>>;
        startupBehavior: z.ZodDefault<z.ZodEnum<["newTab", "continueSession", "customPages"]>>;
        customStartupPages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        showBookmarksBar: z.ZodDefault<z.ZodBoolean>;
        showStatusBar: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        language: string;
        defaultSearchEngine: "google" | "duckduckgo" | "bing" | "yahoo";
        startupBehavior: "newTab" | "continueSession" | "customPages";
        customStartupPages: string[];
        showBookmarksBar: boolean;
        showStatusBar: boolean;
    }, {
        language?: string | undefined;
        defaultSearchEngine?: "google" | "duckduckgo" | "bing" | "yahoo" | undefined;
        startupBehavior?: "newTab" | "continueSession" | "customPages" | undefined;
        customStartupPages?: string[] | undefined;
        showBookmarksBar?: boolean | undefined;
        showStatusBar?: boolean | undefined;
    }>>;
    privacy: z.ZodDefault<z.ZodObject<{
        burnOnClose: z.ZodDefault<z.ZodBoolean>;
        telemetry: z.ZodDefault<z.ZodEnum<["off", "on"]>>;
        doNotTrack: z.ZodDefault<z.ZodBoolean>;
        autoPurgeCookies: z.ZodDefault<z.ZodBoolean>;
        purgeAfterDays: z.ZodDefault<z.ZodNumber>;
        blockTrackers: z.ZodDefault<z.ZodBoolean>;
        blockAds: z.ZodDefault<z.ZodBoolean>;
        blockFingerprinting: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        burnOnClose: boolean;
        telemetry: "on" | "off";
        doNotTrack: boolean;
        autoPurgeCookies: boolean;
        purgeAfterDays: number;
        blockTrackers: boolean;
        blockAds: boolean;
        blockFingerprinting: boolean;
    }, {
        burnOnClose?: boolean | undefined;
        telemetry?: "on" | "off" | undefined;
        doNotTrack?: boolean | undefined;
        autoPurgeCookies?: boolean | undefined;
        purgeAfterDays?: number | undefined;
        blockTrackers?: boolean | undefined;
        blockAds?: boolean | undefined;
        blockFingerprinting?: boolean | undefined;
    }>>;
    network: z.ZodDefault<z.ZodObject<{
        doh: z.ZodDefault<z.ZodBoolean>;
        dohProvider: z.ZodDefault<z.ZodEnum<["cloudflare", "quad9"]>>;
        proxy: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        perTabProxy: z.ZodDefault<z.ZodBoolean>;
        quic: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        doh: boolean;
        dohProvider: "cloudflare" | "quad9";
        proxy: string | null;
        perTabProxy: boolean;
        quic: boolean;
    }, {
        doh?: boolean | undefined;
        dohProvider?: "cloudflare" | "quad9" | undefined;
        proxy?: string | null | undefined;
        perTabProxy?: boolean | undefined;
        quic?: boolean | undefined;
    }>>;
    downloads: z.ZodDefault<z.ZodObject<{
        requireConsent: z.ZodDefault<z.ZodBoolean>;
        defaultPath: z.ZodDefault<z.ZodString>;
        checksum: z.ZodDefault<z.ZodBoolean>;
        autoOpen: z.ZodDefault<z.ZodBoolean>;
        showNotifications: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        requireConsent: boolean;
        defaultPath: string;
        checksum: boolean;
        autoOpen: boolean;
        showNotifications: boolean;
    }, {
        requireConsent?: boolean | undefined;
        defaultPath?: string | undefined;
        checksum?: boolean | undefined;
        autoOpen?: boolean | undefined;
        showNotifications?: boolean | undefined;
    }>>;
    ai: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openai", "huggingface", "ollama", "local"]>>;
        openaiModel: z.ZodDefault<z.ZodString>;
        huggingfaceModel: z.ZodDefault<z.ZodString>;
        ollamaModel: z.ZodDefault<z.ZodString>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        enableStreaming: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        provider: "openai" | "huggingface" | "ollama" | "local";
        openaiModel: string;
        huggingfaceModel: string;
        ollamaModel: string;
        maxTokens: number;
        temperature: number;
        enableStreaming: boolean;
    }, {
        provider?: "openai" | "huggingface" | "ollama" | "local" | undefined;
        openaiModel?: string | undefined;
        huggingfaceModel?: string | undefined;
        ollamaModel?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        enableStreaming?: boolean | undefined;
    }>>;
    appearance: z.ZodDefault<z.ZodObject<{
        theme: z.ZodDefault<z.ZodEnum<["light", "dark", "auto"]>>;
        compactMode: z.ZodDefault<z.ZodBoolean>;
        showProxyBadge: z.ZodDefault<z.ZodBoolean>;
        fontSize: z.ZodDefault<z.ZodEnum<["small", "medium", "large"]>>;
        fontFamily: z.ZodDefault<z.ZodString>;
        animations: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        theme: "light" | "dark" | "auto";
        compactMode: boolean;
        showProxyBadge: boolean;
        fontSize: "small" | "medium" | "large";
        fontFamily: string;
        animations: boolean;
    }, {
        theme?: "light" | "dark" | "auto" | undefined;
        compactMode?: boolean | undefined;
        showProxyBadge?: boolean | undefined;
        fontSize?: "small" | "medium" | "large" | undefined;
        fontFamily?: string | undefined;
        animations?: boolean | undefined;
    }>>;
    performance: z.ZodDefault<z.ZodObject<{
        tabSleepMins: z.ZodDefault<z.ZodNumber>;
        memoryCapMB: z.ZodDefault<z.ZodNumber>;
        gpuAcceleration: z.ZodDefault<z.ZodBoolean>;
        hardwareAcceleration: z.ZodDefault<z.ZodBoolean>;
        enablePrefetch: z.ZodDefault<z.ZodBoolean>;
        efficiencyMode: z.ZodDefault<z.ZodEnum<["eco", "balanced", "performance"]>>;
    }, "strip", z.ZodTypeAny, {
        tabSleepMins: number;
        memoryCapMB: number;
        gpuAcceleration: boolean;
        hardwareAcceleration: boolean;
        enablePrefetch: boolean;
        efficiencyMode: "performance" | "balanced" | "eco";
    }, {
        tabSleepMins?: number | undefined;
        memoryCapMB?: number | undefined;
        gpuAcceleration?: boolean | undefined;
        hardwareAcceleration?: boolean | undefined;
        enablePrefetch?: boolean | undefined;
        efficiencyMode?: "performance" | "balanced" | "eco" | undefined;
    }>>;
    diagnostics: z.ZodDefault<z.ZodObject<{
        telemetryOptIn: z.ZodDefault<z.ZodBoolean>;
        crashReporting: z.ZodDefault<z.ZodBoolean>;
        performanceMonitoring: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        telemetryOptIn: boolean;
        crashReporting: boolean;
        performanceMonitoring: boolean;
    }, {
        telemetryOptIn?: boolean | undefined;
        crashReporting?: boolean | undefined;
        performanceMonitoring?: boolean | undefined;
    }>>;
    startup: z.ZodDefault<z.ZodObject<{
        behavior: z.ZodDefault<z.ZodEnum<["newTab", "continueSession", "customPages"]>>;
        customPages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        customPages: string[];
        behavior: "newTab" | "continueSession" | "customPages";
    }, {
        customPages?: string[] | undefined;
        behavior?: "newTab" | "continueSession" | "customPages" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    performance: {
        tabSleepMins: number;
        memoryCapMB: number;
        gpuAcceleration: boolean;
        hardwareAcceleration: boolean;
        enablePrefetch: boolean;
        efficiencyMode: "performance" | "balanced" | "eco";
    };
    general: {
        language: string;
        defaultSearchEngine: "google" | "duckduckgo" | "bing" | "yahoo";
        startupBehavior: "newTab" | "continueSession" | "customPages";
        customStartupPages: string[];
        showBookmarksBar: boolean;
        showStatusBar: boolean;
    };
    privacy: {
        burnOnClose: boolean;
        telemetry: "on" | "off";
        doNotTrack: boolean;
        autoPurgeCookies: boolean;
        purgeAfterDays: number;
        blockTrackers: boolean;
        blockAds: boolean;
        blockFingerprinting: boolean;
    };
    network: {
        doh: boolean;
        dohProvider: "cloudflare" | "quad9";
        proxy: string | null;
        perTabProxy: boolean;
        quic: boolean;
    };
    downloads: {
        requireConsent: boolean;
        defaultPath: string;
        checksum: boolean;
        autoOpen: boolean;
        showNotifications: boolean;
    };
    ai: {
        provider: "openai" | "huggingface" | "ollama" | "local";
        openaiModel: string;
        huggingfaceModel: string;
        ollamaModel: string;
        maxTokens: number;
        temperature: number;
        enableStreaming: boolean;
    };
    appearance: {
        theme: "light" | "dark" | "auto";
        compactMode: boolean;
        showProxyBadge: boolean;
        fontSize: "small" | "medium" | "large";
        fontFamily: string;
        animations: boolean;
    };
    diagnostics: {
        telemetryOptIn: boolean;
        crashReporting: boolean;
        performanceMonitoring: boolean;
    };
    startup: {
        customPages: string[];
        behavior: "newTab" | "continueSession" | "customPages";
    };
}, {
    performance?: {
        tabSleepMins?: number | undefined;
        memoryCapMB?: number | undefined;
        gpuAcceleration?: boolean | undefined;
        hardwareAcceleration?: boolean | undefined;
        enablePrefetch?: boolean | undefined;
        efficiencyMode?: "performance" | "balanced" | "eco" | undefined;
    } | undefined;
    general?: {
        language?: string | undefined;
        defaultSearchEngine?: "google" | "duckduckgo" | "bing" | "yahoo" | undefined;
        startupBehavior?: "newTab" | "continueSession" | "customPages" | undefined;
        customStartupPages?: string[] | undefined;
        showBookmarksBar?: boolean | undefined;
        showStatusBar?: boolean | undefined;
    } | undefined;
    privacy?: {
        burnOnClose?: boolean | undefined;
        telemetry?: "on" | "off" | undefined;
        doNotTrack?: boolean | undefined;
        autoPurgeCookies?: boolean | undefined;
        purgeAfterDays?: number | undefined;
        blockTrackers?: boolean | undefined;
        blockAds?: boolean | undefined;
        blockFingerprinting?: boolean | undefined;
    } | undefined;
    network?: {
        doh?: boolean | undefined;
        dohProvider?: "cloudflare" | "quad9" | undefined;
        proxy?: string | null | undefined;
        perTabProxy?: boolean | undefined;
        quic?: boolean | undefined;
    } | undefined;
    downloads?: {
        requireConsent?: boolean | undefined;
        defaultPath?: string | undefined;
        checksum?: boolean | undefined;
        autoOpen?: boolean | undefined;
        showNotifications?: boolean | undefined;
    } | undefined;
    ai?: {
        provider?: "openai" | "huggingface" | "ollama" | "local" | undefined;
        openaiModel?: string | undefined;
        huggingfaceModel?: string | undefined;
        ollamaModel?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        enableStreaming?: boolean | undefined;
    } | undefined;
    appearance?: {
        theme?: "light" | "dark" | "auto" | undefined;
        compactMode?: boolean | undefined;
        showProxyBadge?: boolean | undefined;
        fontSize?: "small" | "medium" | "large" | undefined;
        fontFamily?: string | undefined;
        animations?: boolean | undefined;
    } | undefined;
    diagnostics?: {
        telemetryOptIn?: boolean | undefined;
        crashReporting?: boolean | undefined;
        performanceMonitoring?: boolean | undefined;
    } | undefined;
    startup?: {
        customPages?: string[] | undefined;
        behavior?: "newTab" | "continueSession" | "customPages" | undefined;
    } | undefined;
}>;
export type Settings = z.infer<typeof SettingsSchema>;
/**
 * Default settings
 */
export declare const defaultSettings: Settings;
/**
 * Merge partial settings with defaults
 */
export declare function mergeSettings(partial: Partial<Settings>): Settings;
