/**
 * Flight Card Component
 * Shows flight booking details with round-trip support
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, X, ArrowRight } from 'lucide-react';
import { toast } from '../../utils/toast';

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
        className="fixed left-1/2 top-1/2 z-50 max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-purple-500 bg-gradient-to-r from-indigo-900 to-purple-900 p-8 text-white shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              {flight.from} <ArrowRight className="h-5 w-5" /> {flight.to}
            </div>
            <div className="mt-1 text-sm text-gray-300">{flight.type}</div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-4 text-center text-5xl font-bold">{flight.price}</div>

        <div className="mb-2 text-center text-lg">
          <div>Out: {flight.depart}</div>
          {flight.return !== '—' && <div>Return: {flight.return}</div>}
        </div>

        <div className="mb-4 flex items-center justify-center gap-2 text-center text-xl">
          <Plane className="h-5 w-5" />
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
          className="mt-4 w-full rounded-full bg-green-500 px-8 py-3 text-xl font-bold transition-colors hover:bg-green-600"
        >
          Go to Payment
        </button>

        <div className="mt-3 text-center text-xs opacity-70">
          Source: {flight.source === 'live' ? 'Live prices' : 'Cached data'}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
