import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * CookieConsent - GDPR-Compliant Cookie Consent Banner
 *
 * Displays cookie consent options and stores user preferences.
 * Complies with GDPR requirements for cookie consent.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings, X, Check, AlertCircle, Info } from 'lucide-react';
const COOKIE_VERSION = '2025-12-17';
export function CookieConsent({ onAccept, onDecline, showSettings = false }) {
    const [preferences, setPreferences] = useState({
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
        }
        catch {
            // Invalid stored data, use defaults
        }
    }, []);
    const handleAcceptAll = () => {
        const allAccepted = {
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
        const minimal = {
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
    const toggleCategory = (category) => {
        if (category === 'essential')
            return; // Can't disable essential
        setPreferences(prev => ({
            ...prev,
            [category]: !prev[category],
        }));
    };
    const cookieCategories = [
        {
            id: 'essential',
            name: 'Essential Cookies',
            description: 'Required for the app to function. These cannot be disabled.',
            required: true,
            examples: ['Session management', 'Security', 'Authentication'],
        },
        {
            id: 'analytics',
            name: 'Analytics Cookies',
            description: 'Help us understand how you use Regen to improve the experience.',
            required: false,
            examples: ['Usage statistics', 'Performance metrics', 'Error tracking'],
        },
        {
            id: 'functional',
            name: 'Functional Cookies',
            description: 'Enable enhanced features and personalization.',
            required: false,
            examples: ['Preferences', 'Settings', 'Theme selection'],
        },
        {
            id: 'advertising',
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
    return (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0, y: 100 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 100 }, className: "fixed bottom-0 left-0 right-0 z-[10001] p-4", style: { pointerEvents: 'auto' }, children: _jsx("div", { className: "max-w-4xl mx-auto", children: _jsxs(motion.div, { initial: { scale: 0.95 }, animate: { scale: 1 }, className: "bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden", onClick: e => {
                        // Completely ignore button clicks - don't interfere at all
                        const target = e.target;
                        if (target.closest('button') ||
                            target.closest('[role="button"]') ||
                            target.closest('a')) {
                            return; // Don't do anything - let button handle it completely
                        }
                        // Only stop propagation for non-button clicks
                        e.stopPropagation();
                    }, onMouseDown: e => {
                        // Completely ignore button clicks - don't interfere at all
                        const target = e.target;
                        if (target.closest('button') ||
                            target.closest('[role="button"]') ||
                            target.closest('a')) {
                            return; // Don't do anything - let button handle it completely
                        }
                    }, children: [_jsxs("div", { className: "flex items-center gap-3 p-6 border-b border-gray-700", children: [_jsx("div", { className: "p-2 bg-blue-500/20 rounded-lg", children: _jsx(Cookie, { size: 24, className: "text-blue-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-100", children: "Cookie Preferences" }), _jsx("p", { className: "text-sm text-gray-400 mt-1", children: "We use cookies to enhance your browsing experience and analyze usage." })] }), showSettings && (_jsx("button", { type: "button", onClick: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                        setShowDetails(false);
                                    }, onMouseDown: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                    }, className: "p-2 hover:bg-gray-700 rounded-lg transition-colors", "aria-label": "Close", style: {
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                        zIndex: 10011,
                                        isolation: 'isolate',
                                    }, children: _jsx(X, { size: 20, className: "text-gray-400" }) }))] }), _jsx("div", { className: "p-6 max-h-[60vh] overflow-y-auto", children: showDetails ? (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Info, { size: 16, className: "text-blue-400 mt-0.5 flex-shrink-0" }), _jsxs("p", { className: "text-sm text-blue-200", children: [_jsx("strong", { children: "Your Privacy Matters:" }), " Regen stores data locally on your device by default. Cookies and similar technologies are used only for essential functionality and optional analytics. You can change these preferences at any time in Settings."] })] }) }), cookieCategories.map(category => (_jsx("div", { className: `p-4 rounded-lg border ${preferences[category.id]
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-gray-900/50 border-gray-700'}`, children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("h3", { className: "font-semibold text-gray-100", children: category.name }), category.required && (_jsx("span", { className: "text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded", children: "Required" }))] }), _jsx("p", { className: "text-sm text-gray-400 mb-2", children: category.description }), _jsxs("div", { className: "text-xs text-gray-500", children: [_jsx("strong", { children: "Examples:" }), " ", category.examples.join(', ')] })] }), _jsx("div", { className: "flex items-center gap-2", children: category.required ? (_jsx("div", { className: "px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm font-medium", children: "Always On" })) : (_jsx("button", { type: "button", onClick: e => {
                                                            e.preventDefault();
                                                            e.stopImmediatePropagation();
                                                            e.stopPropagation();
                                                            toggleCategory(category.id);
                                                        }, onMouseDown: e => {
                                                            e.preventDefault();
                                                            e.stopImmediatePropagation();
                                                            e.stopPropagation();
                                                        }, className: `px-3 py-1.5 rounded text-sm font-medium transition-colors ${preferences[category.id]
                                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`, style: {
                                                            pointerEvents: 'auto',
                                                            cursor: 'pointer',
                                                            zIndex: 10011,
                                                            isolation: 'isolate',
                                                        }, children: preferences[category.id] ? (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Check, { size: 14 }), "Enabled"] })) : ('Disabled') })) })] }) }, category.id))), _jsx("div", { className: "p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertCircle, { size: 16, className: "text-yellow-400 mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "text-sm text-yellow-200", children: [_jsx("strong", { children: "Note:" }), " Disabling non-essential cookies may limit some features. Essential cookies are required for the app to function properly."] })] }) })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-gray-300", children: "We use cookies to provide essential functionality and optional analytics. Your data is stored locally on your device by default." }), _jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-400", children: [_jsx(Info, { size: 14 }), _jsx("span", { children: "You can customize cookie preferences or accept all cookies." })] })] })) }), _jsxs("div", { className: "flex items-center justify-between p-6 border-t border-gray-700 gap-4 bg-gray-900/50", children: [_jsxs("button", { type: "button", onClick: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                        setShowDetails(!showDetails);
                                    }, onMouseDown: e => {
                                        e.preventDefault();
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                    }, className: "px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-200 transition-colors flex items-center gap-2", style: {
                                        pointerEvents: 'auto',
                                        cursor: 'pointer',
                                        zIndex: 10011,
                                        isolation: 'isolate',
                                    }, children: [_jsx(Settings, { size: 16 }), _jsx("span", { children: showDetails ? 'Hide Details' : 'Customize' })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleDecline();
                                            }, onMouseDown: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-200 transition-colors", style: {
                                                pointerEvents: 'auto',
                                                cursor: 'pointer',
                                                zIndex: 10011,
                                                isolation: 'isolate',
                                            }, children: "Accept Essential Only" }), showDetails ? (_jsxs("button", { type: "button", onClick: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleAcceptSelected();
                                            }, onMouseDown: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2", style: {
                                                pointerEvents: 'auto',
                                                cursor: 'pointer',
                                                zIndex: 10011,
                                                isolation: 'isolate',
                                            }, children: [_jsx(Check, { size: 16 }), _jsx("span", { children: "Save Preferences" })] })) : (_jsxs("button", { type: "button", onClick: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                handleAcceptAll();
                                            }, onMouseDown: e => {
                                                e.preventDefault();
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2", style: {
                                                pointerEvents: 'auto',
                                                cursor: 'pointer',
                                                zIndex: 10011,
                                                isolation: 'isolate',
                                            }, children: [_jsx(Check, { size: 16 }), _jsx("span", { children: "Accept All" })] }))] })] })] }) }) }) }));
}
/**
 * Hook to check if cookie consent has been given
 */
export function useCookieConsent() {
    const [hasConsented, setHasConsented] = useState(false);
    const [preferences, setPreferences] = useState(null);
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
        }
        catch {
            setShowBanner(true);
        }
    }, []);
    const _handleAccept = (prefs) => {
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
export function getCookiePreferences() {
    try {
        const stored = localStorage.getItem('regen:cookie-consent');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.version === COOKIE_VERSION) {
                return data;
            }
        }
    }
    catch {
        // Invalid data
    }
    return null;
}
/**
 * Check if a specific cookie category is enabled
 */
export function isCookieCategoryEnabled(category) {
    const prefs = getCookiePreferences();
    if (!prefs)
        return category === 'essential'; // Default to essential only
    return prefs[category] ?? false;
}
