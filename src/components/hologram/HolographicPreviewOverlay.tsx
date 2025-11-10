import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HologramOverlayProps {
  visible: boolean;
  tabId: string | null;
  url?: string;
  title?: string;
  onClose: () => void;
}

const WEBXR_SUPPORTED = typeof navigator !== 'undefined' && 'xr' in navigator;

export function HolographicPreviewOverlay({ visible, tabId, url, title, onClose }: HologramOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [xrSupported, setXrSupported] = useState(WEBXR_SUPPORTED);

  useEffect(() => {
    let cancelled = false;
    if (!visible || !containerRef.current) return;

    if (!WEBXR_SUPPORTED) {
      setXrSupported(false);
      return;
    }

    (async () => {
      try {
        // Lazy load A-Frame only when needed
        await import('aframe');
        if (cancelled) return;
        setXrSupported(true);
      } catch (error) {
        console.warn('[Hologram] Failed to load WebXR runtime', error);
        setXrSupported(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || !tabId) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-[720px] max-w-[92vw] rounded-3xl border border-cyan-500/40 bg-cyan-950/90 p-6 shadow-[0_20px_80px_rgba(8,145,178,0.25)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-cyan-200/80">Holographic Preview</div>
              <div className="text-lg font-semibold text-cyan-100">{title || 'Live Tab'}</div>
              <div className="text-xs text-cyan-100/70 break-all">{url}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/20"
            >
              Close
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-cyan-500/30 bg-cyan-900/60 p-4">
            {!xrSupported && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-cyan-100/80">
                <p>WebXR holograms require a compatible browser/device.</p>
                <p className="text-xs text-cyan-200/60">Fallback: switch tabs to view this content directly.</p>
              </div>
            )}
            {xrSupported && (
              <div ref={containerRef} className="relative h-[360px] w-full">
                {/* A-Frame scene; keeps simple plane preview for now */}
                {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
                <iframe
                  src={`/hologram.html?tabId=${encodeURIComponent(tabId)}`}
                  className="h-full w-full rounded-xl border-none"
                  allow="xr-spatial-tracking; vr; webxr"
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
