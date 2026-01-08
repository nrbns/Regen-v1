import React, { useState, useEffect } from 'react';

export function OSBar() {
  const [uptime, setUptime] = useState('00:00:00');

  useEffect(() => {
    const startTime = Date.now();

    const updateUptime = () => {
      const elapsed = Date.now() - startTime;
      const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      setUptime(`${hours}:${minutes}:${seconds}`);
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="toolbar"
      aria-label="OS Authority Bar"
      className="w-full border-b border-gray-700 bg-gray-900 px-4 py-1 text-xs text-gray-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium">Regen OS</span>
          <span className="text-gray-500">•</span>
          <span className="text-green-400">● Stable</span>
        </div>
        <div className="text-gray-400">Uptime: {uptime}</div>
      </div>
    </div>
  );
}

export default OSBar;
