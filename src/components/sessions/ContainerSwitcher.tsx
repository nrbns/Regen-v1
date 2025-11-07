import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Boxes, Plus } from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useContainerStore } from '../../state/containerStore';
import { ContainerInfo } from '../../lib/ipc-events';
import { ipcEvents } from '../../lib/ipc-events';

export function ContainerSwitcher() {
  const { containers, activeContainerId, setContainers, setActiveContainer } = useContainerStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#22c55e');

  const loadContainers = async () => {
    try {
      const [list, active] = await Promise.all([
        ipc.containers.list(),
        ipc.containers.getActive(),
      ]);
      if (Array.isArray(list)) {
        setContainers(list as ContainerInfo[]);
      }
      if (active) {
        setActiveContainer(active as ContainerInfo);
      }
    } catch (error) {
      console.error('Failed to load containers:', error);
    }
  };

  useEffect(() => {
    loadContainers();
    const unsubscribeList = ipcEvents.on<ContainerInfo[]>('containers:list', (items) => {
      if (Array.isArray(items)) {
        setContainers(items);
      }
    });
    const unsubscribeActive = ipcEvents.on<{ containerId: string; container: ContainerInfo }>('containers:active', (payload) => {
      if (payload?.container) {
        setActiveContainer(payload.container);
      }
    });
    return () => {
      unsubscribeList();
      unsubscribeActive();
    };
  }, []);

  const handleSelect = async (container: ContainerInfo) => {
    try {
      await ipc.containers.setActive(container.id);
      setActiveContainer(container);
      setOpen(false);
    } catch (error) {
      console.error('Failed to set active container:', error);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const container = await ipc.containers.create({ name: name.trim(), color });
      if (container) {
        await loadContainers();
        await ipc.containers.setActive(container.id);
        setActiveContainer(container as ContainerInfo);
      }
      setName('');
      setCreating(false);
      setOpen(false);
    } catch (error) {
      console.error('Failed to create container:', error);
    }
  };

  const activeContainer = containers.find((c) => c.id === activeContainerId);

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-gray-100 transition-all"
        title="Container (isolated storage)"
      >
        <Boxes size={16} />
        <span className="text-sm font-medium">{activeContainer?.name || 'Default'}</span>
        {activeContainer?.color && (
          <div
            className="w-3 h-3 rounded-full border border-gray-700"
            style={{ backgroundColor: activeContainer.color }}
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-lg shadow-xl overflow-hidden z-40"
          >
            <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Containers</h3>
              <button
                onClick={() => {
                  setCreating(true);
                  setName('');
                  setColor('#22c55e');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-blue-400 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {creating && (
                <div className="p-3 border-b border-gray-800/50">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Container name"
                    autoFocus
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-xs text-gray-400">Color</label>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-7 w-16 bg-transparent border border-gray-700 rounded"
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleCreate}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false);
                        setName('');
                      }}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {containers.map((container) => {
                const isActive = container.id === activeContainerId;
                return (
                  <button
                    key={container.id}
                    onClick={() => handleSelect(container)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-gray-800/50 transition-colors ${
                      isActive ? 'bg-blue-600/20 border-blue-500/30' : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-gray-700"
                      style={{ backgroundColor: container.color }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200 truncate">{container.name}</div>
                      <div className="text-xs text-gray-500 truncate">{container.partition}</div>
                    </div>
                    {isActive && <span className="text-xs text-blue-400">Active</span>}
                  </button>
                );
              })}

              {containers.length === 0 && !creating && (
                <div className="p-3 text-xs text-gray-500">No containers yet</div>
              )}
            </div>

            <div className="p-3 border-t border-gray-800/50 bg-gray-900/50">
              <p className="text-xs text-gray-500">
                Containers isolate cookies, storage, and login state per tab.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


