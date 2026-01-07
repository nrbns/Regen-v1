/**
 * Beautiful Install Progress Modal
 * Shows "Downloading your AI brain..." with sexy progress bar
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { installOllamaAndModels, type InstallProgress } from '../../core/installer/ollamaInstaller';

interface Props {
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function InstallProgressModal({ onComplete, onError }: Props) {
  const [progress, setProgress] = useState<InstallProgress>({
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
          if (cancelled) return;
          setProgress(prog);

          if (prog.stage === 'complete') {
            setIsInstalling(false);
            setTimeout(() => {
              onComplete();
            }, 2000);
          } else if (prog.stage === 'error') {
            setIsInstalling(false);
            onError(new Error(prog.message));
          }
        });
      } catch (error) {
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
        return <CheckCircle2 className="w-16 h-16 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-16 h-16 text-red-400" />;
      default:
        return <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />;
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-purple-600/50 rounded-3xl p-12 max-w-2xl w-full mx-4 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">{getStageIcon()}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {progress.stage === 'complete'
              ? 'Your AI Brain is Ready! 🧠'
              : progress.stage === 'error'
                ? 'Installation Failed'
                : 'Downloading Your AI Brain...'}
          </h2>
          <p className="text-gray-400 text-lg">{progress.message}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">
              {progress.stage === 'pulling_models' && progress.modelProgress
                ? `${progress.modelProgress.model}: ${Math.round(progress.modelProgress.progress)}%`
                : `${Math.round(progress.progress)}%`}
            </span>
            <span className="text-sm text-gray-400">
              {progress.stage === 'checking' && 'Step 1/4'}
              {progress.stage === 'downloading' && 'Step 2/4'}
              {progress.stage === 'installing' && 'Step 3/4'}
              {progress.stage === 'pulling_models' && 'Step 4/4'}
              {progress.stage === 'complete' && 'Complete!'}
            </span>
          </div>
          <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getStageColor()} shadow-lg`}
              initial={{ width: 0 }}
              animate={{ width: `${progress.progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Stage Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={progress.stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {progress.stage === 'checking' && (
              <div className="text-center text-gray-300">
                <p className="text-sm">Checking if Ollama is installed...</p>
              </div>
            )}

            {progress.stage === 'downloading' && (
              <div className="text-center text-gray-300">
                <p className="text-sm">Downloading Ollama installer...</p>
                <p className="text-xs text-gray-500 mt-1">This may take a few minutes</p>
              </div>
            )}

            {progress.stage === 'installing' && (
              <div className="text-center text-gray-300">
                <p className="text-sm">Installing Ollama...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Please wait while we set up your AI engine
                </p>
              </div>
            )}

            {progress.stage === 'pulling_models' && progress.modelProgress && (
              <div className="text-center text-gray-300">
                <p className="text-sm font-medium">{progress.modelProgress.model}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {progress.modelProgress.progress < 100
                    ? 'Downloading model weights...'
                    : 'Model ready!'}
                </p>
              </div>
            )}

            {progress.stage === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-emerald-400 mb-4">
                  <Sparkles className="w-5 h-5" />
                  <p className="text-lg font-semibold">All set! Starting Regen...</p>
                </div>
              </motion.div>
            )}

            {progress.stage === 'error' && (
              <div className="text-center text-red-400">
                <p className="text-sm">{progress.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  You can try installing Ollama manually from ollama.com
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Model List */}
        {progress.stage === 'pulling_models' && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Models</p>
            {['phi3:mini', 'llava:7b'].map(model => {
              const isComplete =
                progress.modelProgress?.model === model && progress.modelProgress.progress === 100;
              const isActive = progress.modelProgress?.model === model;
              return (
                <div
                  key={model}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isActive ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{model}</p>
                  </div>
                  {isComplete && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isActive && !isComplete && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
