import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Loop Resume Modal
 * Shows crashed loops and offers to resume them
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Play } from 'lucide-react';
import { checkForCrashedLoops, resumeLoop, deleteLoopState, } from '../../core/agents/loopResume';
import { toast } from 'react-hot-toast';
export function LoopResumeModal({ open, onClose }) {
    const [crashedLoops, setCrashedLoops] = useState([]);
    // const { setRun, setStatus } = useAgentStreamStore(); // Reserved for future use
    useEffect(() => {
        if (open) {
            const loops = checkForCrashedLoops();
            setCrashedLoops(loops);
        }
    }, [open]);
    const handleResume = (loop) => {
        const success = resumeLoop(loop.runId);
        if (success) {
            toast.success(`Resumed loop: ${loop.goal.slice(0, 50)}...`);
            onClose();
        }
        else {
            toast.error('Failed to resume loop');
        }
    };
    const handleDelete = (runId) => {
        deleteLoopState(runId);
        setCrashedLoops(prev => prev.filter(l => l.runId !== runId));
        toast.success('Deleted crashed loop');
    };
    if (!open)
        return null;
    return (_jsx(AnimatePresence, { children: _jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }), _jsxs(motion.div, { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 }, className: "relative bg-[#1A1D28] border border-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertCircle, { size: 20, className: "text-yellow-400" }), _jsxs("h2", { className: "text-lg font-semibold text-gray-100", children: ["Crashed Loops (", crashedLoops.length, ")"] })] }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 transition-colors", children: _jsx(X, { size: 18 }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: crashedLoops.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-gray-400", children: [_jsx("p", { children: "No crashed loops found." }), _jsx("p", { className: "text-sm mt-2", children: "All loops completed successfully." })] })) : (_jsx("div", { className: "space-y-3", children: crashedLoops.map(loop => (_jsx("div", { className: "bg-gray-900/60 rounded-lg p-4 border border-gray-800/50", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsxs("span", { className: "text-xs font-medium text-gray-400", children: [loop.runId.slice(0, 8), "..."] }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded ${loop.status === 'live'
                                                                    ? 'bg-green-900/30 text-green-400'
                                                                    : loop.status === 'error'
                                                                        ? 'bg-red-900/30 text-red-400'
                                                                        : 'bg-yellow-900/30 text-yellow-400'}`, children: loop.status }), loop.mode && _jsx("span", { className: "text-xs text-gray-500", children: loop.mode })] }), _jsx("h3", { className: "font-medium text-gray-200 mb-1 truncate", children: loop.goal || 'Untitled loop' }), loop.transcript && (_jsxs("p", { className: "text-xs text-gray-400 line-clamp-2 mb-2", children: [loop.transcript.slice(0, 150), "..."] })), _jsxs("div", { className: "text-xs text-gray-500", children: [loop.events.length, " events \u2022 Last saved", ' ', new Date(loop.lastSaved).toLocaleString()] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => handleResume(loop), className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5", children: [_jsx(Play, { size: 14 }), "Resume"] }), _jsx("button", { onClick: () => handleDelete(loop.runId), className: "p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800/60 rounded-lg transition-colors", title: "Delete", children: _jsx(X, { size: 16 }) })] })] }) }, loop.runId))) })) }), _jsxs("div", { className: "p-4 border-t border-gray-800 flex items-center justify-between", children: [_jsx("p", { className: "text-xs text-gray-400", children: "Loops are auto-saved every 5 seconds. Resume to continue where you left off." }), _jsx("button", { onClick: onClose, className: "px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors", children: "Close" })] })] })] }) }));
}
