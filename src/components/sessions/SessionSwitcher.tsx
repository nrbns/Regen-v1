/**
 * Session Switcher Component
 * UI for managing and switching between multiple browser sessions
 */

import { useState, useEffect, useRef } from 'react';
import { User, Plus, X, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';

interface BrowserSession {
  id: string;
  name: string;
  profileId: string;
  createdAt: number;
  tabCount: number;
  activeTabId?: string;
  color?: string;
}

export function SessionSwitcher() {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [activeSession, setActiveSession] = useState<BrowserSession | null>(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Track previous sessions to prevent unnecessary updates
  const previousSessionsRef = useRef<string>('');
  
  // Load sessions
  const loadSessions = async () => {
    try {
      // Wait for IPC to be ready
      if (!window.ipc || typeof window.ipc.invoke !== 'function') {
        setTimeout(loadSessions, 300);
        return; // Will retry shortly
      }
      
      const [allSessions, active] = await Promise.all([
        ipc.sessions.list(),
        ipc.sessions.getActive(),
      ]);
      
      // Only update if sessions actually changed
      let sessionsArray = Array.isArray(allSessions) ? allSessions as BrowserSession[] : [];

      // Ensure at least the default session exists
      if (sessionsArray.length === 0) {
        sessionsArray = [{
          id: 'default',
          name: 'Default',
          profileId: 'default',
          createdAt: Date.now(),
          tabCount: 0,
          color: '#3b82f6',
        }];
      }
      const sessionsKey = sessionsArray.map(s => s.id).sort().join(',');
      
      if (previousSessionsRef.current !== sessionsKey) {
        previousSessionsRef.current = sessionsKey;
        setSessions(sessionsArray);
      }
      
      // Update active session only if changed
      let activeSessionObj = active && typeof active === 'object' ? active as BrowserSession : null;
      if (!activeSessionObj) {
        activeSessionObj = sessionsArray.find(s => s.id === 'default') ?? sessionsArray[0] ?? null;
      }
      const currentActiveId = activeSessionObj?.id || null;
      const previousActiveId = activeSession?.id || null;
      
      if (currentActiveId !== previousActiveId) {
        setActiveSession(activeSessionObj);
      }
    } catch (error) {
      // Silently handle - will retry on next interval
      // Only log if it's a real error, not just IPC not ready
      if (process.env.NODE_ENV === 'development' && error instanceof Error && !error.message.includes('not available')) {
        console.warn('Failed to load sessions:', error);
      }
    }
  };

  useEffect(() => {
    // Delay initial load to allow IPC to initialize
    const timeoutId = setTimeout(() => {
      loadSessions();
    }, 500);
    
    // Refresh periodically (less frequent to reduce spam)
    const interval = setInterval(loadSessions, 5000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) return;
    
    try {
      await ipc.sessions.create({ name: newSessionName.trim() });
      setNewSessionName('');
      setCreating(false);
      await loadSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSwitchSession = async (sessionId: string) => {
    try {
      await ipc.sessions.setActive({ sessionId });
      await loadSessions();
      setOpen(false);
    } catch (error) {
      console.error('Failed to switch session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete session "${sessions.find(s => s.id === sessionId)?.name}"? This will close all tabs in this session.`)) {
      return;
    }
    
    try {
      await ipc.sessions.delete({ sessionId });
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleStartEdit = (session: BrowserSession) => {
    setEditingId(session.id);
    setEditName(session.name);
  };

  const handleSaveEdit = async (sessionId: string) => {
    try {
      await ipc.sessions.update({ sessionId, name: editName.trim() });
      setEditingId(null);
      await loadSessions();
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  return (
    <div className="relative">
      {/* Session Button */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700/50 text-gray-300 hover:text-gray-100 transition-all"
        title="Multi-Session Manager"
      >
        <User size={16} />
        <span className="text-sm font-medium">
          {activeSession?.name || 'Default'}
        </span>
        {activeSession?.color && (
          <div
            className="w-3 h-3 rounded-full border border-gray-700"
            style={{ backgroundColor: activeSession.color }}
          />
        )}
        {sessions.length > 1 && (
          <span className="text-xs text-gray-500">({sessions.length})</span>
        )}
      </motion.button>

      {/* Session Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-lg shadow-xl overflow-hidden z-40"
          >
            {/* Header */}
            <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-200">Browser Sessions</h3>
              <button
                onClick={() => {
                  setCreating(true);
                  setNewSessionName('');
                }}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-blue-400 transition-colors"
                title="New Session"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Sessions List */}
            <div className="max-h-96 overflow-y-auto">
              {creating && (
                <div className="p-3 border-b border-gray-800/50">
                  <input
                    type="text"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateSession();
                      if (e.key === 'Escape') {
                        setCreating(false);
                        setNewSessionName('');
                      }
                    }}
                    placeholder="Session name..."
                    autoFocus
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCreateSession}
                      className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false);
                        setNewSessionName('');
                      }}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {sessions.map((session) => {
                const isActive = activeSession?.id === session.id;
                const isEditing = editingId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => !isActive && handleSwitchSession(session.id)}
                    className={`
                      p-3 border-b border-gray-800/50 cursor-pointer transition-colors
                      ${isActive 
                        ? 'bg-blue-600/20 border-blue-500/30' 
                        : 'hover:bg-gray-800/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color Indicator */}
                      {session.color && (
                        <div
                          className="w-4 h-4 rounded-full border border-gray-700 flex-shrink-0"
                          style={{ backgroundColor: session.color }}
                        />
                      )}

                      {/* Session Info */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(session.id);
                                if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditName('');
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(session.id);
                              }}
                              className="p-1 text-green-400 hover:text-green-300"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200 truncate">
                              {session.name}
                            </span>
                            {isActive && (
                              <span className="text-xs text-blue-400 font-medium">Active</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {session.tabCount} tab{session.tabCount !== 1 ? 's' : ''}
                          </span>
                          {session.id === 'default' && (
                            <span className="text-xs text-gray-500">• Default</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(session);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-blue-400 transition-colors"
                            title="Rename"
                          >
                            <Edit2 size={14} />
                          </button>
                          {session.id !== 'default' && (
                            <button
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                              title="Delete"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-800/50 bg-gray-900/50">
              <p className="text-xs text-gray-500">
                Each session has isolated cookies, storage, and login state
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

