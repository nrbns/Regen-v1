import { useEffect, useState } from 'react';
import { Download as DownloadIcon, FolderOpen, CheckCircle, XCircle, Clock, Loader, Pause, Play, X, PlayCircle, RotateCw, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { ipc } from '../lib/ipc-typed';
import { DownloadUpdate } from '../lib/ipc-events';
import { ipcEvents } from '../lib/ipc-events';
import { MediaPlayer, getMediaKind } from '../components/MediaPlayer';

type DownloadSafety = {
  status: 'pending' | 'clean' | 'warning' | 'blocked' | 'unknown';
  threatLevel?: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  recommendations?: string[];
  scannedAt?: number;
  quarantinePath?: string;
};

type DownloadItem = { 
  id: string; 
  url: string; 
  filename?: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'blocked' | 'paused' | 'verifying'; 
  path?: string; 
  createdAt: number;
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
  checksum?: string;
  safety?: DownloadSafety;
  speedBytesPerSec?: number;
  etaSeconds?: number;
};

export default function DownloadsPage() {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<DownloadItem | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ active: number; queued: number; maxConcurrent: number } | null>(null);

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

    // Load queue status
    const loadQueueStatus = async () => {
      try {
        const status = await ipc.downloads.getQueue?.();
        if (status) {
          setQueueStatus(status);
        }
      } catch (error) {
        console.error('Failed to load queue status:', error);
      }
    };
    loadQueueStatus();
    const queueInterval = setInterval(loadQueueStatus, 2000); // Update every 2 seconds

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
          safety: update.safety,
          speedBytesPerSec: update.speedBytesPerSec,
          etaSeconds: update.etaSeconds,
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
      clearInterval(queueInterval);
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
    if (item.status === 'completed' || item.status === 'verifying') return 100;
    return 0;
  };

  const formatSpeed = (bps?: number) => {
    if (!bps || !Number.isFinite(bps) || bps <= 0) return '—';
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(bps) / Math.log(1024)));
    const value = bps / Math.pow(1024, idx);
    return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[idx]}`;
  };

  const formatEta = (seconds?: number) => {
    if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return '—';
    const rounded = Math.max(0, Math.round(seconds));
    const hours = Math.floor(rounded / 3600);
    const minutes = Math.floor((rounded % 3600) / 60);
    const secs = rounded % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  };

  const isPreviewable = (item: DownloadItem) => {
    if (!item?.path || item.status !== 'completed') return false;
    return Boolean(getMediaKind(item.filename || item.path));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
      case 'blocked':
        return <XCircle size={16} className="text-red-400" />;
      case 'downloading':
      case 'paused':
      case 'verifying':
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

  const renderSafetyBadge = (safety?: DownloadSafety) => {
    if (!safety) return null;
    const base = 'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border';
    switch (safety.status) {
      case 'clean':
        return <span className={`${base} bg-emerald-500/15 border-emerald-500/30 text-emerald-200`}>Scanned Clean</span>;
      case 'warning':
        return <span className={`${base} bg-amber-500/15 border-amber-500/30 text-amber-200`}>Review Recommended</span>;
      case 'blocked':
        return <span className={`${base} bg-red-500/15 border-red-500/40 text-red-200`}>Quarantined</span>;
      case 'pending':
        return <span className={`${base} bg-blue-500/15 border-blue-500/30 text-blue-200`}>Scanning…</span>;
      default:
        return <span className={`${base} bg-gray-500/15 border-gray-600/40 text-gray-300`}>Scan Unavailable</span>;
    }
  };

  const renderSafetyDetails = (safety?: DownloadSafety) => {
    if (!safety) return null;
    return (
      <div className="text-xs text-gray-500 space-y-1 mt-2">
        <div className="flex items-center gap-2">
          {renderSafetyBadge(safety)}
          {safety.threatLevel && (
            <span className="text-[10px] uppercase text-gray-400">
              Threat level: {safety.threatLevel}
            </span>
          )}
        </div>
        {safety.details && <div>{safety.details}</div>}
        {safety.recommendations && safety.recommendations.length > 0 && (
          <ul className="list-disc list-inside text-[11px] space-y-0.5">
            {safety.recommendations.slice(0, 3).map((rec, idx) => (
              <li key={`${safety.scannedAt}-${idx}`}>{rec}</li>
            ))}
          </ul>
        )}
        {safety.status === 'blocked' && safety.quarantinePath && (
          <div className="text-[11px] text-red-300">
            File moved to quarantine: <span className="font-mono">{safety.quarantinePath}</span>
          </div>
        )}
      </div>
    );
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Downloads</h2>
            <p className="text-sm text-gray-400 mt-1">
              {items.length} {items.length === 1 ? 'download' : 'downloads'}
            </p>
          </div>
          {queueStatus && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Loader size={14} className="text-blue-400 animate-spin" />
                <span className="text-blue-300">Active:</span>
                <span className="text-blue-200 font-semibold">{queueStatus.active}/{queueStatus.maxConcurrent}</span>
              </div>
              {queueStatus.queued > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <List size={14} className="text-amber-400" />
                  <span className="text-amber-300">Queued:</span>
                  <span className="text-amber-200 font-semibold">{queueStatus.queued}</span>
                </div>
              )}
            </div>
          )}
        </div>
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
                data-testid="download-card"
                data-download-id={d.id}
                data-filename={d.filename || ''}
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
                      {renderSafetyBadge(d.safety)}
                    </div>
                    
                    {/* Progress bar for active downloads */}
                    {d.status === 'downloading' || d.status === 'paused' ? (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5">
                          <span className="font-medium">{formatBytes(d.receivedBytes)} / {formatBytes(d.totalBytes)}</span>
                          <span className="font-semibold text-blue-400">{calcPercent(d)}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden mb-2">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${calcPercent(d)}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs font-medium">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30">
                            <span className="text-blue-300">Speed:</span>
                            <span className="text-blue-200 font-semibold">{formatSpeed(d.speedBytesPerSec)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/30">
                            <Clock size={12} className="text-purple-300" />
                            <span className="text-purple-300">ETA:</span>
                            <span className="text-purple-200 font-semibold">{formatEta(d.etaSeconds)}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {d.status === 'verifying' && (
                      <div className="mb-2 text-xs text-blue-300 flex items-center gap-2">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Verifying download integrity…</span>
                      </div>
                    )}

                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{d.url}</span>
                        {d.totalBytes && d.totalBytes > 1024 * 1024 * 1024 && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-[10px] font-semibold">
                            Large File ({formatBytes(d.totalBytes)})
                          </span>
                        )}
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
                      {renderSafetyDetails(d.safety)}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {d.status === 'downloading' && (
                      <>
                        <motion.button
                          onClick={async () => {
                            try {
                              await ipc.downloads.pause(d.id);
                              setItems(prev => prev.map(item => 
                                item.id === d.id ? { ...item, status: 'paused' as const } : item
                              ));
                            } catch (error) {
                              console.error('Failed to pause download:', error);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium text-xs transition-colors"
                          title="Pause download"
                        >
                          <Pause size={16} />
                          <span>Pause</span>
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            try {
                              await ipc.downloads.cancel(d.id);
                              setItems(prev => prev.map(item => 
                                item.id === d.id ? { ...item, status: 'cancelled' as const } : item
                              ));
                            } catch (error) {
                              console.error('Failed to stop download:', error);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-medium text-xs transition-colors"
                          title="Stop download"
                        >
                          <X size={16} />
                          <span>Stop</span>
                        </motion.button>
                      </>
                    )}
                    {d.status === 'paused' && (
                      <>
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
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-200 font-medium text-xs transition-colors"
                          title="Resume download"
                        >
                          <Play size={16} />
                          <span>Resume</span>
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            try {
                              await ipc.downloads.cancel(d.id);
                              setItems(prev => prev.map(item => 
                                item.id === d.id ? { ...item, status: 'cancelled' as const } : item
                              ));
                            } catch (error) {
                              console.error('Failed to stop download:', error);
                            }
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-medium text-xs transition-colors"
                          title="Stop download"
                        >
                          <X size={16} />
                          <span>Stop</span>
                        </motion.button>
                      </>
                    )}
                    {(d.status === 'failed' || d.status === 'cancelled') && (
                      <motion.button
                        onClick={async () => {
                          try {
                            await ipc.downloads.retry?.(d.id);
                            setItems(prev => prev.map(item => 
                              item.id === d.id ? { ...item, status: 'pending' as const } : item
                            ));
                            // Reload queue status
                            const status = await ipc.downloads.getQueue?.();
                            if (status) setQueueStatus(status);
                          } catch (error) {
                            console.error('Failed to retry download:', error);
                          }
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-200 font-medium text-xs transition-colors"
                        title="Retry download"
                      >
                        <RotateCw size={16} />
                        <span>Retry</span>
                      </motion.button>
                    )}
                    {(d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled' || d.status === 'blocked') && d.path && (
                      <>
                        {d.status !== 'blocked' && d.status === 'completed' && (
                          <motion.button
                            onClick={() => handleOpenFile(d.path)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-blue-400 transition-colors"
                            title="Open file"
                          >
                            <DownloadIcon size={18} />
                          </motion.button>
                        )}
                        {d.status === 'completed' && d.path && isPreviewable(d) && (
                          <motion.button
                            onClick={() => setPreviewItem(d)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-gray-300 hover:text-purple-400 transition-colors"
                            title="Preview media"
                          >
                            <PlayCircle size={18} />
                          </motion.button>
                        )}
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
      {previewItem && previewItem.path && (
        <MediaPlayer
          filePath={previewItem.path}
          fileName={previewItem.filename}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}


