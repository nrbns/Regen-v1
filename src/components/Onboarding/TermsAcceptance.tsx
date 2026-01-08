/**
 * TermsAcceptance - First-run TOS acceptance component
 *
 * Displays Terms of Service and requires user acceptance before proceeding.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Check, X, ExternalLink } from 'lucide-react';
// import { useSettingsStore } from '../../state/settingsStore'; // Unused for now

interface TermsAcceptanceProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsAcceptance({ onAccept, onDecline }: TermsAcceptanceProps) {
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const hasCheckedRef = React.useRef(false);

  // const settings = useSettingsStore(); // Unused for now

  // Check if user has already accepted current version
  useEffect(() => {
    // Only check once
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    try {
      const stored = localStorage.getItem('regen:tos:accepted');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          const currentVersion = '2025-12-17'; // Update when TOS changes
          if (data.version === currentVersion && data.accepted) {
            setAcceptedVersion(data.version);
            // Auto-accept if already accepted - use setTimeout to avoid calling during render
            if (typeof onAccept === 'function') {
              setTimeout(() => {
                onAccept();
              }, 0);
            }
            return;
          }
        } catch {
          // Invalid stored data, show acceptance screen
        }
      }
    } catch (error) {
      console.error('[TermsAcceptance] Error checking acceptance status:', error);
      // Show acceptance screen on error
    }
  }, []); // Only run once on mount

  // Track scrolling to enable accept button
  const handleScroll = (_e: React.UIEvent<HTMLDivElement>) => {
    // Scrolling no longer required to accept, but we keep hook for future metrics
  };

  const callAcceptCallback = () => {
    if (typeof onAccept === 'function') {
      Promise.resolve().then(() => {
        onAccept();
      });
    }
  };

  const handleAccept = () => {
    if (!termsChecked) {
      console.warn('[TermsAcceptance] Accept called but terms not checked');
      return;
    }

    console.log('[TermsAcceptance] Accept button clicked');
    try {
      const acceptanceData = {
        version: '2025-12-17',
        accepted: true,
        timestamp: Date.now(),
      };
      localStorage.setItem('regen:tos:accepted', JSON.stringify(acceptanceData));
      console.log('[TermsAcceptance] Acceptance saved to localStorage');

      // Update state to hide component immediately
      setAcceptedVersion('2025-12-17');
      console.log('[TermsAcceptance] acceptedVersion state updated');

      callAcceptCallback();
    } catch (error) {
      console.error('[TermsAcceptance] Failed to save acceptance:', error);
      // Still update state and call onAccept to allow app to continue
      setAcceptedVersion('2025-12-17');
      callAcceptCallback();
    }
  };

  const handleDecline = () => {
    try {
      // Clear any previous acceptance
      localStorage.removeItem('regen:tos:accepted');
    } catch (error) {
      console.error('[TermsAcceptance] Failed to clear acceptance:', error);
    }
    if (typeof onDecline === 'function') {
      onDecline();
    }
  };

  // Don't show if already accepted
  if (acceptedVersion) {
    console.log('[TermsAcceptance] Component hidden - already accepted version:', acceptedVersion);
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="terms-acceptance-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10002] flex items-center justify-center bg-gray-900/95 p-4 backdrop-blur-sm"
        style={{ pointerEvents: 'auto' }}
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
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-gray-700 bg-gray-800 shadow-2xl"
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
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-700 p-6">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <FileText size={24} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-100">Terms of Service</h2>
              <p className="mt-1 text-sm text-gray-400">
                Please read and accept our Terms of Service to continue
              </p>
            </div>
          </div>

          {/* Terms Content */}
          <div
            className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-gray-300"
            onScroll={handleScroll}
          >
            {showFullTerms ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="mb-4 text-gray-400">
                  <strong>Last Updated: December 17, 2025</strong>
                </p>

                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-100">
                    1. Acceptance of Terms
                  </h3>
                  <p>
                    By downloading, installing, accessing, or using Regen, you agree to be bound by
                    these Terms of Service. If you do not agree to these Terms, do not use the
                    Software.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-100">
                    2. Description of Service
                  </h3>
                  <p>
                    Regen is a privacy-first, agentic research browser that provides multi-mode
                    browsing, privacy features (Tor, VPN, Shields, Ghost Mode), AI-powered content
                    processing, and knowledge graph tracking.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-100">3. Privacy and Data</h3>
                  <p className="mb-2">
                    Regen stores data locally on your device by default. When using Ghost Mode (Tor
                    Browser integration), all data is stored in ephemeral sessions with no
                    persistence.
                  </p>
                  <p>
                    You may export your data at any time using the GDPR data export feature in
                    Settings.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-100">4. Acceptable Use</h3>
                  <p className="mb-2">You agree NOT to use Regen to:</p>
                  <ul className="ml-4 list-inside list-disc space-y-1 text-gray-400">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe on intellectual property rights</li>
                    <li>Transmit malicious code or harmful content</li>
                    <li>Engage in illegal activities</li>
                    <li>Attempt to reverse engineer the Software</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-100">5. Disclaimers</h3>
                  <p className="mb-2">
                    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. We do not
                    guarantee that the Software will be available at all times, free from errors, or
                    secure from all threats.
                  </p>
                  <p>
                    AI-generated content is provided "as-is" and may contain errors. Always verify
                    important information from primary sources.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="mb-3 text-lg font-semibold text-gray-100">6. Open Source</h3>
                  <p>
                    Regen is open-source software licensed under the MIT License. The source code is
                    available at{' '}
                    <a
                      href="https://github.com/nrbns/Omnibrowser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 underline hover:text-blue-300"
                    >
                      GitHub
                      <ExternalLink size={12} />
                    </a>
                  </p>
                </section>

                <div className="mt-8 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
                  <p className="text-sm text-blue-200">
                    <strong>Note:</strong> This is a summary. The full Terms of Service are
                    available in{' '}
                    <code className="rounded bg-gray-900/50 px-2 py-1 text-xs">
                      TERMS_OF_SERVICE.md
                    </code>{' '}
                    or{' '}
                    <a
                      href="https://github.com/nrbns/Omnibrowser/blob/main/TERMS_OF_SERVICE.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 underline hover:text-blue-300"
                    >
                      view online
                      <ExternalLink size={12} />
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
                  <h3 className="mb-2 font-semibold text-gray-100">Key Points:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-green-400" />
                      <span>Regen is open-source (MIT License)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-green-400" />
                      <span>Data is stored locally on your device</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-green-400" />
                      <span>Ghost Mode provides maximum privacy (ephemeral sessions)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-green-400" />
                      <span>You can export your data at any time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 flex-shrink-0 text-green-400" />
                      <span>AI content is provided "as-is" - verify important information</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    setShowFullTerms(true);
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    setShowFullTerms(true);
                  }}
                  onPointerDown={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    setShowFullTerms(true);
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-600 active:scale-95"
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    zIndex: 10010,
                    position: 'relative',
                    isolation: 'isolate',
                    touchAction: 'manipulation',
                  }}
                >
                  <FileText size={16} />
                  <span>Read Full Terms of Service</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-4 border-t border-gray-700 p-6">
            <div className="flex flex-1 flex-col gap-3">
              {/* Terms Acceptance Checkbox */}
              <label className="group flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={termsChecked}
                  onChange={e => {
                    e.stopPropagation();
                    setTermsChecked(e.target.checked);
                  }}
                  onClick={e => {
                    e.stopPropagation();
                  }}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
                  style={{
                    pointerEvents: 'auto',
                    zIndex: 10011,
                    position: 'relative',
                  }}
                />
                <span className="text-sm text-gray-300 group-hover:text-gray-200">
                  I have read and agree to the Terms of Service
                </span>
              </label>

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
                    handleDecline();
                  }}
                  onPointerDown={e => {
                    e.preventDefault();
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handleDecline();
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-700 px-6 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-600 active:scale-95"
                  style={{
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    zIndex: 10010,
                    position: 'relative',
                    isolation: 'isolate',
                    touchAction: 'manipulation',
                  }}
                >
                  <X size={16} />
                  <span>Decline</span>
                </button>
                <button
                  type="button"
                  disabled={!termsChecked}
                  onClick={e => {
                    if (!termsChecked) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    console.log('[TermsAcceptance] Accept button onClick triggered');
                    e.preventDefault();
                    e.stopPropagation();
                    handleAccept();
                  }}
                  onMouseDown={e => {
                    if (!termsChecked) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    console.log('[TermsAcceptance] Accept button onMouseDown triggered');
                    e.preventDefault();
                    e.stopPropagation();
                    // Don't call handleAccept here - let onClick handle it
                  }}
                  onPointerDown={e => {
                    if (!termsChecked) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    console.log('[TermsAcceptance] Accept button onPointerDown triggered');
                    e.preventDefault();
                    e.stopPropagation();
                    // Don't call handleAccept here - let onClick handle it
                  }}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors active:scale-95 ${
                    termsChecked
                      ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-gray-700 text-gray-400 opacity-50'
                  }`}
                  style={{
                    pointerEvents: 'auto',
                    cursor: termsChecked ? 'pointer' : 'not-allowed',
                    zIndex: 10010,
                    position: 'relative',
                    isolation: 'isolate',
                    touchAction: 'manipulation',
                  }}
                >
                  <Check size={16} />
                  <span>Accept</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
