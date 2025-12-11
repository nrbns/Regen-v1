/**
 * Flight Card Component
 * Shows flight booking details with round-trip support
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, X, ArrowRight } from 'lucide-react';
import { toast } from '../utils/toast';

interface FlightData {
  from: string;
  to: string;
  type: string;
  depart: string;
  return: string;
  price: string;
  airline: string;
  source: string;
}

export function FlightCard() {
  const [flight, setFlight] = useState<FlightData | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleFlightCard = (event: CustomEvent) => {
      setFlight(event.detail);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 20000);
    };

    window.addEventListener('flight-card', handleFlightCard as EventListener);
    
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Dynamic import to avoid Vite dependency scan errors
      import('@tauri-apps/api/event')
        .then(({ listen }) => {
          listen('flight-card', (event: any) => {
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
      window.removeEventListener('flight-card', handleFlightCard as EventListener);
    };
  }, []);

  if (!flight || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-900 to-purple-900 p-8 rounded-2xl text-white shadow-2xl border border-purple-500 max-w-md z-50"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
              {flight.from} <ArrowRight className="w-5 h-5" /> {flight.to}
            </div>
            <div className="text-sm text-gray-300 mt-1">{flight.type}</div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center text-5xl my-4 font-bold">{flight.price}</div>
        
        <div className="text-center text-lg mb-2">
          <div>Out: {flight.depart}</div>
          {flight.return !== '—' && <div>Return: {flight.return}</div>}
        </div>

        <div className="text-center text-xl mb-4 flex items-center justify-center gap-2">
          <Plane className="w-5 h-5" />
          {flight.airline}
        </div>

        <button
          onClick={() => {
            // Focus iframe if it exists
            const iframe = document.querySelector('iframe');
            if (iframe) {
              iframe.focus();
              toast.info('Click in the booking window to proceed to payment');
            }
          }}
          className="mt-4 w-full bg-green-500 hover:bg-green-600 px-8 py-3 rounded-full text-xl font-bold transition-colors"
        >
          Go to Payment
        </button>

        <div className="text-xs text-center mt-3 opacity-70">
          Source: {flight.source === 'live' ? 'Live prices' : 'Cached data'}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

