import { useEffect, useState } from 'react';
import { Download as DownloadIcon, FolderOpen, CheckCircle, XCircle, Clock, Loader, Pause, Play, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { ipc } from '../lib/ipc-typed';
import { DownloadUpdate } from '../lib/ipc-events';
import { ipcEvents } from '../lib/ipc-events';

type DownloadItem = { 
  id: string; 
  url: string; 
  filename?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'in-progress'; 
  path?: string; 
  createdAt: number;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
  checksum?: string;
};

export default function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const list = (await ipc.downloads.list()) as DownloadItem[];
        if (Array.isArray(list)) {
          setItems(list.sort((a, b) => b.createdAt - a.createdAt));
        }
      } catch (error) {
        console.error('Failed to load downloads:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDownloads();

    const updateItem = (update: DownloadUpdate) => {
      if (!update?.id) return;
      setItems(prev => {
        const existingIndex = prev.findIndex(item => item.id === update.id);
        const updatedItem: DownloadItem = {
          id: update.id,
          url: update.url,
          filename: update.filename,
          status: (update.status as DownloadItem['status']) || 'downloading',
          path: update.path,
          checksum: update.checksum,
          createdAt: update.createdAt || Date.now(),
          progress: update.progress,
          receivedBytes: update.receivedBytes,
          totalBytes: update.totalBytes,
        };

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            ...updatedItem,
            createdAt: next[existingIndex].createdAt || updatedItem.createdAt,
          };
          return next.sort((a, b) => b.createdAt - a.createdAt);
        }

        return [updatedItem, ...prev].sort((a, b) => b.createdAt - a.createdAt);
      });
    };

    const progressUnsub = ipcEvents.on<DownloadUpdate>('downloads:progress', updateItem);
    const doneUnsub = ipcEvents.on<DownloadUpdate>('downloads:done', updateItem);

    return () => {
      progressUnsub();
      doneUnsub();
    };
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const calcPercent = (item: DownloadItem) => {
    if (typeof item.progress === 'number') {
      return Math.min(100, Math.max(0, Math.round(item.progress * 100)));
    }
    if (item.totalBytes && item.totalBytes > 0) {
      return Math.min(100, Math.round(((item.receivedBytes || 0) / item.totalBytes) * 100));
    }
    if (item.status === 'completed') return 100;
    return 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      case 'downloading':
      case 'in-progress':
        return <Loader size={16} className="text-blue-400 animate-spin" />;
      case 'cancelled':
        return <XCircle size={16} className="text-gray-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const handleOpenFile = (path?: string) => {
    if (path) {
      // Use IPC to open file in system default application
      ipc.downloads.openFile?.(path).catch(console.error);
    }
  };

  const handleOpenFolder = (path?: string) => {
    if (path) {
      // Use IPC to open folder in file explorer
      ipc.downloads.showInFolder?.(path).catch(console.error);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#1A1D28]">
        <Loader size={24} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#1A1D28] text-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-800/50">
        <h2 className="text-2xl font-bold">Downloads</h2>
        <p className="text-sm text-gray-400 mt-1">
          {items.length} {items.length === 1 ? 'download' : 'downloads'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <DownloadIcon size={48} className="text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-300 mb-2">No downloads yet</h3>
            <p className="text-sm text-gray-500">Files you download will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900/60 backdrop-blur-sm border border-gray-800/50 rounded-lg p-4 hover:bg-gray-900/80 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(d.status)}
                      <span className="font-medium text-gray-200 truncate">
                        {d.filename || d.url.split('/').pop() || 'Download'}
                      </span>
                    </div>
                    
                    {/* Progress bar for active downloads */}
                    {d.status === 'downloading' || d.status === 'in-progress' ? (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>{formatBytes(d.receivedBytes)} / {formatBytes(d.totalBytes)}</span>
                          <span>{calcPercent(d)}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${calcPercent(d)}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{d.url}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>{new Date(d.createdAt).toLocaleString()}</span>
                        <span className="capitalize">{d.status}</span>
                        {d.path && (
                          <span className="truncate max-w-xs" title={d.path}>
                            {d.path.replace(/^.*[\\\/]/, '')}
                          </span>
                        )}
                      </div>
                      {d.checksum && (
                        <div className="text-xs text-gray-500 truncate" title={`SHA-256: ${d.checksum}`}>
                          SHA-256: {d.checksum.slice(0, 12)}…
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {(d.status === 'downloading' || d.status === 'in-progress') && (
                      <>
                        <motion.button
                          onClick={async () => {
                            try {
                              await ipc.downloads.pause(d.id);
                              setItems(prev => prev.map(item => 
                                item.id === d.id ? { ...item, status: 'in-progress' as const } : item
                              ));
                            } catch (error) {
                              console.error('Failed to pause download:', error);
                            }
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-yellow-400 transition-colors"
                          title="Pause download"
                        >
                          <Pause size={18} />
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            try {
                              await ipc.downloads.cancel(d.id);
                              setItems(prev => prev.map(item => 
                                item.id === d.id ? { ...item, status: 'cancelled' as const } : item
                              ));
                            } catch (error) {
                              console.error('Failed to cancel download:', error);
                            }
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-red-400 transition-colors"
                          title="Cancel download"
                        >
                          <X size={18} />
                        </motion.button>
                      </>
                    )}
                    {d.status === 'in-progress' && (
                      <motion.button
                        onClick={async () => {
                          try {
                            await ipc.downloads.resume(d.id);
                            setItems(prev => prev.map(item => 
                              item.id === d.id ? { ...item, status: 'downloading' as const } : item
                            ));
                          } catch (error) {
                            console.error('Failed to resume download:', error);
                          }
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-green-400 transition-colors"
                        title="Resume download"
                      >
                        <Play size={18} />
                      </motion.button>
                    )}
                    {d.status === 'completed' && d.path && (
                      <>
                        <motion.button
                          onClick={() => handleOpenFile(d.path)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors"
                          title="Open file"
                        >
                          <DownloadIcon size={18} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleOpenFolder(d.path)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors"
                          title="Show in folder"
                        >
                          <FolderOpen size={18} />
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


