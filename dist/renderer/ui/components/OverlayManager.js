import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * OverlayManager Component
 * Manages modal/panel stack & focus trap
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
export function OverlayManager({ overlays, onClose }) {
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
    return createPortal(_jsx(AnimatePresence, { children: sortedOverlays.map((overlay, index) => {
            const isTopmost = index === 0;
            const zIndex = 50 + index;
            return (_jsx(OverlayLayer, { overlay: overlay, isTopmost: isTopmost, zIndex: zIndex, onClose: () => onClose?.(overlay.id) }, overlay.id));
        }) }), document.body);
}
function OverlayLayer({ overlay, isTopmost, zIndex, onClose }) {
    const layerRef = useRef(null);
    // Escape key handler
    useEffect(() => {
        if (!isTopmost || !overlay.closeOnEscape)
            return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isTopmost, overlay.closeOnEscape, onClose]);
    // Focus trap
    useEffect(() => {
        if (!isTopmost || !layerRef.current)
            return;
        const focusableElements = layerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const handleTab = (e) => {
            if (e.key !== 'Tab')
                return;
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            }
            else {
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
    return (_jsxs(motion.div, { ref: layerRef, initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0", style: { zIndex }, children: [overlay.backdrop !== false && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: overlay.closeOnBackdrop !== false ? onClose : undefined, className: "absolute inset-0 bg-black/50 backdrop-blur-sm", "aria-hidden": "true" })), _jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: _jsx("div", { className: "pointer-events-auto", children: overlay.component }) })] }));
}
