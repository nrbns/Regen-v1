// @ts-nocheck
/**
 * Renderer helper for privacy-friendly analytics.
 */

import { ipc } from '../ipc-typed';
import { isElectronRuntime } from '../env';

let analyticsEnabled = false;

export async function applyAnalyticsOptIn(optIn: boolean) {
  await ipc.analytics.setOptIn(optIn);
  analyticsEnabled = optIn;
}

export async function syncAnalyticsOptIn() {
  if (!isElectronRuntime()) return;
  const status = await ipc.analytics.getStatus();
  analyticsEnabled = status.enabled && status.optIn;
}

export function trackAnalyticsEvent(type: string, payload?: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  void ipc.analytics.track(type, payload);
}

export function trackPageView(path: string) {
  trackAnalyticsEvent('page_view', {
    path,
    title: document.title,
  });
}


