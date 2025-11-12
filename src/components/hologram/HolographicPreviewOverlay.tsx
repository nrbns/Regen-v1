import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HologramOverlayProps {
  visible: boolean;
  tabId: string | null;
  url?: string;
  title?: string;
  onClose: () => void;
}

declare global {
  interface Window {
    AFRAME?: unknown;
  }
}

const WEBXR_SUPPORTED = typeof navigator !== 'undefined' && 'xr' in navigator;
const AFRAME_CDN = 'https://unpkg.com/aframe@1.5.0/dist/aframe.min.js';

async function ensureAFrameRuntime(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.AFRAME) return true;

  return new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-hologram="aframe"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = AFRAME_CDN;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.hologram = 'aframe';
    script.addEventListener('load', () => resolve(true), { once: true });
    script.addEventListener('error', () => resolve(false), { once: true });
    document.head.appendChild(script);
  });
}

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
      const ok = await ensureAFrameRuntime();
      if (cancelled) return;
      if (ok) {
        setXrSupported(true);
      } else {
        console.warn('[Hologram] Failed to load A-Frame runtime from CDN');
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
                <iframe
                  src={`/hologram.html?tabId=${encodeURIComponent(tabId)}`}
                  className="h-full w-full rounded-xl border-none"
                  allow="xr-spatial-tracking; vr; webxr"
                  title={`Holographic preview for tab ${tabId}`}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
