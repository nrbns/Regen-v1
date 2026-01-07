/**
 * Game Player - Sandboxed iframe container for games
 */

// @ts-nocheck

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, RotateCcw, Info, Download, Save, FileDown } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { ipcEvents } from '../../lib/ipc-events';
import { isElectronRuntime } from '../../lib/env';

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
  const [hasSaveState, setHasSaveState] = useState(false);
  const [sandboxSession, setSandboxSession] = useState<{
    id: string;
    partition?: string;
    targetUrl: string;
    hardened?: boolean;
  } | null>(null);
  const [perfStats, setPerfStats] = useState<{ fps: number; memory: number | null }>({
    fps: 0,
    memory: null,
  });
  const [sandboxWarning, setSandboxWarning] = useState<string | null>(null);
  const perfSampleRef = useRef({
    frameCount: 0,
    lastSample: typeof performance !== 'undefined' ? performance.now() : 0,
    lastSend: typeof performance !== 'undefined' ? performance.now() : 0,
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const webviewRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isElectron = isElectronRuntime();
  const [showChrome, setShowChrome] = useState(true);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const autoHideTimeout = useRef<number | null>(null);
  const defaultGameUrl = useMemo(() => {
    if (game.embed_url) {
      return game.embed_url;
    }
    return `/games/${game.id}/index.html`;
  }, [game.embed_url, game.id]);

  const exitFullscreen = useCallback(async () => {
    if (!isFullscreen) return;
    try {
      if (isElectron) {
        await ipc.windowControl.setFullscreen(false);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('[GamePlayer] Failed to exit fullscreen:', error);
    }
  }, [isElectron, isFullscreen]);

  const enterFullscreen = useCallback(async () => {
    try {
      if (isElectron) {
        await ipc.windowControl.setFullscreen(true);
        return;
      }
      if (containerRef.current && !document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      }
    } catch (error) {
      console.warn('[GamePlayer] Failed to enter fullscreen:', error);
    }
  }, [isElectron]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  const autoHideChrome = useCallback(() => {
    if (!isFullscreen) return;
    if (autoHideTimeout.current) {
      window.clearTimeout(autoHideTimeout.current);
    }
    autoHideTimeout.current = window.setTimeout(() => {
      setShowChrome(false);
      autoHideTimeout.current = null;
    }, 2200);
  }, [isFullscreen]);

  const registerActivity = useCallback(() => {
    if (!isFullscreen) return;
    setShowChrome(true);
    autoHideChrome();
  }, [autoHideChrome, isFullscreen]);

  // Load save state on mount
  useEffect(() => {
    const saveKey = `gameHub_save_${game.id}`;
    const saved = localStorage.getItem(saveKey);
    setHasSaveState(!!saved);
  }, [game.id]);

  useEffect(() => {
    let cancelled = false;
    let currentSandboxId: string | null = null;

    const launchSandbox = async () => {
      if (!isElectron) {
        setSandboxSession({ id: `web-${game.id}`, targetUrl: defaultGameUrl });
        return;
      }
      try {
        setIsLoading(true);
        const session = await ipc.games.createSandbox({
          gameId: game.id,
          url: defaultGameUrl,
          title: game.title,
        });
        if (cancelled) return;
        currentSandboxId = session?.sandboxId ?? null;
        setSandboxSession({
          id: session?.sandboxId ?? `web-${game.id}`,
          partition: session?.partition,
          targetUrl: session?.url ?? defaultGameUrl,
          hardened: session?.hardened,
        });
      } catch (err) {
        console.warn('[GamePlayer] Failed to launch sandbox', err);
        setSandboxSession({ id: `web-${game.id}`, targetUrl: defaultGameUrl });
      }
    };

    launchSandbox();

    return () => {
      cancelled = true;
      if (currentSandboxId) {
        ipc.games.destroySandbox({ sandboxId: currentSandboxId }).catch(() => {});
      }
    };
  }, [game.id, game.title, defaultGameUrl, isElectron]);

  // Save game state
  const handleSaveState = () => {
    if (!iframeRef.current) return;

    try {
      const saveKey = `gameHub_save_${game.id}`;
      const timestamp = Date.now();

      // Try to communicate with the game iframe to get save state
      // This depends on the game supporting postMessage API
      const saveData = {
        gameId: game.id,
        timestamp,
        url: iframeRef.current.src,
      };

      // Store in localStorage (in production, this could be IndexedDB or cloud sync)
      localStorage.setItem(saveKey, JSON.stringify(saveData));
      setHasSaveState(true);

      // Show feedback (you could use a toast here)
      console.log('[GamePlayer] Save state stored for', game.title);
    } catch (error) {
      console.error('[GamePlayer] Failed to save state:', error);
    }
  };

  // Load game state
  const handleLoadState = () => {
    try {
      const saveKey = `gameHub_save_${game.id}`;
      const saved = localStorage.getItem(saveKey);

      if (!saved) return;

      const saveData = JSON.parse(saved);

      // Restore game URL or state if supported
      if (iframeRef.current && saveData.url) {
        iframeRef.current.src = saveData.url;
        setIsLoading(true);
      }

      console.log('[GamePlayer] Loaded save state for', game.title);
    } catch (error) {
      console.error('[GamePlayer] Failed to load state:', error);
    }
  };

  // Clear save state
  const handleClearState = () => {
    try {
      const saveKey = `gameHub_save_${game.id}`;
      localStorage.removeItem(saveKey);
      setHasSaveState(false);
      console.log('[GamePlayer] Cleared save state for', game.title);
    } catch (error) {
      console.error('[GamePlayer] Failed to clear state:', error);
    }
  };

  // Handle fullscreen state + chrome auto-hide
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const unsubscribe = ipcEvents.on('app:fullscreen-changed', ({ fullscreen }) => {
      setIsFullscreen(fullscreen);
    });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setShowChrome(true);
      setShowFullscreenHint(false);
      if (autoHideTimeout.current) {
        window.clearTimeout(autoHideTimeout.current);
        autoHideTimeout.current = null;
      }
      return;
    }
    setShowChrome(true);
    setShowFullscreenHint(true);
    autoHideChrome();
    const hintTimeout = window.setTimeout(() => setShowFullscreenHint(false), 2800);
    return () => {
      if (autoHideTimeout.current) {
        window.clearTimeout(autoHideTimeout.current);
        autoHideTimeout.current = null;
      }
      window.clearTimeout(hintTimeout);
    };
  }, [autoHideChrome, isFullscreen]);

  useEffect(() => {
    if (!sandboxSession?.id) return () => {};
    const unsubscribe = ipcEvents.on('games:sandbox:warning', payload => {
      if (payload?.sandboxId === sandboxSession.id) {
        const firstWarning = payload?.warnings?.[0];
        setSandboxWarning(firstWarning?.message ?? null);
      }
    });
    return unsubscribe;
  }, [sandboxSession?.id]);

  useEffect(() => {
    if (!isElectron || !webviewRef.current) return;
    const webview = webviewRef.current;
    const handleDomReady = () => {
      setIsLoading(false);
      setError(null);
    };
    const handleFail = () => {
      setIsLoading(false);
      setError('Failed to load game');
    };
    const handleCrash = () => {
      setIsLoading(false);
      setError('Game crashed in sandbox. Reload to continue.');
    };
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-fail-load', handleFail);
    webview.addEventListener('render-process-gone', handleCrash);
    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-fail-load', handleFail);
      webview.removeEventListener('render-process-gone', handleCrash);
    };
  }, [isElectron, sandboxSession?.targetUrl]);

  useEffect(() => {
    let rafId: number;
    const loop = (timestamp: number) => {
      const meta = perfSampleRef.current;
      meta.frameCount += 1;
      if (timestamp - meta.lastSample >= 1000) {
        const fps = Math.max(
          1,
          Math.round((meta.frameCount * 1000) / (timestamp - meta.lastSample))
        );
        const memoryInfo = typeof performance !== 'undefined' && (performance as any).memory;
        const memoryMb =
          memoryInfo && memoryInfo.usedJSHeapSize
            ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)
            : null;
        setPerfStats({ fps, memory: memoryMb });
        if (sandboxSession?.id && timestamp - meta.lastSend >= 4000) {
          meta.lastSend = timestamp;
          ipc.games
            .reportMetrics({
              sandboxId: sandboxSession.id,
              metrics: {
                fps,
                memoryMb: memoryMb ?? undefined,
              },
            })
            .catch(() => {});
        }
        meta.frameCount = 0;
        meta.lastSample = timestamp;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [sandboxSession?.id]);

  useEffect(() => {
    return () => {
      if (autoHideTimeout.current) {
        window.clearTimeout(autoHideTimeout.current);
        autoHideTimeout.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      void exitFullscreen();
    };
  }, [exitFullscreen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('gameHub:fullscreenPref', isFullscreen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isElectron) return;
    if (typeof window === 'undefined') return;
    try {
      const pref = window.localStorage.getItem('gameHub:fullscreenPref');
      if (pref === '1') {
        void enterFullscreen();
      }
    } catch {
      /* ignore */
    }
  }, [enterFullscreen, isElectron]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullscreen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        void exitFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [exitFullscreen, isFullscreen]);

  const handleReload = () => {
    if (isElectron && webviewRef.current) {
      try {
        setIsLoading(true);
        webviewRef.current.reload();
      } catch (err) {
        console.warn('[GamePlayer] Webview reload failed:', err);
      }
      return;
    }
    if (iframeRef.current) {
      const currentSrc = sandboxSession?.targetUrl ?? defaultGameUrl;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 0);
      setIsLoading(true);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          ref={containerRef}
          onMouseMove={registerActivity}
          onPointerDown={registerActivity}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${
            isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[90vh]'
          }`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111422] transition-opacity duration-300 ${
              isFullscreen && !showChrome ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
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
              {hasSaveState && (
                <button
                  onClick={handleLoadState}
                  className="p-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 transition-colors"
                  title="Load saved game state"
                >
                  <FileDown size={16} />
                </button>
              )}
              <button
                onClick={handleSaveState}
                className={`p-2 rounded-lg transition-colors ${
                  hasSaveState
                    ? 'text-green-400 hover:text-green-300 hover:bg-green-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title="Save game state"
              >
                <Save size={16} />
              </button>
              {hasSaveState && (
                <button
                  onClick={handleClearState}
                  className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                  title="Clear saved state"
                >
                  <X size={14} />
                </button>
              )}
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

            <div
              className={`absolute top-3 right-3 z-30 space-y-2 text-xs transition-opacity duration-300 ${
                isFullscreen && !showChrome ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div className="rounded-full bg-black/70 px-3 py-1.5 text-gray-100 backdrop-blur">
                <span className="mr-2 text-purple-300">FPS</span>
                {perfStats.fps || '—'}
                {typeof perfStats.memory === 'number' && (
                  <span className="ml-3 text-emerald-300">RAM {perfStats.memory} MB</span>
                )}
              </div>
              {sandboxWarning && (
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-amber-100 shadow-lg">
                  {sandboxWarning}
                </div>
              )}
            </div>

            {isFullscreen && showFullscreenHint && (
              <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.28em] text-white/80">
                Full-screen — F11 or Esc to exit
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
                    This game may not be available yet. Check the source repository to build and
                    host it.
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

            {isElectron && sandboxSession?.partition ? (
              <webview
                key={sandboxSession?.id}
                ref={webviewRef}
                src={sandboxSession?.targetUrl ?? defaultGameUrl}
                partition={sandboxSession.partition}
                className="w-full h-full border-0"
                allowpopups="false"
                webpreferences="contextIsolation=yes"
              />
            ) : (
              <iframe
                ref={iframeRef}
                src={sandboxSession?.targetUrl ?? defaultGameUrl}
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
            )}

            {/* Attribution (if required) */}
            {game.attribution && (
              <div className="absolute bottom-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-xs text-gray-400">
                <Info size={12} className="inline mr-1.5" />
                {game.attribution} ({game.license})
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div
            className={`px-6 py-3 border-t border-white/10 bg-[#111422] text-xs text-gray-400 transition-opacity duration-300 ${
              isFullscreen && !showChrome ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
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
