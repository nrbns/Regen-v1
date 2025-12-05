import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * PermissionPrompt - Request permission modal with TTL
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, HardDrive, Bell, X, Check, Clock } from 'lucide-react';
import { useState } from 'react';
const permissionIcons = {
    camera: Camera,
    microphone: Mic,
    filesystem: HardDrive,
    notifications: Bell,
};
export function PermissionPrompt({ request, onClose }) {
    const [remember, setRemember] = useState(false);
    if (!request)
        return null;
    const Icon = permissionIcons[request.permission];
    const handleResponse = (granted) => {
        request.callback(granted, remember);
        onClose();
    };
    return (_jsx(AnimatePresence, { children: request && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-overlayBackdrop bg-black/60 backdrop-blur-sm", onClick: onClose }), _jsx(motion.div, { initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 }, className: "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-modalContent w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-start gap-4 mb-4", children: [_jsx("div", { className: "flex-shrink-0 w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center", children: _jsx(Icon, { size: 24, className: "text-blue-400" }) }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-200 mb-1", children: "Permission Request" }), _jsxs("p", { className: "text-sm text-gray-400", children: [_jsx("span", { className: "font-medium text-gray-300", children: new URL(request.origin).hostname }), " wants to access your ", request.permission, "."] })] }), _jsx("button", { onClick: onClose, className: "p-1 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2 p-3 bg-gray-800/40 rounded-lg", children: [_jsx(Clock, { size: 16, className: "text-gray-500" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs font-medium text-gray-300", children: "Remember this choice" }), _jsxs("div", { className: "text-xs text-gray-500", children: ["Allow this site to access ", request.permission, " automatically"] })] }), _jsx("button", { onClick: () => setRemember(!remember), className: `
                      relative w-11 h-6 rounded-full transition-colors
                      ${remember ? 'bg-blue-600' : 'bg-gray-700'}
                    `, children: _jsx(motion.div, { className: "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm", animate: { x: remember ? 20 : 0 }, transition: { type: 'spring', stiffness: 500, damping: 30 } }) })] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsxs(motion.button, { onClick: () => handleResponse(false), whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 rounded-lg text-gray-300 hover:text-gray-100 transition-colors", children: [_jsx(X, { size: 18 }), "Deny"] }), _jsxs(motion.button, { onClick: () => handleResponse(true), whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, className: "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600/80 border border-blue-500/30 rounded-lg text-blue-200 hover:text-blue-100 transition-colors", children: [_jsx(Check, { size: 18 }), "Allow"] })] })] })] }) })] })) }));
}
