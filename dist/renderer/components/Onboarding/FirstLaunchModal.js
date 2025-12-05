import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * First Launch Modal - Day 3: Enhanced Onboarding
 * Shows AI setup progress with emoji themes and smooth animations
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Brain, CheckCircle2, Loader2 } from 'lucide-react';
export function FirstLaunchModal({ progress, status, onComplete, onSkip }) {
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
    return (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center", children: _jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, className: "bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4", children: [_jsxs("div", { className: "text-center mb-6", children: [showEmoji && (_jsx(motion.div, { initial: { scale: 0 }, animate: { scale: 1 }, className: "text-6xl mb-4", children: currentEmoji })), _jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "AI Brain Awakening..." }), _jsx("p", { className: "text-slate-400 text-sm", children: status })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm text-slate-400", children: "Setup Progress" }), _jsxs("span", { className: "text-sm font-medium text-white", children: [progress, "%"] })] }), _jsx("div", { className: "w-full bg-slate-800 rounded-full h-3 overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${progress}%` }, transition: { duration: 0.3, ease: 'easeOut' }, className: "h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" }) })] }), _jsx("div", { className: "space-y-3 mb-6", children: [
                            { label: 'Installing Ollama', icon: Zap, done: progress > 20 },
                            { label: 'Downloading AI Models', icon: Brain, done: progress > 50 },
                            { label: 'Setting Up WISPR', icon: Sparkles, done: progress > 80 },
                        ].map((step, index) => (_jsxs(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { delay: index * 0.1 }, className: "flex items-center gap-3 text-sm", children: [step.done ? (_jsx(CheckCircle2, { className: "w-5 h-5 text-emerald-500" })) : progress > index * 30 ? (_jsx(Loader2, { className: "w-5 h-5 text-purple-500 animate-spin" })) : (_jsx("div", { className: "w-5 h-5 rounded-full border-2 border-slate-600" })), _jsx("span", { className: step.done ? 'text-white' : 'text-slate-400', children: step.label })] }, step.label))) }), _jsxs("div", { className: "flex gap-3", children: [onSkip && (_jsx("button", { onClick: onSkip, className: "flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors", children: "Skip Setup" })), _jsx("button", { onClick: () => setShowEmoji(!showEmoji), className: "px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors", children: showEmoji ? '🎨' : '✨' })] }), _jsx("p", { className: "text-xs text-slate-500 text-center mt-4", children: "This is a one-time setup. Your AI will be ready in a moment!" })] }) }) }));
}
