/**
 * TermsAcceptance - First-run TOS acceptance component
 * 
 * Displays Terms of Service and requires user acceptance before proceeding.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Check, X, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';

interface TermsAcceptanceProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function TermsAcceptance({ onAccept, onDecline }: TermsAcceptanceProps) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [canAccept, setCanAccept] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [acceptedVersion, setAcceptedVersion] = useState<string | null>(null);
  
  const settings = useSettingsStore();

  // Check if user has already accepted current version
  useEffect(() => {
    const stored = localStorage.getItem('omnibrowser:tos:accepted');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const currentVersion = '2025-12-17'; // Update when TOS changes
        if (data.version === currentVersion && data.accepted) {
          setAcceptedVersion(data.version);
          // Auto-accept if already accepted
          onAccept();
          return;
        }
      } catch (e) {
        // Invalid stored data, show acceptance screen
      }
    }
  }, [onAccept]);

  // Track scrolling to enable accept button
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrolled = target.scrollTop > 100; // Require some scrolling
    const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    
    setHasScrolled(scrolled);
    setCanAccept(scrolled && nearBottom);
  };

  const handleAccept = () => {
    const acceptanceData = {
      version: '2025-12-17',
      accepted: true,
      timestamp: Date.now(),
    };
    localStorage.setItem('omnibrowser:tos:accepted', JSON.stringify(acceptanceData));
    onAccept();
  };

  const handleDecline = () => {
    // Clear any previous acceptance
    localStorage.removeItem('omnibrowser:tos:accepted');
    onDecline();
  };

  // Don't show if already accepted
  if (acceptedVersion) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-6 border-b border-gray-700">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText size={24} className="text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-100">Terms of Service</h2>
              <p className="text-sm text-gray-400 mt-1">
                Please read and accept our Terms of Service to continue
              </p>
            </div>
          </div>

          {/* Terms Content */}
          <div
            className="flex-1 overflow-y-auto p-6 text-sm text-gray-300 leading-relaxed"
            onScroll={handleScroll}
          >
            {showFullTerms ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-gray-400 mb-4">
                  <strong>Last Updated: December 17, 2025</strong>
                </p>
                
                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">1. Acceptance of Terms</h3>
                  <p>
                    By downloading, installing, accessing, or using OmniBrowser, you agree to be bound by these Terms of Service. 
                    If you do not agree to these Terms, do not use the Software.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">2. Description of Service</h3>
                  <p>
                    OmniBrowser is a privacy-first, agentic research browser that provides multi-mode browsing, 
                    privacy features (Tor, VPN, Shields, Ghost Mode), AI-powered content processing, and knowledge graph tracking.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">3. Privacy and Data</h3>
                  <p className="mb-2">
                    OmniBrowser stores data locally on your device by default. When using Ghost Mode (Tor Browser integration), 
                    all data is stored in ephemeral sessions with no persistence.
                  </p>
                  <p>
                    You may export your data at any time using the GDPR data export feature in Settings.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">4. Acceptable Use</h3>
                  <p className="mb-2">You agree NOT to use OmniBrowser to:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-400 ml-4">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe on intellectual property rights</li>
                    <li>Transmit malicious code or harmful content</li>
                    <li>Engage in illegal activities</li>
                    <li>Attempt to reverse engineer the Software</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">5. Disclaimers</h3>
                  <p className="mb-2">
                    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. We do not guarantee that the Software 
                    will be available at all times, free from errors, or secure from all threats.
                  </p>
                  <p>
                    AI-generated content is provided "as-is" and may contain errors. Always verify important information from primary sources.
                  </p>
                </section>

                <section className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-3">6. Open Source</h3>
                  <p>
                    OmniBrowser is open-source software licensed under the MIT License. The source code is available at{' '}
                    <a
                      href="https://github.com/nrbns/Omnibrowser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                    >
                      GitHub
                      <ExternalLink size={12} />
                    </a>
                  </p>
                </section>

                <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <strong>Note:</strong> This is a summary. The full Terms of Service are available in{' '}
                    <code className="bg-gray-900/50 px-2 py-1 rounded text-xs">TERMS_OF_SERVICE.md</code> or{' '}
                    <a
                      href="https://github.com/nrbns/Omnibrowser/blob/main/TERMS_OF_SERVICE.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                    >
                      view online
                      <ExternalLink size={12} />
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <h3 className="font-semibold text-gray-100 mb-2">Key Points:</h3>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>OmniBrowser is open-source (MIT License)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Data is stored locally on your device</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Ghost Mode provides maximum privacy (ephemeral sessions)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>You can export your data at any time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                      <span>AI content is provided "as-is" - verify important information</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowFullTerms(true)}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  <span>Read Full Terms of Service</span>
                </button>
              </div>
            )}

            {!hasScrolled && showFullTerms && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-200">
                <p>Please scroll to the bottom to enable the Accept button.</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700 gap-4">
            <button
              onClick={handleDecline}
              className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-200 transition-colors flex items-center gap-2"
            >
              <X size={16} />
              <span>Decline</span>
            </button>

            <div className="flex-1 text-xs text-gray-400 text-center">
              {showFullTerms && !canAccept && (
                <span>Scroll to the bottom to accept</span>
              )}
              {!showFullTerms && (
                <span>Click "Read Full Terms" or accept to continue</span>
              )}
            </div>

            <button
              onClick={handleAccept}
              disabled={showFullTerms && !canAccept}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFullTerms && !canAccept
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Check size={16} />
              <span>Accept</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

