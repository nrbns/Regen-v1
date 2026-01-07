/**
 * CookieConsent - GDPR-Compliant Cookie Consent Banner
 *
 * Displays cookie consent options and stores user preferences.
 * Complies with GDPR requirements for cookie consent.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X, Check, AlertCircle, Info } from 'lucide-react';
// import { useSettingsStore } from '../../state/settingsStore'; // Unused for now

export type CookieCategory = 'essential' | 'analytics' | 'functional' | 'advertising';

export interface CookiePreferences {
  essential: boolean; // Always true (required for app to function)
  analytics: boolean;
  functional: boolean;
  advertising: boolean;
  timestamp: number;
  version: string;
}

const COOKIE_VERSION = '2025-12-17';

interface CookieConsentProps {
  onAccept: (preferences: CookiePreferences) => void;
  onDecline?: () => void;
  showSettings?: boolean;
}

export function CookieConsent({ onAccept, onDecline, showSettings = false }: CookieConsentProps) {
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    functional: false,
    advertising: false,
    timestamp: Date.now(),
    version: COOKIE_VERSION,
  });
  const [showDetails, setShowDetails] = useState(showSettings);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Load saved preferences
  useEffect(() => {
    try {
      const stored = localStorage.getItem('regen:cookie-consent');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.version === COOKIE_VERSION) {
          setPreferences(data);
          setHasInteracted(true);
        }
      }
    } catch {
      // Invalid stored data, use defaults
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      functional: true,
      advertising: true,
      timestamp: Date.now(),
      version: COOKIE_VERSION,
    };
    setPreferences(allAccepted);
    setHasInteracted(true);
    onAccept(allAccepted);
  };

  const handleAcceptSelected = () => {
    setHasInteracted(true);
    onAccept(preferences);
  };

  const handleDecline = () => {
    const minimal: CookiePreferences = {
      essential: true, // Required
      analytics: false,
      functional: false,
      advertising: false,
      timestamp: Date.now(),
      version: COOKIE_VERSION,
    };
    setPreferences(minimal);
    setHasInteracted(true);
    onAccept(minimal);
    onDecline?.();
  };

  const toggleCategory = (category: CookieCategory) => {
    if (category === 'essential') return; // Can't disable essential
    setPreferences(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const cookieCategories = [
    {
      id: 'essential' as CookieCategory,
      name: 'Essential Cookies',
      description: 'Required for the app to function. These cannot be disabled.',
      required: true,
      examples: ['Session management', 'Security', 'Authentication'],
    },
    {
      id: 'analytics' as CookieCategory,
      name: 'Analytics Cookies',
      description: 'Help us understand how you use Regen to improve the experience.',
      required: false,
      examples: ['Usage statistics', 'Performance metrics', 'Error tracking'],
    },
    {
      id: 'functional' as CookieCategory,
      name: 'Functional Cookies',
      description: 'Enable enhanced features and personalization.',
      required: false,
      examples: ['Preferences', 'Settings', 'Theme selection'],
    },
    {
      id: 'advertising' as CookieCategory,
      name: 'Advertising Cookies',
      description: 'Used for personalized ads (currently not used in Regen).',
      required: false,
      examples: ['Ad personalization', 'Ad targeting'],
    },
  ];

  // Don't show if already accepted and not in settings mode
  if (hasInteracted && !showSettings && preferences.essential) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-[10001] p-4"
        style={{ pointerEvents: 'auto' }}
      >
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-2xl"
            onClick={e => {
              // Completely ignore button clicks - don't interfere at all
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('[role="button"]') ||
                target.closest('a')
              ) {
                return; // Don't do anything - let button handle it completely
              }
              // Only stop propagation for non-button clicks
              e.stopPropagation();
            }}
            onMouseDown={e => {
              // Completely ignore button clicks - don't interfere at all
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('[role="button"]') ||
                target.closest('a')
              ) {
                return; // Don't do anything - let button handle it completely
              }
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-700 p-6">
              <div className="rounded-lg bg-blue-500/20 p-2">
                <Cookie size={24} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-100">Cookie Preferences</h2>
                <p className="mt-1 text-sm text-gray-400">
                  We use cookies to enhance your browsing experience and analyze usage.
                </p>
              </div>
              {showSettings && (
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    setShowDetails(false);
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-700"
                  aria-label="Close"
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    zIndex: 10011,
                    isolation: 'isolate',
                  }}
                >
                  <X size={20} className="text-gray-400" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-[60vh] overflow-y-auto p-6">
              {showDetails ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                    <div className="flex items-start gap-2">
                      <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-400" />
                      <p className="text-sm text-blue-200">
                        <strong>Your Privacy Matters:</strong> Regen stores data locally on your
                        device by default. Cookies and similar technologies are used only for
                        essential functionality and optional analytics. You can change these
                        preferences at any time in Settings.
                      </p>
                    </div>
                  </div>

                  {cookieCategories.map(category => (
                    <div
                      key={category.id}
                      className={`rounded-lg border p-4 ${
                        preferences[category.id]
                          ? 'border-green-500/30 bg-green-500/10'
                          : 'border-gray-700 bg-gray-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h3 className="font-semibold text-gray-100">{category.name}</h3>
                            {category.required && (
                              <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="mb-2 text-sm text-gray-400">{category.description}</p>
                          <div className="text-xs text-gray-500">
                            <strong>Examples:</strong> {category.examples.join(', ')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {category.required ? (
                            <div className="rounded bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300">
                              Always On
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={e => {
                                e.preventDefault();
                                (e as any).stopImmediatePropagation();
                                e.stopPropagation();
                                toggleCategory(category.id);
                              }}
                              onMouseDown={e => {
                                e.preventDefault();
                                (e as any).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                                preferences[category.id]
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                              style={{
                                pointerEvents: 'auto',
                                cursor: 'pointer',
                                zIndex: 10011,
                                isolation: 'isolate',
                              }}
                            >
                              {preferences[category.id] ? (
                                <span className="flex items-center gap-1">
                                  <Check size={14} />
                                  Enabled
                                </span>
                              ) : (
                                'Disabled'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-yellow-400" />
                      <div className="text-sm text-yellow-200">
                        <strong>Note:</strong> Disabling non-essential cookies may limit some
                        features. Essential cookies are required for the app to function properly.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300">
                    We use cookies to provide essential functionality and optional analytics. Your
                    data is stored locally on your device by default.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Info size={14} />
                    <span>You can customize cookie preferences or accept all cookies.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between gap-4 border-t border-gray-700 bg-gray-900/50 p-6">
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
                onMouseDown={e => {
                  e.preventDefault();
                  (e as any).stopImmediatePropagation();
                  e.stopPropagation();
                }}
                className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
                style={{
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  zIndex: 10011,
                  isolation: 'isolate',
                }}
              >
                <Settings size={16} />
                <span>{showDetails ? 'Hide Details' : 'Customize'}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handleDecline();
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  className="rounded-lg bg-gray-700 px-6 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600"
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    zIndex: 10011,
                    isolation: 'isolate',
                  }}
                >
                  Accept Essential Only
                </button>
                {showDetails ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                      handleAcceptSelected();
                    }}
                    onMouseDown={e => {
                      e.preventDefault();
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                    }}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    style={{
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      zIndex: 10011,
                      isolation: 'isolate',
                    }}
                  >
                    <Check size={16} />
                    <span>Save Preferences</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={e => {
                      e.preventDefault();
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                      handleAcceptAll();
                    }}
                    onMouseDown={e => {
                      e.preventDefault();
                      (e as any).stopImmediatePropagation();
                      e.stopPropagation();
                    }}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    style={{
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      zIndex: 10011,
                      isolation: 'isolate',
                    }}
                  >
                    <Check size={16} />
                    <span>Accept All</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to check if cookie consent has been given
 */
export function useCookieConsent(): {
  hasConsented: boolean;
  preferences: CookiePreferences | null;
  showConsent: () => void;
} {
  const [hasConsented, setHasConsented] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);
  const [_showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('regen:cookie-consent');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.version === COOKIE_VERSION) {
          setPreferences(data);
          setHasConsented(true);
          return;
        }
      }
      // No consent given yet
      setShowBanner(true);
    } catch {
      setShowBanner(true);
    }
  }, []);

  const _handleAccept = (prefs: CookiePreferences) => {
    localStorage.setItem('regen:cookie-consent', JSON.stringify(prefs));
    setPreferences(prefs);
    setHasConsented(true);
    setShowBanner(false);
  };

  return {
    hasConsented,
    preferences,
    showConsent: () => setShowBanner(true),
  };
}

/**
 * Get current cookie preferences
 */
export function getCookiePreferences(): CookiePreferences | null {
  try {
    const stored = localStorage.getItem('regen:cookie-consent');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.version === COOKIE_VERSION) {
        return data;
      }
    }
  } catch {
    // Invalid data
  }
  return null;
}

/**
 * Check if a specific cookie category is enabled
 */
export function isCookieCategoryEnabled(category: CookieCategory): boolean {
  const prefs = getCookiePreferences();
  if (!prefs) return category === 'essential'; // Default to essential only
  return prefs[category] ?? false;
}
