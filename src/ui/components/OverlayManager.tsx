/**
 * OverlayManager Component
 * Manages modal/panel stack & focus trap
 */

import React, { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface Overlay {
  id: string;
  component: ReactNode;
  priority?: number; // Higher priority renders on top
  backdrop?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  onClose?: () => void;
}

export interface OverlayManagerProps {
  overlays: Overlay[];
  onClose?: (id: string) => void;
}

/**
 * OverlayManager - Manages modal/panel stack
 *
 * Features:
 * - Stack management (priority-based)
 * - Focus trap
 * - Escape key handling
 * - Backdrop click handling
 * - Body scroll lock
 */
export function OverlayManager({ overlays, onClose }: OverlayManagerProps) {
  // Sort overlays by priority (higher first)
  const sortedOverlays = [...overlays].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Lock body scroll when overlays are open
  useEffect(() => {
    if (overlays.length > 0) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [overlays.length]);

  return createPortal(
    <AnimatePresence>
      {sortedOverlays.map((overlay, index) => {
        const isTopmost = index === 0;
        const zIndex = 50 + index;

        return (
          <OverlayLayer
            key={overlay.id}
            overlay={overlay}
            isTopmost={isTopmost}
            zIndex={zIndex}
            onClose={() => onClose?.(overlay.id)}
          />
        );
      })}
    </AnimatePresence>,
    document.body
  );
}

interface OverlayLayerProps {
  overlay: Overlay;
  isTopmost: boolean;
  zIndex: number;
  onClose: () => void;
}

function OverlayLayer({ overlay, isTopmost, zIndex, onClose }: OverlayLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!isTopmost || !overlay.closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isTopmost, overlay.closeOnEscape, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isTopmost || !layerRef.current) return;

    const focusableElements = layerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    layerRef.current.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => {
      layerRef.current?.removeEventListener('keydown', handleTab);
    };
  }, [isTopmost]);

  return (
    <motion.div
      ref={layerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0"
      style={{ zIndex }}
    >
      {/* Backdrop */}
      {overlay.backdrop !== false && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={overlay.closeOnBackdrop !== false ? onClose : undefined}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-hidden="true"
        />
      )}

      {/* Overlay content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto">{overlay.component}</div>
      </div>
    </motion.div>
  );
}
