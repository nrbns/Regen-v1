/**
 * TabContextMenu - Right-click menu for tab actions (Ghost, Burn, etc.)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Flame, Clock, Copy, X } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';

interface TabContextMenuProps {
  tabId: string;
  url: string;
  containerId?: string;
  onClose: () => void;
}

export function TabContextMenu({ tabId, url, containerId, onClose }: TabContextMenuProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    // Get last right-click position from global state or event
    const storedPos = (window as any).__lastContextMenuPos || { x: 0, y: 0 };
    setPosition({ x: storedPos.x, y: storedPos.y });
  }, []);

  const handleOpenAsGhost = async () => {
    try {
      await ipc.private.createGhostTab({ url });
      onClose();
    } catch (error) {
      console.error('Failed to open as ghost:', error);
    }
  };

  const handleBurnTab = async () => {
    try {
      if (confirm('Burn this tab? All data will be permanently deleted.')) {
        await ipc.tabs.burn(tabId);
        onClose();
      }
    } catch (error) {
      console.error('Failed to burn tab:', error);
    }
  };

  const handleStartTimer = async () => {
    const minutes = prompt('Auto-close after (minutes):', '10');
    if (minutes) {
      try {
        const ms = parseInt(minutes) * 60 * 1000;
        await ipc.private.createWindow({ url, autoCloseAfter: ms });
        onClose();
      } catch (error) {
        console.error('Failed to start timer:', error);
      }
    }
  };

  const handleDuplicate = async () => {
    try {
      await ipc.tabs.create({ url: url || 'about:blank', containerId });
      onClose();
    } catch (error) {
      console.error('Failed to duplicate tab:', error);
    }
  };

  const menuItems = [
    { icon: Copy, label: 'Duplicate Tab', action: handleDuplicate },
    { icon: Ghost, label: 'Open as Ghost', action: handleOpenAsGhost },
    { icon: Flame, label: 'Burn Tab', action: handleBurnTab, danger: true },
    { icon: Clock, label: 'Start 10-min Timer', action: handleStartTimer },
  ];

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-gray-800/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-xl py-1 min-w-[180px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={idx}
              whileHover={{ backgroundColor: item.danger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)' }}
              onClick={item.action}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                item.danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300 hover:text-gray-100'
              } transition-colors`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

