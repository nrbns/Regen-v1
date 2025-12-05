import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Weather Card Component
 * Shows live weather data with Hindi support
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Sun, Droplets, Wind, X } from 'lucide-react';
export function WeatherCard() {
    const [weather, setWeather] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        // Listen for weather updates
        const handleWeatherUpdate = (event) => {
            setWeather(event.detail);
            setIsVisible(true);
            // Auto-hide after 15 seconds
            setTimeout(() => {
                setIsVisible(false);
            }, 15000);
        };
        window.addEventListener('weather-update', handleWeatherUpdate);
        // Also listen for Tauri events
        if (typeof window !== 'undefined' && window.__TAURI__) {
            const { listen } = require('@tauri-apps/api/event');
            listen('weather-update', (event) => {
                setWeather(event.payload);
                setIsVisible(true);
                setTimeout(() => setIsVisible(false), 15000);
            });
        }
        return () => {
            window.removeEventListener('weather-update', handleWeatherUpdate);
        };
    }, []);
    if (!weather || !isVisible)
        return null;
    return (_jsx(AnimatePresence, { children: _jsxs(motion.div, { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, className: "fixed top-20 right-5 bg-gradient-to-br from-purple-900 to-blue-900 p-6 rounded-2xl text-white shadow-2xl border border-purple-500 max-w-sm z-50", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-2xl font-bold", children: weather.city }), _jsx("button", { onClick: () => setIsVisible(false), className: "text-gray-400 hover:text-white transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "text-5xl my-2 font-bold", children: weather.temp }), _jsxs("div", { className: "text-lg text-gray-300 mb-2", children: ["Feels like ", weather.feels] }), _jsxs("div", { className: "capitalize text-xl mb-4 flex items-center gap-2", children: [weather.desc.includes('rain') || weather.desc.includes('बारिश') ? (_jsx(Droplets, { className: "w-5 h-5" })) : weather.desc.includes('cloud') || weather.desc.includes('बादल') ? (_jsx(Cloud, { className: "w-5 h-5" })) : (_jsx(Sun, { className: "w-5 h-5" })), weather.desc] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 mt-4 text-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Droplets, { className: "w-4 h-4" }), _jsxs("span", { children: ["Humidity: ", weather.humidity, "%"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Wind, { className: "w-4 h-4" }), _jsxs("span", { children: ["Wind: ", weather.wind, " km/h"] })] })] }), _jsxs("div", { className: "text-xs mt-3 opacity-70 text-center", children: ["Source: ", weather.source === 'live' ? 'Live API' : 'Cached data'] })] }) }));
}
