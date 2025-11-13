/**
 * Game Player - Sandboxed iframe container for games
 */

// @ts-nocheck

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, RotateCcw, Info, Download } from 'lucide-react';

interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  category: string;
  type: string;
  source: string;
  embed_url: string | null;
  offline_capable: boolean;
  license: string;
  attribution: string;
  size_kb: number;
  tags: string[];
}

interface GamePlayerProps {
  game: Game;
  onClose: () => void;
}

export function GamePlayer({ game, onClose }: GamePlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleReload = () => {
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      // Use setTimeout to ensure the src is cleared before setting it again
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 0);
      setIsLoading(true);
    }
  };

  const getGameUrl = () => {
    // For now, return a placeholder URL
    // In production, this would load from the actual game source
    if (game.embed_url) {
      return game.embed_url;
    }
    // For Phaser/HTML5 games, you'd serve them from your CDN or build them
    // This is a placeholder - you'd replace with actual game URLs
    return `/games/${game.id}/index.html`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111422]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <span className="text-lg">🎮</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">{game.title}</h2>
                <p className="text-xs text-gray-400 truncate">{game.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {game.offline_capable && (
                <button
                  className="p-2 rounded-lg text-gray-400 hover:text-green-400 hover:bg-white/5 transition-colors"
                  title="Available offline"
                >
                  <Download size={16} />
                </button>
              )}
              <button
                onClick={handleReload}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Reload game"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Close game"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Game Container */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0f111a] z-10">
                <div className="text-center space-y-3">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
                  <p className="text-sm text-gray-400">Loading game...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0f111a] z-10">
                <div className="text-center space-y-3 max-w-md px-6">
                  <div className="p-3 rounded-full bg-red-500/20 text-red-400 mx-auto w-fit">
                    <X size={24} />
                  </div>
                  <p className="text-sm text-red-200">{error}</p>
                  <p className="text-xs text-gray-400">
                    This game may not be available yet. Check the source repository to build and host it.
                  </p>
                  <button
                    onClick={handleReload}
                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-200 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={getGameUrl()}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              allow="fullscreen"
              onLoad={() => {
                setIsLoading(false);
                setError(null);
              }}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load game');
              }}
              title={game.title}
            />

            {/* Attribution (if required) */}
            {game.attribution && (
              <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-400">
                <Info size={12} className="inline mr-1.5" />
                {game.attribution} ({game.license})
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-6 py-3 border-t border-white/10 bg-[#111422] text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>Category: {game.category}</span>
                <span>•</span>
                <span>Size: {game.size_kb} KB</span>
                {game.offline_capable && (
                  <>
                    <span>•</span>
                    <span className="text-green-400">Offline Available</span>
                  </>
                )}
              </div>
              <a
                href={game.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                View Source →
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

