/**
 * Share Button with Auto-Translation
 * Enables viral family sharing loop (WhatsApp's secret)
 */

import { useState, useRef, useEffect } from 'react';
import { Share2, Globe, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../state/settingsStore';
import { useLanguageState } from '../state/languageState';
import { getLanguageMeta, LANGUAGE_META } from '../constants/languageMeta';
import toast from 'react-hot-toast';

interface ShareButtonProps {
  url?: string;
  title?: string;
  className?: string;
  showLabel?: boolean;
}

export function ShareButton({ url, title, className, showLabel = false }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [_translationPreview, _setTranslationPreview] = useState<string | null>(null);
  const [_previewLoading, _setPreviewLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUrl = url || window.location.href;
  const currentTitle = title || document.title;
  const languagePreference = useSettingsStore(state => state.language || 'auto');
  const detectedLanguage = useLanguageState(state => state.detectedLanguage);

  const handleShare = async (targetLanguage?: string) => {
    try {
      setTranslating(true);
      setShareSuccess(false);

      // Get target language
      const targetLang = targetLanguage || selectedLanguage || languagePreference;
      let finalUrl = currentUrl;
      let finalTitle = currentTitle;

      // Translate if needed
      if (targetLang !== 'auto' && targetLang !== detectedLanguage) {
        try {
          toast.loading('Translating...');
          // Call translation service
          const translated = await translatePageContent(currentTitle, currentUrl, targetLang);
          finalTitle = translated.title || currentTitle;
          finalUrl = translated.url || currentUrl;

          toast.dismiss();
          toast.success(`Translated to ${getLanguageMeta(targetLang).nativeName}`);
        } catch (error) {
          console.error('[ShareButton] Translation failed:', error);
          toast.dismiss();
          toast.error('Translation failed, sharing original');
        }
      }

      // Use Web Share API if available (mobile)
      if (navigator.share) {
        await navigator.share({
          title: finalTitle,
          text: `Check this out - ${finalTitle}`,
          url: finalUrl,
        });
        setShareSuccess(true);
        toast.success('Shared successfully!');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(`${finalTitle}\n${finalUrl}`);
        setShareSuccess(true);
        toast.success('Link copied to clipboard!');
      }

      setIsOpen(false);

      // Track share event for analytics
      if (typeof window !== 'undefined' && (window as any).__analytics__) {
        (window as any).__analytics__.track('share', {
          url: finalUrl,
          language: targetLang,
          platform: 'web_share_api',
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('[ShareButton] Share failed:', error);
        toast.error('Failed to share');
      }
    } finally {
      setTranslating(false);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className || ''}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 text-sm text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-label="Share page"
        disabled={translating}
      >
        {translating ? (
          <Loader2 size={16} className="animate-spin text-blue-400" />
        ) : shareSuccess ? (
          <CheckCircle2 size={16} className="text-emerald-400" />
        ) : (
          <Share2 size={16} className="text-slate-400" />
        )}
        {showLabel && <span className="text-xs">Share</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800/60 rounded-lg shadow-xl z-50 p-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={16} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-200">Share & Translate</span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Share in language:</label>
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="auto">Auto-detect</option>
                    {Object.values(LANGUAGE_META).map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.nativeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleShare()}
                    disabled={translating}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {translating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={14} />
                        <span>Share</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      // Quick share to WhatsApp (if on mobile)
                      if (/WhatsApp|Android|iPhone/i.test(navigator.userAgent)) {
                        window.open(
                          `whatsapp://send?text=${encodeURIComponent(
                            `${currentTitle}\n${currentUrl}`
                          )}`,
                          '_blank'
                        );
                      } else {
                        window.open(
                          `https://wa.me/?text=${encodeURIComponent(
                            `${currentTitle}\n${currentUrl}`
                          )}`,
                          '_blank'
                        );
                      }
                      setIsOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-emerald-600/40 bg-emerald-600/10 text-emerald-300 text-sm font-medium hover:bg-emerald-600/20 transition-colors"
                  >
                    <span>📱</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={async () => {
                      if (!currentTitle) return;
                      try {
                        const { playTTS } = await import('../services/ttsService');
                        const lang =
                          selectedLanguage === 'auto' ? detectedLanguage || 'en' : selectedLanguage;
                        await playTTS(currentTitle, lang);
                        toast.success('Playing audio narration');
                      } catch (error) {
                        console.error('[ShareButton] TTS failed:', error);
                        toast.error('Audio narration not available');
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    title="Play audio narration"
                  >
                    🔊 Play
                  </button>
                  <p className="text-xs text-slate-500 flex-1">
                    Share in any language - we'll translate it automatically for your recipient.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Translate page content using Bhashini or fallback
 */
async function translatePageContent(
  title: string,
  url: string,
  targetLanguage: string
): Promise<{ title: string; url: string }> {
  // Import translation service dynamically
  const { translatePageContent: translate } = await import('../services/translateService');
  return translate(title, url, targetLanguage);
}
