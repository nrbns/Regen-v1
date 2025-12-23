/**
 * Weather Card Component
 * Shows live weather data with Hindi support
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Sun, Droplets, Wind, X } from 'lucide-react';

interface WeatherData {
  city: string;
  temp: string;
  feels: string;
  desc: string;
  humidity: number;
  wind: string;
  source: string;
}

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for weather updates
    const handleWeatherUpdate = (event: CustomEvent) => {
      setWeather(event.detail);
      setIsVisible(true);

      // Auto-hide after 15 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 15000);
    };

    window.addEventListener('weather-update', handleWeatherUpdate as EventListener);

    // Also listen for Tauri events
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      const { listen } = require('@tauri-apps/api/event');
      listen('weather-update', (event: any) => {
        setWeather(event.payload);
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 15000);
      });
    }

    return () => {
      window.removeEventListener('weather-update', handleWeatherUpdate as EventListener);
    };
  }, []);

  if (!weather || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed right-5 top-20 z-50 max-w-sm rounded-2xl border border-purple-500 bg-gradient-to-br from-purple-900 to-blue-900 p-6 text-white shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-2xl font-bold">{weather.city}</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-2 text-5xl font-bold">{weather.temp}</div>
        <div className="mb-2 text-lg text-gray-300">Feels like {weather.feels}</div>

        <div className="mb-4 flex items-center gap-2 text-xl capitalize">
          {weather.desc.includes('rain') || weather.desc.includes('बारिश') ? (
            <Droplets className="h-5 w-5" />
          ) : weather.desc.includes('cloud') || weather.desc.includes('बादल') ? (
            <Cloud className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          {weather.desc}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4" />
            <span>Humidity: {weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4" />
            <span>Wind: {weather.wind} km/h</span>
          </div>
        </div>

        <div className="mt-3 text-center text-xs opacity-70">
          Source: {weather.source === 'live' ? 'Live API' : 'Cached data'}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
