/**
 * Renderer-side telemetry + Sentry helpers
 * Ensures crash reporting only runs when the user has opted in.
 * Supports both Electron and Tauri runtimes.
 */
export declare function applyTelemetryOptIn(optIn: boolean): Promise<void>;
export declare function syncRendererTelemetry(): Promise<void>;
