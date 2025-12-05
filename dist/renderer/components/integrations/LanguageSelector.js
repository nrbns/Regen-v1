import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Language Selector Component
 * Integrates multi-language AI into UI
 */
import { useState } from 'react';
import { multiLanguageAI, LANGUAGE_METADATA, } from '../../core/language/multiLanguageAI';
import { Globe } from 'lucide-react';
export function LanguageSelector({ onLanguageChange, onTranslate: _onTranslate, defaultLanguage = 'en', }) {
    const [selectedLang, setSelectedLang] = useState(defaultLanguage);
    const [detectedLang, _setDetectedLang] = useState(null);
    const handleLanguageSelect = (lang) => {
        setSelectedLang(lang);
        onLanguageChange?.(lang);
    };
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Globe, { className: "h-4 w-4 text-neutral-400" }), _jsx("select", { value: selectedLang, onChange: e => handleLanguageSelect(e.target.value), className: "rounded border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 focus:border-emerald-500 focus:outline-none", children: Object.entries(LANGUAGE_METADATA).map(([code, meta]) => (_jsxs("option", { value: code, children: [meta.nativeName, " (", meta.name, ")"] }, code))) })] }), detectedLang && detectedLang !== selectedLang && (_jsxs("div", { className: "text-xs text-neutral-500", children: ["Detected: ", LANGUAGE_METADATA[detectedLang].nativeName] }))] }));
}
// Export helper functions
export async function handleTextInput(text) {
    return multiLanguageAI.detectLanguage(text);
}
export async function handleTranslate(text, targetLang, sourceLang) {
    return multiLanguageAI.translate(text, targetLang, sourceLang);
}
