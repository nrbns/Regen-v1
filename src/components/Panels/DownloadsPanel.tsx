/**
 * DownloadsPanel - Real-time downloads manager with progress, checksums, and queue
 */

// @ts-nocheck

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle2, XCircle, Loader2, FolderOpen, ExternalLink, ShieldCheck, Trash2, PlayCircle } from 'lucide-react';
import { useIPCEvent } from '../../lib/use-ipc-event';
import { ipc } from '../../lib/ipc-typed';
import { DownloadUpdate } from '../../lib/ipc-events';
import { MediaPlayer, getMediaKind } from '../MediaPlayer';

interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled' | 'blocked' | 'in-progress';
  progress?: number;
  receivedBytes?: number;
  totalBytes?: number;
  path?: string;
  checksum?: string;
  createdAt: number;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  safety?: {
    status: 'pending' | 'clean' | 'warning' | 'blocked' | 'unknown';
    threatLevel?: 'low' | 'medium' | 'high' | 'critical';
    details?: string;
    recommendations?: string[];
    scannedAt?: number;
    quarantinePath?: string;
  };
}

export function DownloadsPanel() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<DownloadItem | null>(null);

  // Load initial downloads
  useEffect(() => {
    const loadDownloads = async () => {
      try {
        const list = await ipc.downloads.list();
        const normalized = (list || []).map((item: any) => ({
          ...item,
          status: item.status || 'pending',
        }));
        setDownloads(normalized);
      } catch (error) {
        console.error('Failed to load downloads:', error);
      }
    };
    loadDownloads();
  }, []);

  // Listen for download events
  useIPCEvent<DownloadUpdate>('downloads:started', (data) => {
    setDownloads(prev => {
      const existing = prev.find(d => d.id === data.id);
      if (existing) {
        return prev.map(d => d.id === data.id ? { ...d, ...data } : d);
      }
      return [...prev, {
        id: data.id,
        url: data.url,
        filename: data.filename,
        status: data.status,
        progress: data.progress,
        receivedBytes: data.receivedBytes,
        totalBytes: data.totalBytes,
        createdAt: Date.now(),
        speedBytesPerSec: data.speedBytesPerSec,
        etaSeconds: data.etaSeconds,
        safety: data.safety,
      }];
    });
  }, []);

  useIPCEvent<DownloadUpdate>('downloads:progress', (data) => {
    setDownloads(prev => prev.map(d => 
      d.id === data.id 
        ? {
            ...d,
            progress: data.progress,
            receivedBytes: data.receivedBytes,
            totalBytes: data.totalBytes,
            status: data.status || 'downloading',
            speedBytesPerSec: data.speedBytesPerSec,
            etaSeconds: data.etaSeconds,
            safety: data.safety ?? d.safety,
          }
        : d
    ));
  }, []);

  useIPCEvent<DownloadUpdate>('downloads:done', (data) => {
    setDownloads(prev => prev.map(d => 
      d.id === data.id 
        ? {
            ...d,
            status: data.status,
            path: data.path,
            checksum: data.checksum,
            safety: data.safety ?? d.safety,
            progress: data.progress ?? d.progress,
            receivedBytes: data.receivedBytes ?? d.receivedBytes,
            totalBytes: data.totalBytes ?? d.totalBytes,
          }
        : d
    ));
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleOpenFile = async (path: string) => {
    try {
      await ipc.downloads.openFile(path);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

  const handleShowInFolder = async (path: string) => {
    try {
      await ipc.downloads.showInFolder(path);
    } catch (error) {
      console.error('Failed to show in folder:', error);
    }
  };

  const handleRemove = (id: string) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  };

  const handlePause = async (id: string) => {
    try {
      await ipc.downloads.pause(id);
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await ipc.downloads.resume(id);
    } catch (error) {
      console.error('Failed to resume download:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await ipc.downloads.cancel(id);
    } catch (error) {
      console.error('Failed to cancel download:', error);
    }
  };

  const handleCopyChecksum = async (checksum?: string) => {
    if (!checksum) return;
    try {
      await navigator.clipboard.writeText(checksum);
    } catch (error) {
      console.error('Failed to copy checksum:', error);
    }
  };

  const formatEta = (etaSeconds?: number) => {
    if (etaSeconds === undefined) return '';
    if (!Number.isFinite(etaSeconds) || etaSeconds < 0) return '';
    if (etaSeconds < 60) return `${Math.max(1, Math.round(etaSeconds))}s`; 
    const minutes = Math.floor(etaSeconds / 60);
    const seconds = Math.max(0, Math.round(etaSeconds % 60));
    return `${minutes}m ${seconds}s`;
  };

  const formatSpeed = (bytesPerSecond?: number) => {
    if (!bytesPerSecond || !Number.isFinite(bytesPerSecond)) return '';
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  const isPreviewable = (download: DownloadItem) => {
    if (!download?.path || download.status !== 'completed') return false;
    return Boolean(getMediaKind(download.filename || download.path));
  };

  const completed = downloads.filter(d => d.status === 'completed').length;
  const active = downloads.filter(d => d.status === 'downloading' || d.status === 'pending' || d.status === 'in-progress').length;
  const failed = downloads.filter(d => d.status === 'failed' || d.status === 'blocked').length;

  return (
    <div className="h-full flex flex-col bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <Download className="text-blue-400" size={20} />
          <h3 className="font-semibold text-gray-200">Downloads</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className={`${active > 0 ? 'text-blue-400' : ''}`}>{active} active</span>
          <span className={`${completed > 0 ? 'text-green-400' : ''}`}>{completed} completed</span>
          {failed > 0 && <span className="text-red-400">{failed} failed</span>}
        </div>
      </div>

      {/* Downloads List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {downloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
              <Download size={48} className="mb-4 opacity-30" />
              <p className="text-sm">No downloads yet</p>
            </div>
          ) : (
            downloads.map((download) => (
              <motion.div
                key={download.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`border-b border-gray-800/50 p-3 hover:bg-gray-800/30 transition-colors ${
                  selectedId === download.id ? 'bg-gray-800/50' : ''
                }`}
                onClick={() => setSelectedId(selectedId === download.id ? null : download.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {download.status === 'completed' && (
                      <CheckCircle2 size={18} className="text-green-400" />
                    )}
                    {download.status === 'failed' && (
                      <XCircle size={18} className="text-red-400" />
                    )}
                    {download.status === 'cancelled' && (
                      <XCircle size={18} className="text-gray-500" />
                    )}
                    {download.status === 'blocked' && (
                      <XCircle size={18} className="text-red-500" />
                    )}
                    {download.status === 'in-progress' && (
                      <Loader2 size={18} className="text-amber-400" />
                    )}
                    {(download.status === 'downloading' || download.status === 'pending') && (
                      <Loader2 size={18} className="text-blue-400 animate-spin" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-200 truncate" title={download.filename}>
                        {download.filename}
                      </p>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            download.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : download.status === 'failed' || download.status === 'blocked'
                              ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                              : download.status === 'in-progress'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {download.status.replace('-', ' ')}
                        </span>
                        {download.safety && (
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                              download.safety.status === 'clean'
                                ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                                : download.safety.status === 'warning'
                                ? 'border-amber-500/30 text-amber-200 bg-amber-500/10'
                                : download.safety.status === 'blocked'
                                ? 'border-red-500/30 text-red-300 bg-red-500/10'
                                : 'border-slate-500/30 text-slate-200 bg-slate-500/10'
                            }`}
                            title={download.safety.details || undefined}
                          >
                            {download.safety.status}
                          </span>
                        )}
                        {download.checksum && download.status === 'completed' && (
                          <div className="flex-shrink-0" title="Checksum verified">
                            <ShieldCheck size={14} className="text-green-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-2" title={download.url}>
                      {download.url}
                    </p>

                    {/* Progress Bar */}
                    {download.status === 'downloading' && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>
                            {download.receivedBytes && download.totalBytes
                              ? `${formatBytes(download.receivedBytes)} / ${formatBytes(download.totalBytes)}`
                              : download.receivedBytes
                              ? formatBytes(download.receivedBytes)
                              : 'Downloading...'}
                          </span>
                          <span>{download.progress ? `${Math.round(download.progress * 100)}%` : ''}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(download.progress || 0) * 100}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}

                    {(download.status === 'downloading' || download.status === 'in-progress') && (
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 mb-2">
                        {formatSpeed(download.speedBytesPerSec) && (
                          <span>Speed: {formatSpeed(download.speedBytesPerSec)}</span>
                        )}
                        {formatEta(download.etaSeconds) && <span>ETA: {formatEta(download.etaSeconds)}</span>}
                        {download.totalBytes && download.receivedBytes !== undefined && download.totalBytes > 0 && (
                          <span>
                            Remaining: {formatBytes(Math.max(download.totalBytes - (download.receivedBytes || 0), 0))}
                          </span>
                        )}
                      </div>
                    )}

                    {download.status === 'blocked' && download.safety?.quarantinePath && (
                      <div className="text-xs text-red-300 mb-2">
                        File quarantined to {download.safety.quarantinePath}
                      </div>
                    )}

                    {download.safety && selectedId === download.id && (
                      <div className="mt-2 space-y-1 text-xs text-gray-400">
                        {download.safety.details && <p>{download.safety.details}</p>}
                        {download.safety.recommendations && download.safety.recommendations.length > 0 && (
                          <ul className="list-disc list-inside space-y-0.5">
                            {download.safety.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {selectedId === download.id && download.status === 'completed' && download.path && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800/50"
                      >
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFile(download.path!);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-400 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Open
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowInFolder(download.path!);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-gray-700/40 hover:bg-gray-700/60 border border-gray-600/30 rounded text-gray-300 transition-colors"
                        >
                          <FolderOpen size={12} />
                          Show in Folder
                        </motion.button>
                        {download.checksum && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyChecksum(download.checksum);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded text-emerald-300 transition-colors"
                          >
                            Copy checksum
                          </motion.button>
                        )}
                        {isPreviewable(download) && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(download);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-purple-300 transition-colors"
                          >
                            <PlayCircle size={12} />
                            Preview
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(download.id);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                          Remove
                        </motion.button>
                      </motion.div>
                    )}

                    {selectedId === download.id && (download.status === 'downloading' || download.status === 'in-progress') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-800/50"
                      >
                        {download.status === 'downloading' ? (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePause(download.id);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded text-amber-200 transition-colors"
                          >
                            Pause
                          </motion.button>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResume(download.id);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-blue-200 transition-colors"
                          >
                            Resume
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(download.id);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-red-400 transition-colors"
                        >
                          Cancel
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
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

