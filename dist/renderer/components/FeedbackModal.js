import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Feedback Modal - Tier 2
 * User feedback and rating system
 */
import { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { track } from '../services/analytics';
import { toast } from '../utils/toast';
export function FeedbackModal({ open, onClose }) {
    const [rating, setRating] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rating) {
            toast.warning('Please select a rating');
            return;
        }
        setSubmitting(true);
        try {
            // In production, POST to /api/feedback
            const feedbackData = {
                rating,
                feedback,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
            };
            // For now, log to console
            console.log('[FEEDBACK]', feedbackData);
            // In production:
            // await fetch('/api/feedback', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(feedbackData),
            // });
            track('feedback_submitted', { rating, hasText: feedback.length > 0 });
            toast.success('Thank you for your feedback!');
            setRating(null);
            setFeedback('');
            onClose();
        }
        catch (error) {
            console.error('Failed to submit feedback', error);
            toast.error('Failed to submit feedback');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(AnimatePresence, { children: open && (_jsx("div", { className: "fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm", onClick: e => {
                // Close on backdrop click
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }, children: _jsx(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, className: "bg-slate-900 rounded-xl border border-slate-700 shadow-2xl max-w-md w-full mx-4", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-100 mb-1", children: "Share Your Feedback" }), _jsx("p", { className: "text-sm text-gray-400", children: "Help us improve Regen. What's one thing that confused you or broke?" })] }), _jsx("button", { onClick: e => {
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                        onClose();
                                    }, onMouseDown: e => {
                                        e.stopImmediatePropagation();
                                        e.stopPropagation();
                                    }, className: "text-gray-400 hover:text-gray-200 transition-colors", style: { zIndex: 10011, isolation: 'isolate' }, "aria-label": "Close", children: _jsx(X, { size: 20 }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-2", children: "Rating" }), _jsx("div", { className: "flex gap-2", children: [1, 2, 3, 4, 5].map(value => (_jsx("button", { type: "button", onClick: e => {
                                                    e.stopImmediatePropagation();
                                                    e.stopPropagation();
                                                    setRating(value);
                                                }, onMouseDown: e => {
                                                    e.stopImmediatePropagation();
                                                    e.stopPropagation();
                                                }, className: `p-2 rounded transition-colors ${rating && rating >= value
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-500 hover:text-gray-400'}`, style: { zIndex: 10011, isolation: 'isolate' }, children: _jsx(Star, { size: 24, className: rating && rating >= value ? 'fill-current' : '' }) }, value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-300 mb-2", children: "Feedback (optional)" }), _jsx("textarea", { value: feedback, onChange: e => setFeedback(e.target.value), placeholder: "What's one thing that confused you or broke?", rows: 4, className: "w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                                onClose();
                                            }, onMouseDown: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "flex-1 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-700/80", style: { zIndex: 10011, isolation: 'isolate' }, children: "Cancel" }), _jsx("button", { type: "submit", disabled: !rating || submitting, onClick: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, onMouseDown: e => {
                                                e.stopImmediatePropagation();
                                                e.stopPropagation();
                                            }, className: "flex-1 flex items-center justify-center gap-2 rounded-lg border border-blue-500/60 bg-blue-600/20 px-4 py-2.5 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed", style: { zIndex: 10011, isolation: 'isolate' }, children: submitting ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" }), "Sending..."] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { size: 16 }), "Send Feedback"] })) })] })] })] }) }) })) }));
}
