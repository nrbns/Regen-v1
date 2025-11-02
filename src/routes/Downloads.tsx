import { useEffect, useState } from 'react';
import { Download, FolderOpen, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import { motion } from 'framer-motion';
import { ipc } from '../lib/ipc-typed';
import { useIPCEvent } from '../lib/use-ipc-event';
import { DownloadUpdate } from '../lib/ipc-events';

type DownloadItem = { 
  id: string; 
  url: string; 
  filename?: string;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'in-progress'; 
  path?: string; 
  createdAt: number;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
};

export default function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial downloads
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const list = await ipc.downloads.list() as DownloadItem[];
        setItems(list || []);
      } catch (error) {
        console.error('Failed to load downloads:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDownloads();
  }, []);

  // Listen for download updates
  useIPCEvent<DownloadUpdate>('downloads:started', () => {
    ipc.downloads.list().then((list: any) => setItems(list || [])).catch(console.error);
  }, []);

  useIPCEvent<DownloadUpdate>('downloads:progress', () => {
    ipc.downloads.list().then((list: any) => setItems(list || [])).catch(console.error);
  }, []);

  useIPCEvent<DownloadUpdate>('downloads:done', () => {
    ipc.downloads.list().then((list: any) => setItems(list || [])).catch(console.error);
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
            <Download size={48} className="text-gray-600 mb-4" />
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
                          <span>{d.progress ? Math.round(d.progress * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(d.progress || 0) * 100}%` }}
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
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {d.status === 'completed' && d.path && (
                      <>
                        <motion.button
                          onClick={() => handleOpenFile(d.path)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors"
                          title="Open file"
                        >
                          <Download size={18} />
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


