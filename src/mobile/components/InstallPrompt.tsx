/**
 * Install Prompt Component for PWA
 * Shows install prompt when browser supports PWA installation
 */

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Handle beforeinstallprompt event (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user dismissed recently
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
        return; // Don't show if dismissed in last 24 hours
      }

      // Show prompt after 3 seconds (or based on user behavior)
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show custom instructions
    if (ios) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, just dismiss (instructions already shown)
      handleDismiss();
      return;
    }

    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted install prompt');
        // Track installation if needed
      } else {
        console.log('User dismissed install prompt');
      }

      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already in standalone mode or prompt dismissed
  if (isStandalone || !showPrompt) return null;

  // Check if already dismissed recently
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
    return null;
  }

  return (
    <div
      className="animate-in slide-in-from-bottom-4 fixed bottom-4 left-4 right-4 rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-lg md:left-auto md:right-4 md:w-96"
      style={{ zIndex: 105, bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }} // Above mobile nav
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-sm font-semibold text-white">Install Regen Browser</h3>
            {isIOS ? (
              <div className="space-y-1 text-xs text-gray-400">
                <p>Install Regen for quick access:</p>
                <ol className="ml-1 list-inside list-decimal space-y-0.5">
                  <li>
                    Tap the Share button <span className="text-gray-500">(□↑)</span>
                  </li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Add Regen to your home screen for quick access and offline support.
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 transition-colors hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!isIOS && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Download className="h-4 w-4" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
          >
            Not now
          </button>
        </div>
      )}
      {isIOS && (
        <div className="mt-3">
          <button
            onClick={handleDismiss}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
