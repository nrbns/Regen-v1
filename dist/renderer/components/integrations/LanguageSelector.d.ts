/**
 * Language Selector Component
 * Integrates multi-language AI into UI
 */
import { type SupportedLanguage } from '../../core/language/multiLanguageAI';
interface LanguageSelectorProps {
    onLanguageChange?: (lang: SupportedLanguage) => void;
    onTranslate?: (text: string, targetLang: SupportedLanguage) => Promise<string>;
    defaultLanguage?: SupportedLanguage;
}
export declare function LanguageSelector({ onLanguageChange, onTranslate: _onTranslate, defaultLanguage, }: LanguageSelectorProps): import("react/jsx-runtime").JSX.Element;
export declare function handleTextInput(text: string): Promise<SupportedLanguage>;
export declare function handleTranslate(text: string, targetLang: SupportedLanguage, sourceLang?: SupportedLanguage): Promise<string>;
export {};
