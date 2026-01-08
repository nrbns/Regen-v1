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
        return <CheckCircle2 className="h-16 w-16 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="h-16 w-16 text-red-400" />;
      default:
        return <Loader2 className="h-16 w-16 animate-spin text-purple-400" />;
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
        className="mx-4 w-full max-w-2xl rounded-3xl border border-purple-600/50 bg-slate-900 p-12 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">{getStageIcon()}</div>
          <h2 className="mb-2 text-3xl font-bold text-white">
            {progress.stage === 'complete'
              ? 'Your AI Brain is Ready! 🧠'
              : progress.stage === 'error'
                ? 'Installation Failed'
                : 'Downloading Your AI Brain...'}
          </h2>
          <p className="text-lg text-gray-400">{progress.message}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
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
          <div className="h-4 overflow-hidden rounded-full bg-slate-800">
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
                <p className="mt-1 text-xs text-gray-500">This may take a few minutes</p>
              </div>
            )}

            {progress.stage === 'installing' && (
              <div className="text-center text-gray-300">
                <p className="text-sm">Installing Ollama...</p>
                <p className="mt-1 text-xs text-gray-500">
                  Please wait while we set up your AI engine
                </p>
              </div>
            )}

            {progress.stage === 'pulling_models' && progress.modelProgress && (
              <div className="text-center text-gray-300">
                <p className="text-sm font-medium">{progress.modelProgress.model}</p>
                <p className="mt-1 text-xs text-gray-500">
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
                <div className="mb-4 flex items-center justify-center gap-2 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                  <p className="text-lg font-semibold">All set! Starting Regen...</p>
                </div>
              </motion.div>
            )}

            {progress.stage === 'error' && (
              <div className="text-center text-red-400">
                <p className="text-sm">{progress.message}</p>
                <p className="mt-2 text-xs text-gray-500">
                  You can try installing Ollama manually from ollama.com
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Model List */}
        {progress.stage === 'pulling_models' && (
          <div className="mt-6 space-y-2">
            <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Models</p>
            {['phi3:mini', 'llava:7b'].map(model => {
              const isComplete =
                progress.modelProgress?.model === model && progress.modelProgress.progress === 100;
              const isActive = progress.modelProgress?.model === model;
              return (
                <div
                  key={model}
                  className={`flex items-center gap-3 rounded-lg p-2 ${
                    isActive ? 'border border-purple-500/50 bg-purple-500/20' : 'bg-slate-800/50'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{model}</p>
                  </div>
                  {isComplete && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {isActive && !isComplete && (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
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
