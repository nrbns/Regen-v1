/**
 * Search Status Indicator Component
 * Shows the health status of the search system
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, WifiOff, Loader2 } from 'lucide-react';
import {
  getSearchHealth,
  checkSearchHealth,
  type SearchHealthStatus,
} from '../../services/searchHealth';

export function SearchStatusIndicator() {
  const [health, setHealth] = useState(getSearchHealth());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Check health on mount
    if (!health) {
      setIsChecking(true);
      checkSearchHealth()
        .then(setHealth)
        .catch(console.error)
        .finally(() => setIsChecking(false));
    }

    // Listen for health updates
    const interval = setInterval(() => {
      const currentHealth = getSearchHealth();
      if (currentHealth) {
        setHealth(currentHealth);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [health]);

  if (!health && !isChecking) {
    return null; // Don't show if no health data
  }

  const getStatusIcon = (status: SearchHealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-400" />;
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />;
    }
  };

  const getStatusText = (status: SearchHealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'Search Ready';
      case 'degraded':
        return 'Local Search Only';
      case 'offline':
        return 'Search Offline';
      case 'checking':
        return 'Checking...';
    }
  };

  const status = isChecking ? 'checking' : health?.status || 'checking';

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1 text-xs"
      title={health?.error || getStatusText(status)}
    >
      {getStatusIcon(status)}
      <span className="text-slate-300">{getStatusText(status)}</span>
      {health?.meiliSearch && <span className="text-[10px] text-green-400">• Meili</span>}
      {health?.localSearch && <span className="text-[10px] text-blue-400">• Local</span>}
    </div>
  );
}
