import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Quick Start Tour Component
 * DAY 9 FIX: 1-minute guided tour for first-time users
 * Focuses on Omni AI and key features
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Search, TrendingUp, Mic, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../../state/appStore';
const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to RegenBrowser!',
        description: 'Your AI-powered browser with voice commands, research, and trading. Let\'s get started!',
        icon: _jsx(Sparkles, { className: "w-6 h-6" }),
    },
    {
        id: 'omni-ai',
        title: 'AI Omni Mode',
        description: 'Press Ctrl+Shift+O or click the AI button to access 6 AI modes: Search, Code, Research, Writing, Translate, and Image.',
        icon: _jsx(Sparkles, { className: "w-6 h-6" }),
        action: () => {
            // Trigger Omni AI mode
            const event = new KeyboardEvent('keydown', {
                key: 'o',
                ctrlKey: true,
                shiftKey: true,
            });
            window.dispatchEvent(event);
        },
    },
    {
        id: 'research',
        title: 'Research Mode',
        description: 'Switch to Research mode for AI-powered web research with real-time citations and summaries.',
        icon: _jsx(Search, { className: "w-6 h-6" }),
        action: () => {
            useAppStore.getState().setMode('Research');
        },
    },
    {
        id: 'voice',
        title: 'Voice Commands',
        description: 'Click the microphone button or press Ctrl+Space to use voice commands in Hindi or English.',
        icon: _jsx(Mic, { className: "w-6 h-6" }),
    },
    {
        id: 'trade',
        title: 'Trade Mode',
        description: 'Switch to Trade mode for AI-powered trading signals and real-time market analysis.',
        icon: _jsx(TrendingUp, { className: "w-6 h-6" }),
        action: () => {
            useAppStore.getState().setMode('Trade');
        },
    },
    {
        id: 'trade',
        title: 'Trade Mode',
        description: 'Access Trade mode for real-time market data, charts, and AI-powered trading signals.',
        icon: _jsx(TrendingUp, { className: "w-6 h-6" }),
        action: () => {
            useAppStore.getState().setMode('Trade');
        },
    },
    {
        id: 'voice',
        title: 'Voice Commands',
        description: 'Press Ctrl+Space to activate WISPR voice assistant. Say "Hey WISPR, research BTC" to get started!',
        icon: _jsx(Mic, { className: "w-6 h-6" }),
    },
    {
        id: 'complete',
        title: 'You\'re all set!',
        description: 'Start exploring RegenBrowser. You can always access this tour from Settings.',
        icon: _jsx(CheckCircle2, { className: "w-6 h-6" }),
    },
];
export function QuickStartTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        // Check if user has seen the tour
        const hasSeenTour = localStorage.getItem('regen:has-seen-tour') === 'true';
        if (!hasSeenTour) {
            // Show tour after a short delay
            setTimeout(() => {
                setIsVisible(true);
            }, 2000);
        }
    }, []);
    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            // Execute action if available
            const step = TOUR_STEPS[currentStep];
            if (step.action) {
                try {
                    step.action();
                }
                catch (error) {
                    console.warn('[Tour] Action failed:', error);
                }
            }
            setCurrentStep(currentStep + 1);
        }
        else {
            handleComplete();
        }
    };
    const handleSkip = () => {
        handleComplete();
    };
    const handleComplete = () => {
        localStorage.setItem('regen:has-seen-tour', 'true');
        setIsVisible(false);
    };
    if (!isVisible) {
        return null;
    }
    const step = TOUR_STEPS[currentStep];
    const isLastStep = currentStep === TOUR_STEPS.length - 1;
    const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
    return (_jsx(AnimatePresence, { children: isVisible && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: handleSkip, children: _jsxs(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.9, opacity: 0 }, onClick: (e) => e.stopPropagation(), className: "relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden", children: [_jsx("div", { className: "h-1 bg-slate-800", children: _jsx(motion.div, { className: "h-full bg-emerald-500", initial: { width: 0 }, animate: { width: `${progress}%` }, transition: { duration: 0.3 } }) }), _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-emerald-500/20 rounded-lg text-emerald-400", children: step.icon }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: step.title }), _jsxs("p", { className: "text-xs text-slate-400", children: ["Step ", currentStep + 1, " of ", TOUR_STEPS.length] })] })] }), _jsx("button", { onClick: handleSkip, className: "p-1 text-slate-400 hover:text-white transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("p", { className: "text-slate-300 mb-6 leading-relaxed", children: step.description }), _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("button", { onClick: handleSkip, className: "px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors", children: "Skip Tour" }), _jsxs("button", { onClick: handleNext, className: "flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors", children: [isLastStep ? 'Get Started' : 'Next', !isLastStep && _jsx(ArrowRight, { className: "w-4 h-4" })] })] })] })] }) })) }));
}
