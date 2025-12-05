import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Flight Card Component
 * Shows flight booking details with round-trip support
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, X, ArrowRight } from 'lucide-react';
import { toast } from '../utils/toast';
export function FlightCard() {
    const [flight, setFlight] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const handleFlightCard = (event) => {
            setFlight(event.detail);
            setIsVisible(true);
            setTimeout(() => setIsVisible(false), 20000);
        };
        window.addEventListener('flight-card', handleFlightCard);
        if (typeof window !== 'undefined' && window.__TAURI__) {
            // Dynamic import to avoid Vite dependency scan errors
            import('@tauri-apps/api/event')
                .then(({ listen }) => {
                listen('flight-card', (event) => {
                    setFlight(event.payload);
                    setIsVisible(true);
                    setTimeout(() => setIsVisible(false), 20000);
                });
            })
                .catch(() => {
                // Silently fail if Tauri API is not available
            });
        }
        return () => {
            window.removeEventListener('flight-card', handleFlightCard);
        };
    }, []);
    if (!flight || !isVisible)
        return null;
    return (_jsx(AnimatePresence, { children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-900 to-purple-900 p-8 rounded-2xl text-white shadow-2xl border border-purple-500 max-w-md z-50", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "text-center flex-1", children: [_jsxs("div", { className: "text-2xl font-bold flex items-center justify-center gap-2", children: [flight.from, " ", _jsx(ArrowRight, { className: "w-5 h-5" }), " ", flight.to] }), _jsx("div", { className: "text-sm text-gray-300 mt-1", children: flight.type })] }), _jsx("button", { onClick: () => setIsVisible(false), className: "text-gray-400 hover:text-white transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "text-center text-5xl my-4 font-bold", children: flight.price }), _jsxs("div", { className: "text-center text-lg mb-2", children: [_jsxs("div", { children: ["Out: ", flight.depart] }), flight.return !== '—' && _jsxs("div", { children: ["Return: ", flight.return] })] }), _jsxs("div", { className: "text-center text-xl mb-4 flex items-center justify-center gap-2", children: [_jsx(Plane, { className: "w-5 h-5" }), flight.airline] }), _jsx("button", { onClick: () => {
                        // Focus iframe if it exists
                        const iframe = document.querySelector('iframe');
                        if (iframe) {
                            iframe.focus();
                            toast.info('Click in the booking window to proceed to payment');
                        }
                    }, className: "mt-4 w-full bg-green-500 hover:bg-green-600 px-8 py-3 rounded-full text-xl font-bold transition-colors", children: "Go to Payment" }), _jsxs("div", { className: "text-xs text-center mt-3 opacity-70", children: ["Source: ", flight.source === 'live' ? 'Live prices' : 'Cached data'] })] }) }));
}
