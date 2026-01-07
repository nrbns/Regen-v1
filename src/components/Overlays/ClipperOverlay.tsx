import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { ResearchHighlight } from '../../types/research';

const colors = ['#facc15', '#22d3ee', '#f472b6', '#a855f7', '#34d399'];

interface ClipperOverlayProps {
  active: boolean;
  onCancel: () => void;
  onCreateHighlight: (highlight: ResearchHighlight) => void;
}

export function ClipperOverlay({ active, onCancel, onCreateHighlight }: ClipperOverlayProps) {
  const [selection, setSelection] = useState<string>('');
  const [color, setColor] = useState<string>(colors[0]);

  useEffect(() => {
    if (!active) return;
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      setSelection(text);
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      setSelection('');
      setColor(colors[0]);
    };
  }, [active]);

  const previewStyle = useMemo(
    () => ({
      backgroundColor: `${color}25`,
      color,
      borderColor: `${color}66`,
    }),
    [color],
  );

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            key="clipper-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm"
            onClick={onCancel}
          />

          <motion.div
            key="clipper-toolbar"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[71] w-[520px] max-w-[90vw] px-5 py-4 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-200">Web Clipper</span>
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">
                    Ctrl ⌃ / Cmd ⌘ + Shift ⇧ + H
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Highlight text on the current page and save it as a note. We’ll store it with the page so you can
                  revisit later.
                </p>
                {selection ? (
                  <div
                    className="text-xs border rounded-lg px-3 py-2 max-h-28 overflow-y-auto transition-colors"
                    style={previewStyle}
                  >
                    {selection}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 border border-dashed border-gray-700 rounded-lg px-3 py-6 text-center">
                    Select text on the page to capture it.
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {colors.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        color === swatch ? 'scale-110 border-gray-200' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: swatch }}
                      onClick={() => setColor(swatch)}
                      aria-label={`Highlight ${swatch}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100 bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!selection) return;
                      onCreateHighlight({
                        id: crypto.randomUUID?.() ?? `clip-${Date.now()}`,
                        text: selection,
                        color,
                        createdAt: Date.now(),
                      });
                      setSelection('');
                      setColor(colors[0]);
                    }}
                    disabled={!selection}
                    className="px-3 py-1.5 text-sm font-semibold text-emerald-200 disabled:text-gray-500 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded transition-colors"
                  >
                    Save highlight
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

