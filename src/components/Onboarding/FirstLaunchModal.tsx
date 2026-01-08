/**
 * First Launch Modal - Day 3: Enhanced Onboarding
 * Shows AI setup progress with emoji themes and smooth animations
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Brain, CheckCircle2, Loader2 } from 'lucide-react';

interface FirstLaunchModalProps {
  progress: number;
  status: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function FirstLaunchModal({ progress, status, onComplete, onSkip }: FirstLaunchModalProps) {
  const [showEmoji, setShowEmoji] = useState(true);

  useEffect(() => {
    if (progress >= 100) {
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  }, [progress, onComplete]);

  const emojiThemes = ['🚀', '✨', '🧠', '⚡', '🎯', '🌟'];
  const currentEmoji = emojiThemes[Math.floor((progress / 100) * emojiThemes.length)];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="mx-4 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-6 text-center">
            {showEmoji && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 text-6xl">
                {currentEmoji}
              </motion.div>
            )}
            <h2 className="mb-2 text-2xl font-bold text-white">AI Brain Awakening...</h2>
            <p className="text-sm text-slate-400">{status}</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-slate-400">Setup Progress</span>
              <span className="text-sm font-medium text-white">{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600"
              />
            </div>
          </div>

          {/* Status Steps */}
          <div className="mb-6 space-y-3">
            {[
              { label: 'Installing Ollama', icon: Zap, done: progress > 20 },
              { label: 'Downloading AI Models', icon: Brain, done: progress > 50 },
              { label: 'Setting Up WISPR', icon: Sparkles, done: progress > 80 },
            ].map((step, index) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 text-sm"
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : progress > index * 30 ? (
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-600" />
                )}
                <span className={step.done ? 'text-white' : 'text-slate-400'}>{step.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-slate-600"
              >
                Skip Setup
              </button>
            )}
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-slate-600"
            >
              {showEmoji ? '🎨' : '✨'}
            </button>
          </div>

          {/* Footer */}
          <p className="mt-4 text-center text-xs text-slate-500">
            This is a one-time setup. Your AI will be ready in a moment!
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
