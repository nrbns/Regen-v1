// @ts-nocheck
/**
 * Renderer-side telemetry + Sentry helpers
 * Ensures crash reporting only runs when the user has opted in.
 * Supports both Electron and Tauri runtimes.
 */

import { ipc } from '../ipc-typed';
import { isElectronRuntime, isTauriRuntime } from '../env';

// Sentry is optional - use any to avoid build-time resolution
let rendererSentry: any = null;
let sentryInitialized = false;

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN || '';
const SENTRY_ENV = import.meta.env.MODE || import.meta.env.DEV ? 'development' : 'production';
const SENTRY_SAMPLE_RATE = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0');
const RELEASE = import.meta.env.VITE_APP_VERSION || '0.0.0';

// Validate DSN format (basic check)
function isValidSentryDSN(dsn: string): boolean {
  if (!dsn || dsn.trim().length === 0) return false;
  // Reject placeholder values
  if (dsn.includes('your-sentry-dsn') || dsn.includes('your_sentry_dsn')) return false;
  // Basic format check: should start with https://
  return dsn.startsWith('https://') && dsn.includes('@');
}

async function initRendererSentry() {
  if (sentryInitialized) return;
  if (!SENTRY_DSN || !isValidSentryDSN(SENTRY_DSN)) {
    // Only log in dev mode to avoid console spam
    if (SENTRY_ENV === 'development') {
      console.log('[Sentry] DSN not configured or invalid - skipping initialization');
    }
    return;
  }

  // Try Tauri first (current runtime), then fallback to Electron
  if (!rendererSentry) {
    try {
      // Try @sentry/react for Tauri/web
      const reactSentry = await import('@sentry/react').catch(() => null);
      if (reactSentry && reactSentry.init) {
        rendererSentry = reactSentry;
        console.info('[Sentry] Using @sentry/react for Tauri/web');
      } else {
        // Fallback to Electron if available
        // SECURITY: Dynamic import for Sentry - treat as optional but guard via safeImport
        const sentryPath = '@sentry/electron' + '/renderer';
        try {
          const { safeImport } = await import('../../utils/safeImport').catch(() => ({
            safeImport: null,
          }));
          if (!safeImport) throw new Error('safeImport unavailable');
          // Allowlist the sentryPath explicitly
          const sentryModule = await safeImport(sentryPath, [sentryPath]).catch(() => null);
          if (sentryModule) {
            rendererSentry = sentryModule;
            console.info('[Sentry] Using @sentry/electron/renderer');
          }
        } catch {
          // Silently fail - Electron Sentry is optional
          console.debug('[Sentry] @sentry/electron/renderer not available');
        }
      }
    } catch (error) {
      console.warn('[Sentry] Renderer SDK unavailable', error);
      return;
    }
  }

  if (!rendererSentry || !rendererSentry.init) {
    console.warn('[Sentry] Renderer SDK not available');
    return;
  }

  try {
    rendererSentry.init({
      dsn: SENTRY_DSN,
      environment: SENTRY_ENV,
      release: `regen-renderer@${RELEASE}`,
      enableUnresponsive: false,
      tracesSampleRate: Number.isFinite(SENTRY_SAMPLE_RATE) ? SENTRY_SAMPLE_RATE : 0,
      beforeSend(event) {
        if (event?.request?.url) {
          try {
            const url = new URL(event.request.url);
            event.request.url = `${url.protocol}//${url.hostname}`;
          } catch {
            delete event.request.url;
          }
        }
        if (event?.user) {
          delete event.user;
        }
        return event;
      },
    });

    // Make Sentry available globally for ErrorBoundary
    if (typeof window !== 'undefined') {
      (window as any).Sentry = rendererSentry;
    }

    sentryInitialized = true;
    console.info('[Sentry] Renderer crash reporting enabled');
  } catch (error) {
    console.warn('[Sentry] Failed to initialize renderer', error);
  }
}

async function shutdownRendererSentry() {
  if (!rendererSentry || !sentryInitialized) return;
  try {
    if (rendererSentry.close && typeof rendererSentry.close === 'function') {
      await rendererSentry.close(2000);
    }
  } catch (error) {
    console.warn('[Sentry] Failed to shutdown renderer SDK', error);
  }
  sentryInitialized = false;
}

/**
 * LAG FIX #7: Opt-in Sentry with user consent
 */
export async function applyTelemetryOptIn(optIn: boolean) {
  try {
    await ipc.telemetry.setOptIn(optIn);
  } catch (error) {
    console.warn('[Sentry] IPC telemetry opt-in failed, using local state', error);
  }

  // Apply opt-in regardless of runtime
  if (optIn) {
    await initRendererSentry();
  } else {
    await shutdownRendererSentry();
  }
}

export async function syncRendererTelemetry() {
  // Skip backend checks in web mode
  const isWebMode = !isElectronRuntime() && !isTauriRuntime();

  if (isWebMode) {
    // In web mode, initialize Sentry directly if DSN is available and valid
    if (SENTRY_DSN && isValidSentryDSN(SENTRY_DSN)) {
      await initRendererSentry();
    }
    return;
  }

  // Initialize Sentry for both Electron and Tauri
  try {
    const status = await ipc.telemetry.getStatus();
    if (status.optIn) {
      await initRendererSentry();
    } else {
      await shutdownRendererSentry();
    }
  } catch {
    // If IPC fails (e.g., in web mode), still try to initialize if DSN is available and valid
    if (SENTRY_DSN && isValidSentryDSN(SENTRY_DSN)) {
      console.warn('[Sentry] IPC unavailable, initializing with DSN only');
      await initRendererSentry();
    }
  }
}
