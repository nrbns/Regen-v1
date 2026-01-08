import React from 'react';
import { useTaskStore } from '../../state/taskStore';
import { offlineAgent } from '../../../core/ai/offline/offlineAgent';

/**
 * Resource Bar - Shows system resources and AI model status
 */
export function ResourceBar() {
  const { resources, isConnected } = useTaskStore();

  return (
    <div className="border-t border-slate-700 p-3 bg-slate-800">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-6">
          {/* CPU Usage */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">CPU</span>
            <div className="w-12 h-2 bg-slate-600 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${resources.cpu}%` }}
              />
            </div>
            <span className="text-slate-300 w-8 text-right">{resources.cpu}%</span>
          </div>

          {/* RAM Usage */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">RAM</span>
            <div className="w-12 h-2 bg-slate-600 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${resources.ram}%` }}
              />
            </div>
            <span className="text-slate-300 w-8 text-right">{resources.ram}%</span>
          </div>

          {/* Network Status */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">NET</span>
            <span className={`px-2 py-0.5 rounded text-[10px] ${
              isConnected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {isConnected ? 'ON' : 'OFF'}
            </span>
          </div>

          {/* AI Model Status */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">MODEL</span>
            <span className={`px-2 py-0.5 rounded text-[10px] ${
              offlineAgent.isReady() ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
            }`}>
              {offlineAgent.isReady() ? 'Local' : 'Loading'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
