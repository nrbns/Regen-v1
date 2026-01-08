import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Search,
  BookOpen,
  Settings,
  Folder,
  FileText,
  Download,
  TrendingUp,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../../state/appStore';
import { useWindowManager } from './WindowManager';

type Mode =
  | 'Browse'
  | 'Research'
  | 'Trade'
  | 'Knowledge'
  | 'Dev'
  | 'Games'
  | 'Docs'
  | 'Images'
  | 'Threats'
  | 'GraphMind';

interface DesktopIcon {
  id: string;
  label: string;
  Icon: React.ComponentType<any>;
  action: () => void;
  position: { x: number; y: number };
}

export function DesktopIcons(): JSX.Element {
  const setMode = useAppStore(state => state.setMode) as (m: Mode) => void;
  const { createWindow } = useWindowManager();
  const [draggedIcon, setDraggedIcon] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const icons: DesktopIcon[] = [
    {
      id: 'browser',
      label: 'OmniBrowser',
      Icon: Globe,
      action: () => setMode('Browse'),
      position: { x: 40, y: 40 },
    },
    {
      id: 'research',
      label: 'Research Hub',
      Icon: Search,
      action: () => setMode('Research'),
      position: { x: 40, y: 160 },
    },
    {
      id: 'knowledge',
      label: 'Knowledge Base',
      Icon: BookOpen,
      action: () => setMode('Knowledge'),
      position: { x: 40, y: 280 },
    },
    {
      id: 'trade',
      label: 'Trade',
      Icon: TrendingUp,
      action: () => setMode('Trade'),
      position: { x: 100, y: 40 },
    },
    {
      id: 'dev',
      label: 'Developer',
      Icon: Terminal,
      action: () => setMode('Dev'),
      position: { x: 100, y: 160 },
    },
    {
      id: 'documents',
      label: 'Documents',
      Icon: Folder,
      action: () => setMode('Docs'),
      position: { x: 160, y: 40 },
    },
    {
      id: 'downloads',
      label: 'Downloads',
      Icon: Download,
      action: () =>
        createWindow('downloads-window', 'Downloads', <div className="p-4">Downloads</div>),
      position: { x: 160, y: 160 },
    },
    {
      id: 'settings',
      label: 'Settings',
      Icon: Settings,
      action: () =>
        createWindow('settings-window', 'Settings', <div className="p-4">Settings</div>),
      position: { x: 160, y: 280 },
    },
  ];

  const handleDragStart = (id: string) => setDraggedIcon(id);
  const handleDragEnd = (id: string, info: { point: { x: number; y: number } }) => {
    console.log('drag end', id, info.point);
    setDraggedIcon(null);
  };

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      {icons.map(icon => (
        <motion.div
          key={icon.id}
          className="pointer-events-auto absolute flex cursor-pointer select-none flex-col items-center gap-2"
          style={{ left: icon.position.x, top: icon.position.y }}
          drag
          dragMomentum={false}
          dragConstraints={containerRef}
          onDragStart={() => handleDragStart(icon.id)}
          onDragEnd={(e, info) => handleDragEnd(icon.id, info as any)}
          initial={false}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div
            onDoubleClick={icon.action}
            className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm transition-all duration-200 group-hover:bg-white/20"
          >
            <icon.Icon className="h-7 w-7 text-white/90" />
          </div>

          <div className="max-w-[100px] truncate rounded bg-black/50 px-2 py-1 text-center text-xs text-white/90 backdrop-blur-sm">
            {icon.label}
          </div>

          {draggedIcon === icon.id && (
            <motion.div
              layoutId="selection"
              className="absolute -inset-1 rounded-xl border-2 border-blue-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default DesktopIcons;
