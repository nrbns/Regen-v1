import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Perplexity-Style Research Mode Panel
 * Clean AI research interface - NO TABS, NO WEBVIEWS, PURE AI
 */
import { useState, useEffect } from 'react';
import { Search, Sparkles, ArrowRight, ExternalLink, CheckCircle2, XCircle, Globe, TrendingUp, } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../state/settingsStore';
import { useAppStore } from '../../state/appStore';
import { getLanguageMeta } from '../../constants/languageMeta';
import { SearchStatusIndicator } from '../search/SearchStatusIndicator';
import { LanguageSelector } from '../integrations/LanguageSelector';
const EXAMPLES = [
    'Compare Nifty vs BankNifty',
    'हिंदी में iPhone 16 vs Samsung S25',
    'தமிழில் AI trading strategy',
    'Best mutual funds for 2026',
    'निफ्टी की तुलना करें',
    'நிஃப்டி ஒப்பீடு',
];
export default function ResearchModePanel({ query: parentQuery = '', result: parentResult = null, loading: parentLoading = false, error: parentError = null, onSearch, onFollowUp, }) {
    const [query, setQuery] = useState(parentQuery);
    const [followUp, setFollowUp] = useState('');
    const language = useSettingsStore(state => state.language || 'en');
    const [selectedLang, setSelectedLang] = useState((language === 'auto' ? 'en' : language));
    const langMeta = getLanguageMeta(selectedLang);
    const currentMode = useAppStore(state => state.mode);
    const setMode = useAppStore(state => state.setMode);
    // Sync query with parent
    useEffect(() => {
        if (parentQuery !== query) {
            setQuery(parentQuery);
        }
    }, [parentQuery]);
    const handleSubmit = (q) => {
        if (!q.trim())
            return;
        setQuery(q);
        onSearch?.(q);
    };
    const handleFollowUp = (q) => {
        if (!q.trim())
            return;
        setFollowUp('');
        onFollowUp?.(q);
    };
    const handleOpenSource = (url) => {
        // Open in new window instead of tab
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    const result = parentResult;
    const loading = parentLoading;
    const error = parentError;
    return (_jsxs("div", { className: "flex h-full flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white", children: [_jsxs("div", { className: "flex-shrink-0 border-b border-purple-800/50 bg-black/20 p-6 backdrop-blur-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(SearchStatusIndicator, {}), _jsx("div", { className: "rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-2", children: _jsx(Sparkles, { className: "h-6 w-6 text-purple-400" }) }), _jsxs("div", { children: [_jsx("h1", { className: "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-2xl font-bold text-transparent", children: "Research Mode" }), _jsx("p", { className: "text-sm text-gray-400", children: "AI-powered research in any language" })] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-1 rounded-lg border border-slate-700/50 bg-slate-800/60 p-1", children: [_jsxs("button", { onClick: () => setMode('Browse'), className: `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${currentMode === 'Browse'
                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'}`, title: "Switch to Browse Mode", children: [_jsx(Globe, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: "Browse" })] }), _jsxs("button", { onClick: () => setMode('Research'), className: `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${currentMode === 'Research'
                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'}`, title: "Switch to Research Mode", children: [_jsx(Sparkles, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: "Research" })] }), _jsxs("button", { onClick: () => setMode('Trade'), className: `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${currentMode === 'Trade'
                                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                    : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'}`, title: "Switch to Trade Mode", children: [_jsx(TrendingUp, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: "Trade" })] })] }), _jsx(LanguageSelector, { defaultLanguage: selectedLang, onLanguageChange: lang => {
                                            setSelectedLang(lang);
                                            useSettingsStore.getState().setLanguage(lang);
                                        }, onTranslate: async (text, targetLang) => {
                                            // Use multi-language AI for translation
                                            const { multiLanguageAI } = await import('../../core/language/multiLanguageAI');
                                            return multiLanguageAI.translate(text, targetLang);
                                        } })] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: query, onChange: e => setQuery(e.target.value), onKeyDown: e => {
                                    if (e.key === 'Enter' && !loading) {
                                        handleSubmit(query);
                                    }
                                }, placeholder: selectedLang === 'hi'
                                    ? 'हिंदी में पूछें: निफ्टी vs बैंक निफ्टी'
                                    : selectedLang === 'ta'
                                        ? 'தமிழில் கேளுங்கள்: நிஃப்டி ஒப்பீடு'
                                        : 'Ask in any language: Compare Nifty vs BankNifty...', disabled: loading, className: "w-full rounded-2xl border border-slate-700/50 bg-slate-800/60 py-4 pl-12 pr-4 text-lg placeholder-gray-400 transition-all focus:outline-none focus:ring-4 focus:ring-purple-600/50 disabled:opacity-50" }), loading && (_jsx("div", { className: "absolute right-4 top-1/2 -translate-y-1/2", children: _jsx("div", { className: "h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" }) }))] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [error && (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "mb-6 rounded-xl border border-red-700/50 bg-red-900/20 p-4 text-red-200", children: error })), !result && !loading && (_jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "mx-auto mt-16 max-w-4xl text-center", children: [_jsx("h2", { className: "mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-5xl font-bold text-transparent", children: "Ask Regen in Any Language" }), _jsx("p", { className: "mb-8 text-xl text-gray-300", children: "Your best answers and agent handoffs land here automatically." }), _jsx("div", { className: "mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-2", children: EXAMPLES.map((ex, i) => (_jsxs(motion.button, { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, onClick: () => handleSubmit(ex), className: "group rounded-xl border border-slate-700/50 bg-slate-800/60 p-4 text-left transition-all hover:bg-slate-700/60", children: [_jsx("p", { className: "font-medium text-gray-200 transition-colors group-hover:text-white", children: ex }), _jsx(ArrowRight, { className: "mt-2 h-5 w-5 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100" })] }, i))) })] })), loading && (_jsx("div", { className: "mx-auto mt-16 max-w-4xl", children: _jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsx("div", { className: "h-12 w-12 animate-spin rounded-full border-4 border-purple-400 border-t-transparent" }), _jsxs("p", { className: "text-gray-400", children: ["Researching in ", langMeta.nativeName, "..."] })] }) })), result && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "mx-auto max-w-4xl space-y-6", children: [_jsxs("div", { className: "rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-xl", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsx("h3", { className: "text-2xl font-bold text-white", children: "Summary" }), (result.languageLabel || result.language) && (_jsxs("span", { className: "text-sm text-gray-400", children: [result.languageLabel || result.language, result.languageConfidence != null && (_jsxs("span", { className: "ml-2 text-gray-500", children: ["(", (result.languageConfidence * 100).toFixed(0), "% confidence)"] }))] }))] }), _jsx("div", { className: "prose prose-invert max-w-none", children: _jsx("p", { className: "whitespace-pre-wrap text-lg leading-relaxed text-gray-200", children: result.summary }) }), result.verification && (_jsxs("div", { className: `mt-4 rounded-xl border p-4 ${result.verification.verified
                                            ? 'border-green-700/50 bg-green-900/20'
                                            : 'border-yellow-700/50 bg-yellow-900/20'}`, children: [_jsxs("div", { className: "mb-2 flex items-center gap-2", children: [result.verification.verified ? (_jsx(CheckCircle2, { className: "h-5 w-5 text-green-400" })) : (_jsx(XCircle, { className: "h-5 w-5 text-yellow-400" })), _jsx("span", { className: "font-medium", children: result.verification.verified ? 'Verified' : 'Needs Review' })] }), _jsxs("div", { className: "space-y-1 text-sm text-gray-400", children: [_jsxs("div", { children: ["Citation Coverage:", ' ', result.verification.citationCoverage != null
                                                                ? `${result.verification.citationCoverage.toFixed(1)}%`
                                                                : 'N/A'] }), _jsxs("div", { children: ["Hallucination Risk:", ' ', result.verification.hallucinationRisk != null
                                                                ? `${(result.verification.hallucinationRisk * 100).toFixed(1)}%`
                                                                : 'N/A'] })] })] }))] }), result.prosCons &&
                                (result.prosCons.pros?.length > 0 ||
                                    result.prosCons.cons?.length > 0) && (_jsxs("div", { className: "grid gap-6 md:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl border border-green-700/50 bg-green-900/20 p-6", children: [_jsxs("h4", { className: "mb-4 flex items-center gap-2 text-xl font-bold text-green-400", children: [_jsx(CheckCircle2, { className: "h-5 w-5" }), "Pros"] }), _jsx("ul", { className: "space-y-3", children: (result.prosCons.pros || []).map((p, i) => (_jsxs("li", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-green-400" }), _jsx("span", { className: "text-gray-200", children: p.text })] }, i))) })] }), _jsxs("div", { className: "rounded-2xl border border-red-700/50 bg-red-900/20 p-6", children: [_jsxs("h4", { className: "mb-4 flex items-center gap-2 text-xl font-bold text-red-400", children: [_jsx(XCircle, { className: "h-5 w-5" }), "Cons"] }), _jsx("ul", { className: "space-y-3", children: (result.prosCons.cons || []).map((c, i) => (_jsxs("li", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" }), _jsx("span", { className: "text-gray-200", children: c.text })] }, i))) })] })] })), result.sources.length > 0 && (_jsxs("div", { className: "rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-xl", children: [_jsxs("h3", { className: "mb-4 text-xl font-bold", children: ["Sources (", result.sources.length, ")"] }), _jsx("div", { className: "space-y-3", children: result.sources.map((source, i) => (_jsx(motion.a, { href: source.url, target: "_blank", rel: "noopener noreferrer", initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.05 }, onClick: e => {
                                                e.preventDefault();
                                                handleOpenSource(source.url);
                                            }, className: "group block rounded-xl bg-slate-700/30 p-4 transition-all hover:bg-slate-700/50", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "mb-1 flex items-center gap-2", children: [_jsx("span", { className: "text-xs font-medium uppercase text-purple-400", children: source.sourceType || 'SOURCE' }), _jsxs("span", { className: "text-xs text-gray-500", children: ["Score: ", source.relevanceScore?.toFixed(1) || 'N/A'] })] }), _jsx("h4", { className: "line-clamp-1 font-medium text-gray-200 transition-colors group-hover:text-white", children: source.title }), _jsx("p", { className: "mt-1 line-clamp-2 text-sm text-gray-400", children: source.snippet }), _jsx("p", { className: "mt-2 text-xs text-gray-500", children: source.domain })] }), _jsx(ExternalLink, { className: "h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-purple-400" })] }) }, source.id || source.url || i))) })] })), _jsxs("div", { className: "flex gap-3", children: [_jsx("input", { type: "text", value: followUp, onChange: e => setFollowUp(e.target.value), onKeyDown: e => {
                                            if (e.key === 'Enter' && !loading) {
                                                handleFollowUp(followUp);
                                            }
                                        }, placeholder: "Ask a follow-up question...", disabled: loading, className: "flex-1 rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50" }), _jsx("button", { onClick: () => handleFollowUp(followUp), disabled: loading || !followUp.trim(), className: "rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-bold transition-all hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50", children: "Ask" })] })] }))] })] }));
}
