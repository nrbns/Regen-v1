/**
 * Unified AI Bar Component
 * Phase 2, Day 5: Unified AI Bar - Consistent AI interface across all modes
 */

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import { VoicePipelineButton } from '../voice/VoicePipelineButton';
import { useVoicePipeline } from '../../hooks/useVoicePipeline';
// import { toast } from '../../utils/toast'; // Unused

export interface UnifiedAIBarProps {
  mode: 'research' | 'trade' | 'docs' | 'browse' | 'agent';
  onSubmit: (query: string, options?: { voice?: boolean }) => void;
  placeholder?: string;
  disabled?: boolean;
  showHistory?: boolean;
  showVoice?: boolean;
  className?: string;
}

export function UnifiedAIBar({
  mode,
  onSubmit,
  placeholder,
  disabled = false,
  showHistory: _showHistory = true,
  showVoice = true,
  className = '',
}: UnifiedAIBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const language = useSettingsStore(state => state.language || 'en');
  const voiceTTSEnabled = useSettingsStore(state => state.general.voiceTTSEnabled ?? true);

  // Phase 2, Day 5: Voice pipeline integration
  const { isListening: _isListening, speakResponse: _speakResponse } = useVoicePipeline(
    (text, _detectedLang) => {
      setQuery(text);
      onSubmit(text, { voice: true });
    },
    {
      enableTTS: voiceTTSEnabled,
      autoDetectLanguage: true,
    }
  );

  // Phase 2, Day 5: Mode-specific placeholders
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    
    const placeholders: Record<string, Record<string, string>> = {
      en: {
        research: 'Ask anything: "Compare Nifty vs BankNifty"',
        trade: 'Voice command: "Buy Nifty 50" or "Sell BTC"',
        docs: 'Ask about your documents...',
        browse: 'Search or ask WISPR...',
        agent: 'What should I do?',
      },
      hi: {
        research: 'कुछ भी पूछें: "Nifty vs BankNifty की तुलना करें"',
        trade: 'आवाज आदेश: "Nifty 50 खरीदें" या "BTC बेचें"',
        docs: 'अपने दस्तावेजों के बारे में पूछें...',
        browse: 'खोजें या WISPR से पूछें...',
        agent: 'मुझे क्या करना चाहिए?',
      },
    };

    return placeholders[language]?.[mode] || placeholders.en[mode] || 'Ask anything...';
  };

  // Phase 2, Day 5: Handle submit
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!query.trim() || disabled) return;

      onSubmit(query.trim());
      setQuery('');
      setShowSuggestions(false);
    },
    [query, disabled, onSubmit]
  );

  // Phase 2, Day 5: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  // Phase 2, Day 5: Focus management
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative flex items-center gap-2 rounded-xl border bg-slate-900/50 backdrop-blur-sm transition-all ${
            isFocused
              ? 'border-purple-500/50 shadow-lg shadow-purple-500/20'
              : 'border-slate-700 hover:border-slate-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* AI Icon */}
          <div className="flex items-center justify-center pl-4">
            <Sparkles
              className={`h-5 w-5 transition-colors ${
                isFocused ? 'text-purple-400' : 'text-slate-400'
              }`}
            />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay to allow button clicks
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder={getPlaceholder()}
            disabled={disabled}
            className="flex-1 bg-transparent py-4 text-sm text-white placeholder-slate-500 focus:outline-none disabled:cursor-not-allowed"
          />

          {/* Voice Button */}
          {showVoice && (
            <div className="pr-2">
              <VoicePipelineButton
                onResult={(text, _lang) => {
                  setQuery(text);
                  onSubmit(text, { voice: true });
                }}
                small={true}
                enableTTS={voiceTTSEnabled}
                autoSpeakResponse={false}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!query.trim() || disabled}
            className={`mr-2 rounded-lg p-2 transition-all ${
              query.trim() && !disabled
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
            title="Submit (Ctrl/Cmd + Enter)"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {/* Suggestions (Future Enhancement) */}
      <AnimatePresence>
        {showSuggestions && isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-50 mt-2 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl"
          >
            <div className="text-xs text-slate-400 mb-2 px-2">Suggestions</div>
            {/* Suggestions would go here */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

