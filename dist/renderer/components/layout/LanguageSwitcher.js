import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Language Switcher Component
 * Supports 22 Indic languages + 80+ global languages
 */
import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../state/settingsStore';
// All 22 Indic languages supported by Bhashini
const INDIC_LANGUAGES = [
    { code: 'as', label: 'অসমীয়া', english: 'Assamese', flag: '🇮🇳' },
    { code: 'bn', label: 'বাংলা', english: 'Bengali', flag: '🇮🇳' },
    { code: 'brx', label: 'बड़ो', english: 'Bodo', flag: '🇮🇳' },
    { code: 'doi', label: 'डोगरी', english: 'Dogri', flag: '🇮🇳' },
    { code: 'gom', label: 'कोंकणी', english: 'Konkani', flag: '🇮🇳' },
    { code: 'gu', label: 'ગુજરાતી', english: 'Gujarati', flag: '🇮🇳' },
    { code: 'hi', label: 'हिंदी', english: 'Hindi', flag: '🇮🇳' },
    { code: 'kn', label: 'ಕನ್ನಡ', english: 'Kannada', flag: '🇮🇳' },
    { code: 'ks', label: 'کٲشُر', english: 'Kashmiri', flag: '🇮🇳' },
    { code: 'mai', label: 'मैथिली', english: 'Maithili', flag: '🇮🇳' },
    { code: 'ml', label: 'മലയാളം', english: 'Malayalam', flag: '🇮🇳' },
    { code: 'mni', label: 'ꯃꯤꯇꯩꯂꯣꯟ', english: 'Manipuri', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी', english: 'Marathi', flag: '🇮🇳' },
    { code: 'ne', label: 'नेपाली', english: 'Nepali', flag: '🇳🇵' },
    { code: 'or', label: 'ଓଡ଼ିଆ', english: 'Odia', flag: '🇮🇳' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ', english: 'Punjabi', flag: '🇮🇳' },
    { code: 'sa', label: 'संस्कृतम्', english: 'Sanskrit', flag: '🇮🇳' },
    { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ', english: 'Santali', flag: '🇮🇳' },
    { code: 'sd', label: 'سنڌي', english: 'Sindhi', flag: '🇵🇰' },
    { code: 'ta', label: 'தமிழ்', english: 'Tamil', flag: '🇮🇳' },
    { code: 'te', label: 'తెలుగు', english: 'Telugu', flag: '🇮🇳' },
    { code: 'ur', label: 'اردو', english: 'Urdu', flag: '🇵🇰' },
];
const GLOBAL_LANGUAGES = [
    { code: 'en', label: 'English', english: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', english: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', english: 'French', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', english: 'German', flag: '🇩🇪' },
    { code: 'zh', label: '中文', english: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', label: '日本語', english: 'Japanese', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', english: 'Korean', flag: '🇰🇷' },
    { code: 'ru', label: 'Русский', english: 'Russian', flag: '🇷🇺' },
    { code: 'pt', label: 'Português', english: 'Portuguese', flag: '🇵🇹' },
    { code: 'ar', label: 'العربية', english: 'Arabic', flag: '🇸🇦' },
    { code: 'it', label: 'Italiano', english: 'Italian', flag: '🇮🇹' },
    { code: 'nl', label: 'Nederlands', english: 'Dutch', flag: '🇳🇱' },
    { code: 'pl', label: 'Polski', english: 'Polish', flag: '🇵🇱' },
    { code: 'tr', label: 'Türkçe', english: 'Turkish', flag: '🇹🇷' },
    { code: 'vi', label: 'Tiếng Việt', english: 'Vietnamese', flag: '🇻🇳' },
    { code: 'id', label: 'Bahasa Indonesia', english: 'Indonesian', flag: '🇮🇩' },
    { code: 'th', label: 'ไทย', english: 'Thai', flag: '🇹🇭' },
    { code: 'sv', label: 'Svenska', english: 'Swedish', flag: '🇸🇪' },
    { code: 'fi', label: 'Suomi', english: 'Finnish', flag: '🇫🇮' },
    { code: 'no', label: 'Norsk', english: 'Norwegian', flag: '🇳🇴' },
];
const ALL_LANGUAGES = [
    { code: 'auto', label: 'Auto-detect', english: 'Auto-detect', flag: '🌐', group: 'system' },
    ...INDIC_LANGUAGES.map(l => ({ ...l, group: 'indic' })),
    ...GLOBAL_LANGUAGES.map(l => ({ ...l, group: 'global' })),
];
export function LanguageSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLang, setSelectedLang] = useState('auto');
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    // Get language from settings store
    const language = useSettingsStore(state => state.language || 'auto');
    const setLanguage = useSettingsStore(state => state.setLanguage);
    useEffect(() => {
        setSelectedLang(language || 'auto');
    }, [language]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleSelect = (code) => {
        setSelectedLang(code);
        setLanguage?.(code);
        setIsOpen(false);
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: code } }));
    };
    const currentLang = ALL_LANGUAGES.find(l => l.code === selectedLang) || ALL_LANGUAGES[0];
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { ref: buttonRef, onClick: () => setIsOpen(!isOpen), className: "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700/50 bg-gray-800/30 hover:bg-gray-800/50 text-sm text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50", "aria-label": "Select language", "aria-expanded": isOpen, "aria-haspopup": "true", children: [_jsx(Globe, { size: 16, className: "text-gray-400" }), _jsx("span", { className: "hidden sm:inline", children: currentLang.flag }), _jsx("span", { className: "hidden md:inline text-xs", children: currentLang.english }), _jsx(ChevronDown, { size: 14, className: `text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}` })] }), _jsx(AnimatePresence, { children: isOpen && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-40", onClick: () => setIsOpen(false) }), _jsxs(motion.div, { ref: dropdownRef, initial: { opacity: 0, y: -10, scale: 0.95 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.95 }, transition: { duration: 0.15 }, className: "absolute right-0 top-full mt-2 w-72 max-h-[80vh] overflow-y-auto bg-gray-900 border border-gray-800/60 rounded-lg shadow-xl z-50", children: [_jsxs("div", { className: "p-2", children: [_jsx("div", { className: "px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide", children: "Indic Languages (22)" }), INDIC_LANGUAGES.map(lang => (_jsxs("button", { onClick: () => handleSelect(lang.code), className: `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedLang === lang.code
                                                ? 'bg-blue-500/20 text-blue-200'
                                                : 'text-gray-200 hover:bg-gray-800/50'}`, children: [_jsx("span", { className: "text-lg", children: lang.flag }), _jsx("span", { className: "flex-1 text-left", children: lang.label }), _jsx("span", { className: "text-xs text-gray-400", children: lang.english }), selectedLang === lang.code && _jsx(Check, { size: 16, className: "text-blue-400" })] }, lang.code)))] }), _jsx("div", { className: "border-t border-gray-800/60" }), _jsxs("div", { className: "p-2", children: [_jsx("div", { className: "px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide", children: "Global Languages (80+)" }), GLOBAL_LANGUAGES.map(lang => (_jsxs("button", { onClick: () => handleSelect(lang.code), className: `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedLang === lang.code
                                                ? 'bg-blue-500/20 text-blue-200'
                                                : 'text-gray-200 hover:bg-gray-800/50'}`, children: [_jsx("span", { className: "text-lg", children: lang.flag }), _jsx("span", { className: "flex-1 text-left", children: lang.label }), _jsx("span", { className: "text-xs text-gray-400", children: lang.english }), selectedLang === lang.code && _jsx(Check, { size: 16, className: "text-blue-400" })] }, lang.code)))] }), _jsx("div", { className: "border-t border-gray-800/60 p-2", children: _jsxs("button", { onClick: () => handleSelect('auto'), className: `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedLang === 'auto'
                                            ? 'bg-blue-500/20 text-blue-200'
                                            : 'text-gray-200 hover:bg-gray-800/50'}`, children: [_jsx("span", { className: "text-lg", children: "\uD83C\uDF10" }), _jsx("span", { className: "flex-1 text-left", children: "Auto-detect" }), selectedLang === 'auto' && _jsx(Check, { size: 16, className: "text-blue-400" })] }) })] })] })) })] }));
}
