/**
 * ContainerQuickSelector - Quick access to Work/Personal/Anonymous containers
 */

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, User, EyeOff, ChevronDown } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useContainerStore } from '../../state/containerStore';
import type { ContainerInfo } from '../../lib/ipc-events';

interface ContainerQuickSelectorProps {
  onSelect?: (containerId: string) => void;
  compact?: boolean;
  showLabel?: boolean;
}

const PRESET_CONTAINERS = [
  {
    name: 'Work',
    color: '#3b82f6',
    icon: Briefcase,
    description: 'Work-related browsing',
  },
  {
    name: 'Personal',
    color: '#10b981',
    icon: User,
    description: 'Personal browsing',
  },
  {
    name: 'Anonymous',
    color: '#8b5cf6',
    icon: EyeOff,
    description: 'Private browsing',
  },
] as const;

export function ContainerQuickSelector({ onSelect, compact = false, showLabel = true }: ContainerQuickSelectorProps) {
  const { containers, activeContainerId, setActiveContainer } = useContainerStore();
  const [open, setOpen] = useState(false);
  const [presetContainers, setPresetContainers] = useState<ContainerInfo[]>([]);

  // Ensure preset containers exist
  useEffect(() => {
    const ensurePresets = async () => {
      const existing = await ipc.containers.list();
      const presetNames = PRESET_CONTAINERS.map(p => p.name.toLowerCase());
      
      const missing = PRESET_CONTAINERS.filter(
        preset => !existing.some(c => c.name.toLowerCase() === preset.name.toLowerCase())
      );

      if (missing.length > 0) {
        // Create missing preset containers
        for (const preset of missing) {
          try {
            await ipc.containers.create({
              name: preset.name,
              color: preset.color,
            });
          } catch (error) {
            console.warn(`Failed to create preset container ${preset.name}:`, error);
          }
        }
      }

      // Reload containers
      const updated = await ipc.containers.list();
      const presets: ContainerInfo[] = [];
      for (const preset of PRESET_CONTAINERS) {
        const found = updated.find(c => c.name.toLowerCase() === preset.name.toLowerCase());
        if (found && found.scope) {
          presets.push(found as ContainerInfo);
        }
      }
      
      setPresetContainers(presets);
    };

    void ensurePresets();
  }, []);

  // Update preset containers when containers change
  useEffect(() => {
    const presets = PRESET_CONTAINERS.map(preset => 
      containers.find(c => c.name.toLowerCase() === preset.name.toLowerCase())
    ).filter((c): c is ContainerInfo => c !== undefined);
    setPresetContainers(presets);
  }, [containers]);

  const handleSelect = useCallback(async (container: ContainerInfo) => {
    try {
      const active = await ipc.containers.setActive(container.id);
      if (active) {
        setActiveContainer(active as ContainerInfo);
      } else {
        setActiveContainer(container);
      }
      onSelect?.(container.id);
      setOpen(false);
    } catch (error) {
      console.error('Failed to set active container:', error);
    }
  }, [onSelect, setActiveContainer]);

  const activeContainer = containers.find(c => c.id === activeContainerId);
  const activePreset = presetContainers.find(c => c.id === activeContainerId);
  const activePresetDef = activePreset 
    ? PRESET_CONTAINERS.find(p => p.name.toLowerCase() === activePreset.name.toLowerCase())
    : null;

  const Icon = activePresetDef?.icon || Briefcase;

  if (compact) {
    return (
      <div className="relative">
        <motion.button
          onClick={() => setOpen(!open)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          title={activeContainer?.name || 'Select container'}
        >
          {activePresetDef && (
            <Icon size={14} className="text-muted" />
          )}
          {!activePresetDef && activeContainer?.color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activeContainer.color }}
            />
          )}
          {showLabel && activeContainer && (
            <span className="text-xs text-muted">{activeContainer.name}</span>
          )}
          <ChevronDown size={12} className="text-muted" />
        </motion.button>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-30"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 bg-surface-elevated/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-40 overflow-hidden"
              >
                <div className="p-2">
                  {presetContainers.map((container) => {
                    const preset = PRESET_CONTAINERS.find(p => p.name.toLowerCase() === container.name.toLowerCase());
                    const PresetIcon = preset?.icon || Briefcase;
                    const isActive = container.id === activeContainerId;
                    
                    return (
                      <motion.button
                        key={container.id}
                        onClick={() => handleSelect(container)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary/20 border border-primary/40 text-primary'
                            : 'hover:bg-white/10 text-muted hover:text-primary'
                        }`}
                      >
                        <PresetIcon size={16} />
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{container.name}</div>
                          {preset && (
                            <div className="text-xs text-muted/70">{preset.description}</div>
                          )}
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full selector with all containers
  return (
    <div className="flex items-center gap-2">
      {presetContainers.map((container) => {
        const preset = PRESET_CONTAINERS.find(p => p.name.toLowerCase() === container.name.toLowerCase());
        const PresetIcon = preset?.icon || Briefcase;
        const isActive = container.id === activeContainerId;

        return (
          <motion.button
            key={container.id}
            onClick={() => handleSelect(container)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              isActive
                ? 'bg-primary/20 border-primary/40 text-primary shadow-lg shadow-primary/20'
                : 'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-primary'
            }`}
            title={preset?.description || container.name}
          >
            <PresetIcon size={16} />
            {showLabel && <span className="text-sm font-medium">{container.name}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

