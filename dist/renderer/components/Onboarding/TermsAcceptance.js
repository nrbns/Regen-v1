import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TermsAcceptance - First-run TOS acceptance component
 *
 * Displays Terms of Service and requires user acceptance before proceeding.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Check, X, ExternalLink } from 'lucide-react';
export function TermsAcceptance({ onAccept, onDecline }) {
    const [showFullTerms, setShowFullTerms] = useState(false);
    const [acceptedVersion, setAcceptedVersion] = useState(null);
    const [termsChecked, setTermsChecked] = useState(false);
    const hasCheckedRef = React.useRef(false);
    // const settings = useSettingsStore(); // Unused for now
    // Check if user has already accepted current version
    useEffect(() => {
        // Only check once
        if (hasCheckedRef.current)
            return;
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
                }
                catch {
                    // Invalid stored data, show acceptance screen
                }
            }
        }
        catch (error) {
            console.error('[TermsAcceptance] Error checking acceptance status:', error);
            // Show acceptance screen on error
        }
    }, []); // Only run once on mount
    // Track scrolling to enable accept button
    const handleScroll = (_e) => {
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
        }
        catch (error) {
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
        }
        catch (error) {
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
    return (_jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[10002] bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4", style: { pointerEvents: 'auto' }, onMouseDown: e => {
                // Completely ignore button clicks - don't interfere at all
                const target = e.target;
                if (target.closest('button') ||
                    target.closest('[role="button"]') ||
                    target.closest('a')) {
                    return; // Don't do anything - let button handle it completely
                }
            }, onClick: e => {
                // Completely ignore button clicks - don't interfere at all
                const target = e.target;
                if (target.closest('button') ||
                    target.closest('[role="button"]') ||
                    target.closest('a')) {
                    return; // Don't do anything - let button handle it completely
                }
            }, children: _jsxs(motion.div, { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.95, opacity: 0 }, className: "bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col", onMouseDown: e => {
                    // Completely ignore button clicks - don't interfere at all
                    const target = e.target;
                    if (target.closest('button') ||
                        target.closest('[role="button"]') ||
                        target.closest('a')) {
                        return; // Don't do anything - let button handle it completely
                    }
                }, onClick: e => {
                    // Completely ignore button clicks - don't interfere at all
                    const target = e.target;
                    if (target.closest('button') ||
                        target.closest('[role="button"]') ||
                        target.closest('a')) {
                        return; // Don't do anything - let button handle it completely
                    }
                    // Only stop propagation for non-button clicks
                    e.stopPropagation();
                }, children: [_jsxs("div", { className: "flex items-center gap-3 p-6 border-b border-gray-700", children: [_jsx("div", { className: "p-2 bg-blue-500/20 rounded-lg", children: _jsx(FileText, { size: 24, className: "text-blue-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-100", children: "Terms of Service" }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: "Please read and accept our Terms of Service to continue" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6 text-sm text-gray-300 leading-relaxed", onScroll: handleScroll, children: showFullTerms ? (_jsxs("div", { className: "prose prose-invert prose-sm max-w-none", children: [_jsx("p", { className: "text-gray-400 mb-4", children: _jsx("strong", { children: "Last Updated: December 17, 2025" }) }), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-3", children: "1. Acceptance of Terms" }), _jsx("p", { children: "By downloading, installing, accessing, or using Regen, you agree to be bound by these Terms of Service. If you do not agree to these Terms, do not use the Software." })] }), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-3", children: "2. Description of Service" }), _jsx("p", { children: "Regen is a privacy-first, agentic research browser that provides multi-mode browsing, privacy features (Tor, VPN, Shields, Ghost Mode), AI-powered content processing, and knowledge graph tracking." })] }), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-3", children: "3. Privacy and Data" }), _jsx("p", { className: "mb-2", children: "Regen stores data locally on your device by default. When using Ghost Mode (Tor Browser integration), all data is stored in ephemeral sessions with no persistence." }), _jsx("p", { children: "You may export your data at any time using the GDPR data export feature in Settings." })] }), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-3", children: "4. Acceptable Use" }), _jsx("p", { className: "mb-2", children: "You agree NOT to use Regen to:" }), _jsxs("ul", { className: "list-disc list-inside space-y-1 text-gray-400 ml-4", children: [_jsx("li", { children: "Violate any applicable laws or regulations" }), _jsx("li", { children: "Infringe on intellectual property rights" }), _jsx("li", { children: "Transmit malicious code or harmful content" }), _jsx("li", { children: "Engage in illegal activities" }), _jsx("li", { children: "Attempt to reverse engineer the Software" })] })] }), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-3", children: "5. Disclaimers" }), _jsx("p", { className: "mb-2", children: "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND. We do not guarantee that the Software will be available at all times, free from errors, or secure from all threats." }), _jsx("p", { children: "AI-generated content is provided \"as-is\" and may contain errors. Always verify important information from primary sources." })] }), _jsxs("section", { className: "mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-3", children: "6. Open Source" }), _jsxs("p", { children: ["Regen is open-source software licensed under the MIT License. The source code is available at", ' ', _jsxs("a", { href: "https://github.com/nrbns/Omnibrowser", target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1", children: ["GitHub", _jsx(ExternalLink, { size: 12 })] })] })] }), _jsx("div", { className: "mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg", children: _jsxs("p", { className: "text-sm text-blue-200", children: [_jsx("strong", { children: "Note:" }), " This is a summary. The full Terms of Service are available in", ' ', _jsx("code", { className: "bg-gray-900/50 px-2 py-1 rounded text-xs", children: "TERMS_OF_SERVICE.md" }), ' ', "or", ' ', _jsxs("a", { href: "https://github.com/nrbns/Omnibrowser/blob/main/TERMS_OF_SERVICE.md", target: "_blank", rel: "noopener noreferrer", className: "text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1", children: ["view online", _jsx(ExternalLink, { size: 12 })] })] }) })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "p-4 bg-gray-900/50 rounded-lg border border-gray-700", children: [_jsx("h3", { className: "font-semibold text-gray-100 mb-2", children: "Key Points:" }), _jsxs("ul", { className: "space-y-2 text-gray-300", children: [_jsxs("li", { className: "flex items-start gap-2", children: [_jsx(Check, { size: 16, className: "text-green-400 mt-0.5 flex-shrink-0" }), _jsx("span", { children: "Regen is open-source (MIT License)" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(Check, { size: 16, className: "text-green-400 mt-0.5 flex-shrink-0" }), _jsx("span", { children: "Data is stored locally on your device" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(Check, { size: 16, className: "text-green-400 mt-0.5 flex-shrink-0" }), _jsx("span", { children: "Ghost Mode provides maximum privacy (ephemeral sessions)" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(Check, { size: 16, className: "text-green-400 mt-0.5 flex-shrink-0" }), _jsx("span", { children: "You can export your data at any time" })] }), _jsxs("li", { className: "flex items-start gap-2", children: [_jsx(Check, { size: 16, className: "text-green-400 mt-0.5 flex-shrink-0" }), _jsx("span", { children: "AI content is provided \"as-is\" - verify important information" })] })] })] }), _jsxs("button", { type: "button", onClick: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                        setShowFullTerms(true);
                                    }, onMouseDown: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                        setShowFullTerms(true);
                                    }, onPointerDown: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                        setShowFullTerms(true);
                                    }, className: "w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95", style: {
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                        zIndex: 10010,
                                        position: 'relative',
                                        isolation: 'isolate',
                                        touchAction: 'manipulation',
                                    }, children: [_jsx(FileText, { size: 16 }), _jsx("span", { children: "Read Full Terms of Service" })] })] })) }), _jsx("div", { className: "flex items-center justify-between p-6 border-t border-gray-700 gap-4", children: _jsxs("div", { className: "flex flex-col gap-3 flex-1", children: [_jsxs("label", { className: "flex items-start gap-3 cursor-pointer group", children: [_jsx("input", { type: "checkbox", checked: termsChecked, onChange: e => {
                                                e.stopPropagation();
                                                setTermsChecked(e.target.checked);
                                            }, onClick: e => {
                                                e.stopPropagation();
                                            }, className: "mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 cursor-pointer", style: {
                                                pointerEvents: 'auto',
                                                zIndex: 10011,
                                                position: 'relative',
                                            } }), _jsx("span", { className: "text-sm text-gray-300 group-hover:text-gray-200", children: "I have read and agree to the Terms of Service" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { type: "button", onClick: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleDecline();
                                            }, onMouseDown: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleDecline();
                                            }, onPointerDown: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleDecline();
                                            }, className: "px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-200 transition-colors flex items-center gap-2 cursor-pointer active:scale-95", style: {
                                                pointerEvents: 'auto',
                                                cursor: 'pointer',
                                                zIndex: 10010,
                                                position: 'relative',
                                                isolation: 'isolate',
                                                touchAction: 'manipulation',
                                            }, children: [_jsx(X, { size: 16 }), _jsx("span", { children: "Decline" })] }), _jsxs("button", { type: "button", disabled: !termsChecked, onClick: e => {
                                                if (!termsChecked) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                console.log('[TermsAcceptance] Accept button onClick triggered');
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleAccept();
                                            }, onMouseDown: e => {
                                                if (!termsChecked) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                console.log('[TermsAcceptance] Accept button onMouseDown triggered');
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Don't call handleAccept here - let onClick handle it
                                            }, onPointerDown: e => {
                                                if (!termsChecked) {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    return;
                                                }
                                                console.log('[TermsAcceptance] Accept button onPointerDown triggered');
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Don't call handleAccept here - let onClick handle it
                                            }, className: `px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 active:scale-95 ${termsChecked
                                                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                                : 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'}`, style: {
                                                pointerEvents: 'auto',
                                                cursor: termsChecked ? 'pointer' : 'not-allowed',
                                                zIndex: 10010,
                                                position: 'relative',
                                                isolation: 'isolate',
                                                touchAction: 'manipulation',
                                            }, children: [_jsx(Check, { size: 16 }), _jsx("span", { children: "Accept" })] })] })] }) })] }) }, "terms-acceptance-modal") }));
}
