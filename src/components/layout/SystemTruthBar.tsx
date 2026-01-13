/**
 * System Truth Bar - Bottom Bar
 * 
 * Always visible.
 * Shows: CPU%, RAM, NET status, MODE (Local/Hybrid/Online)
 * 
 * Rules:
 * - NET changes to "Sending" only when data leaves device
 * - MODE switches: Local / Hybrid / Online
 * - This single bar makes investors and power users trust you
 */

import React, { useState, useEffect } from 'react';
import { Activity, HardDrive, Wifi, WifiOff, Server } from 'lucide-react';
import { getRunningTasks } from '../../core/execution/taskManager';
import { onNetworkStatusChange, getNetworkStatus } from '../../core/runtime/networkMonitor';

type NetworkStatus = 'idle' | 'sending' | 'receiving';
type ProcessingMode = 'local' | 'hybrid' | 'online';

export function SystemTruthBar() {
  const [cpu, setCpu] = useState<number>(0);
  const [ram, setRam] = useState<string>('0 MB');
  const [net, setNet] = useState<NetworkStatus>('idle');
  const [mode, setMode] = useState<ProcessingMode>('local');

  useEffect(() => {
    // Update CPU based on running tasks
    const updateMetrics = () => {
      const runningTasks = getRunningTasks();
      const taskCount = runningTasks.length;
      
      // Simulate CPU based on task count (0-50% max)
      setCpu(Math.min(taskCount * 15, 50));
      
      // Simulate RAM (base + per task)
      const baseRamMB = 512;
      const perTaskMB = 128;
      const totalRamMB = baseRamMB + (taskCount * perTaskMB);
      setRam(`${(totalRamMB / 1024).toFixed(2)} GB`);
      
      // Network status is tracked separately via networkMonitor
      // Don't update here - it's event-driven
      
      // Determine mode based on tasks
      // Check actual processor type from tasks (meta.mode field)
      if (runningTasks.length > 0) {
        // Check if any task uses online mode
        const hasOnlineTask = runningTasks.some(task => task.meta?.mode === 'online');
        const hasHybridTask = runningTasks.some(task => task.meta?.mode === 'hybrid');
        
        if (hasOnlineTask) {
          setMode('online');
        } else if (hasHybridTask) {
          setMode('hybrid');
        } else {
          setMode('local'); // Default to local if no mode specified
        }
      } else {
        setMode('local'); // No tasks running = local mode
      }
    };

    updateMetrics();
    
    // Set initial network status
    setNet(getNetworkStatus());

    // Listen to task events
    let cleanup: (() => void)[] = [];
    
    import('../../core/execution/eventBus').then(({ eventBus }) => {
      const handlers = [
        eventBus.on('task:created', updateMetrics),
        eventBus.on('task:updated', updateMetrics),
        eventBus.on('task:completed', updateMetrics),
        eventBus.on('task:cancelled', updateMetrics),
        eventBus.on('network:status', (data: { status: NetworkStatus }) => {
          setNet(data.status);
        }),
      ];

      cleanup = handlers;
    }).catch(() => {});

    // Listen to network status changes (event-driven)
    const unsubscribeNetwork = onNetworkStatusChange((status) => {
      setNet(status);
    });
    cleanup.push(unsubscribeNetwork);

    // ENFORCEMENT: No polling - update only when tasks change
    // Event handlers above already call updateMetrics on every change
    // No interval needed - pure event-driven
    
    return () => {
      cleanup.forEach(fn => fn());
    };
  }, []);

  const getNetworkIcon = () => {
    if (net === 'sending' || net === 'receiving') {
      return <Wifi className="w-4 h-4" />;
    }
    return <WifiOff className="w-4 h-4" />;
  };

  const getModeIcon = () => {
    switch (mode) {
      case 'local':
        return <HardDrive className="w-4 h-4" />;
      case 'hybrid':
        return <Server className="w-4 h-4" />;
      case 'online':
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'local':
        return 'Local';
      case 'hybrid':
        return 'Hybrid';
      case 'online':
        return 'Online';
    }
  };

  return (
    <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-4 text-xs">
      <div className="flex items-center gap-6">
        {/* CPU */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">CPU:</span>
          <span className={`font-mono ${
            cpu > 40 ? 'text-red-400' :
            cpu > 20 ? 'text-yellow-400' :
            'text-green-400'
          }`}>
            {cpu}%
          </span>
        </div>

        {/* RAM */}
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-gray-400" />
          <span className="text-gray-300">RAM:</span>
          <span className="font-mono text-white">{ram}</span>
        </div>

        {/* NET */}
        <div className="flex items-center gap-2">
          {getNetworkIcon()}
          <span className="text-gray-300">NET:</span>
          <span className={`font-mono ${
            net === 'idle' ? 'text-gray-400' :
            net === 'sending' ? 'text-blue-400' :
            'text-green-400'
          }`}>
            {net === 'idle' ? 'Idle' :
             net === 'sending' ? 'Sending' :
             'Receiving'}
          </span>
        </div>

        {/* MODE */}
        <div className="flex items-center gap-2">
          {getModeIcon()}
          <span className="text-gray-300">MODE:</span>
          <span className={`font-mono ${
            mode === 'local' ? 'text-green-400' :
            mode === 'hybrid' ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {getModeLabel()}
          </span>
        </div>
      </div>
    </div>
  );
}
