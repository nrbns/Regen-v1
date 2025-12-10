/**
 * Service Worker Registration and Management
 * Handles service worker lifecycle and updates
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[ServiceWorker] Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[ServiceWorker] Registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available - prompt user to reload
          console.log('[ServiceWorker] New version available');
          // Could show a toast notification here
          window.dispatchEvent(new CustomEvent('sw:update', { detail: { registration } }));
        }
      });
    });

    // Handle controller change (page refresh after update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[ServiceWorker] Controller changed - reloading page');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.error('[ServiceWorker] Registration failed:', error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('[ServiceWorker] Unregistered:', result);
    return result;
  } catch (error) {
    console.error('[ServiceWorker] Unregistration failed:', error);
    return false;
  }
}

export async function checkServiceWorkerUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return registration.installing !== null || registration.waiting !== null;
  } catch (error) {
    console.error('[ServiceWorker] Update check failed:', error);
    return false;
  }
}
