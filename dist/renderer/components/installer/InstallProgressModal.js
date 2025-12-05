import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Beautiful Install Progress Modal
 * Shows "Downloading your AI brain..." with sexy progress bar
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { installOllamaAndModels } from '../../core/installer/ollamaInstaller';
export function InstallProgressModal({ onComplete, onError }) {
    const [progress, setProgress] = useState({
        stage: 'checking',
        progress: 0,
        message: 'Initializing...',
    });
    const [_isInstalling, setIsInstalling] = useState(true);
    useEffect(() => {
        let cancelled = false;
        const startInstallation = async () => {
            try {
                await installOllamaAndModels(prog => {
                    if (cancelled)
                        return;
                    setProgress(prog);
                    if (prog.stage === 'complete') {
                        setIsInstalling(false);
                        setTimeout(() => {
                            onComplete();
                        }, 2000);
                    }
                    else if (prog.stage === 'error') {
                        setIsInstalling(false);
                        onError(new Error(prog.message));
                    }
                });
            }
            catch (error) {
                if (!cancelled) {
                    setIsInstalling(false);
                    onError(error instanceof Error ? error : new Error('Installation failed'));
                }
            }
        };
        startInstallation();
        return () => {
            cancelled = true;
        };
    }, [onComplete, onError]);
    const getStageIcon = () => {
        switch (progress.stage) {
            case 'complete':
                return _jsx(CheckCircle2, { className: "w-16 h-16 text-emerald-400" });
            case 'error':
                return _jsx(AlertCircle, { className: "w-16 h-16 text-red-400" });
            default:
                return _jsx(Loader2, { className: "w-16 h-16 text-purple-400 animate-spin" });
        }
    };
    const getStageColor = () => {
        switch (progress.stage) {
            case 'complete':
                return 'from-emerald-500 to-teal-600';
            case 'error':
                return 'from-red-500 to-rose-600';
            default:
                return 'from-purple-500 to-pink-600';
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm", children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, className: "bg-slate-900 border border-purple-600/50 rounded-3xl p-12 max-w-2xl w-full mx-4 shadow-2xl", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "flex justify-center mb-4", children: getStageIcon() }), _jsx("h2", { className: "text-3xl font-bold text-white mb-2", children: progress.stage === 'complete'
                                ? 'Your AI Brain is Ready! 🧠'
                                : progress.stage === 'error'
                                    ? 'Installation Failed'
                                    : 'Downloading Your AI Brain...' }), _jsx("p", { className: "text-gray-400 text-lg", children: progress.message })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-sm text-gray-400", children: progress.stage === 'pulling_models' && progress.modelProgress
                                        ? `${progress.modelProgress.model}: ${Math.round(progress.modelProgress.progress)}%`
                                        : `${Math.round(progress.progress)}%` }), _jsxs("span", { className: "text-sm text-gray-400", children: [progress.stage === 'checking' && 'Step 1/4', progress.stage === 'downloading' && 'Step 2/4', progress.stage === 'installing' && 'Step 3/4', progress.stage === 'pulling_models' && 'Step 4/4', progress.stage === 'complete' && 'Complete!'] })] }), _jsx("div", { className: "h-4 bg-slate-800 rounded-full overflow-hidden", children: _jsx(motion.div, { className: `h-full bg-gradient-to-r ${getStageColor()} shadow-lg`, initial: { width: 0 }, animate: { width: `${progress.progress}%` }, transition: { duration: 0.3, ease: 'easeOut' } }) })] }), _jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, className: "space-y-2", children: [progress.stage === 'checking' && (_jsx("div", { className: "text-center text-gray-300", children: _jsx("p", { className: "text-sm", children: "Checking if Ollama is installed..." }) })), progress.stage === 'downloading' && (_jsxs("div", { className: "text-center text-gray-300", children: [_jsx("p", { className: "text-sm", children: "Downloading Ollama installer..." }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "This may take a few minutes" })] })), progress.stage === 'installing' && (_jsxs("div", { className: "text-center text-gray-300", children: [_jsx("p", { className: "text-sm", children: "Installing Ollama..." }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "Please wait while we set up your AI engine" })] })), progress.stage === 'pulling_models' && progress.modelProgress && (_jsxs("div", { className: "text-center text-gray-300", children: [_jsx("p", { className: "text-sm font-medium", children: progress.modelProgress.model }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: progress.modelProgress.progress < 100
                                            ? 'Downloading model weights...'
                                            : 'Model ready!' })] })), progress.stage === 'complete' && (_jsx(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, className: "text-center", children: _jsxs("div", { className: "flex items-center justify-center gap-2 text-emerald-400 mb-4", children: [_jsx(Sparkles, { className: "w-5 h-5" }), _jsx("p", { className: "text-lg font-semibold", children: "All set! Starting Regen..." })] }) })), progress.stage === 'error' && (_jsxs("div", { className: "text-center text-red-400", children: [_jsx("p", { className: "text-sm", children: progress.message }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "You can try installing Ollama manually from ollama.com" })] }))] }, progress.stage) }), progress.stage === 'pulling_models' && (_jsxs("div", { className: "mt-6 space-y-2", children: [_jsx("p", { className: "text-xs text-gray-500 uppercase tracking-wide mb-2", children: "Models" }), ['phi3:mini', 'llava:7b'].map(model => {
                            const isComplete = progress.modelProgress?.model === model && progress.modelProgress.progress === 100;
                            const isActive = progress.modelProgress?.model === model;
                            return (_jsxs("div", { className: `flex items-center gap-3 p-2 rounded-lg ${isActive ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-slate-800/50'}`, children: [_jsx("div", { className: "flex-1", children: _jsx("p", { className: "text-sm text-gray-300", children: model }) }), isComplete && _jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-400" }), isActive && !isComplete && (_jsx(Loader2, { className: "w-4 h-4 text-purple-400 animate-spin" }))] }, model));
                        })] }))] }) }));
}
