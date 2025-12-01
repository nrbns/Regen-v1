// @ts-nocheck
/**
 * Renderer-side telemetry + Sentry helpers
 * Ensures crash reporting only runs when the user has opted in.
 * Supports both Electron and Tauri runtimes.
 */

import { ipc } from '../ipc-typed';
import { isElectronRuntime } from '../env';

// Sentry is optional - use any to avoid build-time resolution
let rendererSentry: any = null;
let sentryInitialized = false;

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN || '';
const SENTRY_ENV = import.meta.env.MODE || process.env.NODE_ENV || 'development';
const SENTRY_SAMPLE_RATE = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0');
const RELEASE = import.meta.env.VITE_APP_VERSION || '0.0.0';

async function initRendererSentry() {
  if (sentryInitialized) return;
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured - skipping initialization');
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
        const importSentry = new Function('return import("@sentry/electron/renderer")');
        const sentryModule = await importSentry().catch(() => null);
        if (sentryModule) {
          rendererSentry = sentryModule;
          console.info('[Sentry] Using @sentry/electron/renderer');
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

export async function applyTelemetryOptIn(optIn: boolean) {
  await ipc.telemetry.setOptIn(optIn);
  if (!isElectronRuntime()) return;

  if (optIn) {
    await initRendererSentry();
  } else {
    await shutdownRendererSentry();
  }
}

export async function syncRendererTelemetry() {
  // Initialize Sentry for both Electron and Tauri
  try {
  const status = await ipc.telemetry.getStatus();
  if (status.optIn) {
    await initRendererSentry();
  } else {
    await shutdownRendererSentry();
    }
  } catch {
    // If IPC fails (e.g., in web mode), still try to initialize if DSN is available
    if (SENTRY_DSN) {
      console.warn('[Sentry] IPC unavailable, initializing with DSN only');
      await initRendererSentry();
    }
  }
}
