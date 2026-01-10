/**
 * AI Sidebar Trigger Events
 * Events that can trigger the AI sidebar to become "aware"
 */

// Dispatch search event
export function triggerSearch() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('regen:search'));
  }
}

// Dispatch error event
export function triggerError(context: { url?: string; error: string }) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('regen:error', { detail: context })
    );
  }
}

// Dispatch page load event
export function triggerPageLoad(url: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('regen:page:load', { detail: { url } })
    );
  }
}
