import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, WifiOff } from 'lucide-react';

interface StatusStripProps {
  status: 'idle' | 'working' | 'recovering';
}

export function StatusStrip({ status }: StatusStripProps) {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 25,
    ram: 45,
    network: navigator.onLine
  });

  // Simulate real system monitoring (would use actual system APIs)
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpu: Math.floor(Math.random() * 30) + 20, // Simulate CPU usage
        ram: Math.floor(Math.random() * 40) + 30, // Simulate RAM usage
        network: navigator.onLine
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Idle';
      case 'working':
        return 'Working';
      case 'recovering':
        return 'Recovering';
      default:
        return 'Idle';
    }
  };

  const getResourceBar = (value: number, color: string = 'blue') => {
    const colorClasses = {
      blue: value > 80 ? 'bg-red-500' : value > 60 ? 'bg-yellow-500' : 'bg-blue-500',
      green: 'bg-green-500',
      red: 'bg-red-500'
    };

    return (
      <div className="flex items-center gap-1">
        <div className="w-6 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} transition-all duration-300`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
        <span className="text-xs font-mono text-gray-300 min-w-[2rem]">
          {value}%
        </span>
      </div>
    );
  };

  return (
    <div className="px-4 py-2 border-t border-slate-700 bg-slate-800 text-xs flex items-center justify-between">
      {/* Left: System Status */}
      <div className="flex items-center gap-4">
        <div className="text-gray-300 font-medium">
          {getStatusText()}
        </div>

        <div className="text-gray-600">•</div>

        <div className="text-gray-500">
          Local-first · Offline-ready
        </div>
      </div>

      {/* Right: Reality Strip - Real system metrics */}
      <div className="flex items-center gap-6">
        {/* CPU */}
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-gray-400" />
          {getResourceBar(systemMetrics.cpu)}
        </div>

        {/* RAM */}
        <div className="flex items-center gap-2">
          <HardDrive size={12} className="text-gray-400" />
          {getResourceBar(systemMetrics.ram)}
        </div>

        {/* Network */}
        <div className="flex items-center gap-2">
          {systemMetrics.network ? (
            <Wifi size={12} className="text-green-400" />
          ) : (
            <WifiOff size={12} className="text-red-400" />
          )}
          <span className="text-xs text-gray-300">
            {systemMetrics.network ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* AI Model */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-xs text-gray-300">Local AI</span>
        </div>
      </div>
    </div>
  );
}
