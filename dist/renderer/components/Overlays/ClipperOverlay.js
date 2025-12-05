import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
const colors = ['#facc15', '#22d3ee', '#f472b6', '#a855f7', '#34d399'];
export function ClipperOverlay({ active, onCancel, onCreateHighlight }) {
    const [selection, setSelection] = useState('');
    const [color, setColor] = useState(colors[0]);
    useEffect(() => {
        if (!active)
            return;
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
    const previewStyle = useMemo(() => ({
        backgroundColor: `${color}25`,
        color,
        borderColor: `${color}66`,
    }), [color]);
    return (_jsx(AnimatePresence, { children: active && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 0.45 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm", onClick: onCancel }, "clipper-overlay"), _jsx(motion.div, { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 12 }, className: "fixed bottom-12 left-1/2 -translate-x-1/2 z-[71] w-[520px] max-w-[90vw] px-5 py-4 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl", children: _jsxs("div", { className: "flex items-start gap-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-sm font-medium text-gray-200", children: "Web Clipper" }), _jsx("span", { className: "text-[11px] uppercase tracking-wide text-gray-500", children: "Ctrl \u2303 / Cmd \u2318 + Shift \u21E7 + H" })] }), _jsx("p", { className: "text-xs text-gray-400 mb-3", children: "Highlight text on the current page and save it as a note. We\u2019ll store it with the page so you can revisit later." }), selection ? (_jsx("div", { className: "text-xs border rounded-lg px-3 py-2 max-h-28 overflow-y-auto transition-colors", style: previewStyle, children: selection })) : (_jsx("div", { className: "text-xs text-gray-500 border border-dashed border-gray-700 rounded-lg px-3 py-6 text-center", children: "Select text on the page to capture it." }))] }), _jsxs("div", { className: "flex flex-col items-end gap-2", children: [_jsx("div", { className: "flex items-center gap-2", children: colors.map((swatch) => (_jsx("button", { type: "button", className: `w-6 h-6 rounded-full border-2 transition-transform ${color === swatch ? 'scale-110 border-gray-200' : 'border-transparent'}`, style: { backgroundColor: swatch }, onClick: () => setColor(swatch), "aria-label": `Highlight ${swatch}` }, swatch))) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: onCancel, className: "px-3 py-1.5 text-sm text-gray-300 hover:text-gray-100 bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 rounded transition-colors", children: "Cancel" }), _jsx("button", { onClick: () => {
                                                    if (!selection)
                                                        return;
                                                    onCreateHighlight({
                                                        id: crypto.randomUUID?.() ?? `clip-${Date.now()}`,
                                                        text: selection,
                                                        color,
                                                        createdAt: Date.now(),
                                                    });
                                                    setSelection('');
                                                    setColor(colors[0]);
                                                }, disabled: !selection, className: "px-3 py-1.5 text-sm font-semibold text-emerald-200 disabled:text-gray-500 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded transition-colors", children: "Save highlight" })] })] })] }) }, "clipper-toolbar")] })) }));
}
