/**
 * Real-time IPC Event System
 * Typed event listeners for live updates from main process
 */
// Event bus for renderer-side state management
class IPCEventBus {
    listeners = new Map();
    ipcListeners = new Map(); // Use WeakSet to track IPC listeners
    customEventHandlers = new Map(); // Use WeakMap for custom handlers
    registeredChannels = new Set(); // Track which IPC channels we've registered globally
    ipcHandlers = new Map(); // Store IPC handlers in a Map instead of on window.ipc
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        // Subscribe to IPC channel if window.ipc exists (only once per event channel)
        if (window.ipc && window.ipc.on) {
            if (!this.ipcListeners.has(event)) {
                this.ipcListeners.set(event, new WeakSet());
            }
            const ipcCallbacks = this.ipcListeners.get(event);
            // Only register the channel once globally, not per callback
            if (!this.registeredChannels.has(event)) {
                this.registeredChannels.add(event);
                const globalHandler = (_event, data) => {
                    // Emit to all listeners for this event
                    const callbacks = this.listeners.get(event);
                    if (callbacks) {
                        const eventData = data || _event;
                        callbacks.forEach(cb => {
                            try {
                                cb(eventData);
                            }
                            catch (error) {
                                console.error(`Error in IPC event handler for ${event}:`, error);
                            }
                        });
                    }
                };
                window.ipc.on(event, globalHandler);
                // Store the handler in our Map instead of on window.ipc
                this.ipcHandlers.set(event, globalHandler);
            }
            // Track this callback (using WeakSet, so it's automatically cleaned up)
            ipcCallbacks.add(callback);
        }
        // Also listen for custom events (only once per callback)
        if (!this.customEventHandlers.has(event)) {
            this.customEventHandlers.set(event, new WeakMap());
        }
        const customHandlers = this.customEventHandlers.get(event);
        if (!customHandlers.has(callback)) {
            const handler = (e) => {
                try {
                    callback(e.detail);
                }
                catch (error) {
                    console.error(`Error in custom event handler for ${event}:`, error);
                }
            };
            customHandlers.set(callback, handler);
            window.addEventListener(event, handler);
        }
        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
            // Remove custom event listener
            const customHandlers = this.customEventHandlers.get(event);
            if (customHandlers?.has(callback)) {
                const handler = customHandlers.get(callback);
                if (handler) {
                    window.removeEventListener(event, handler);
                }
            }
        };
    }
    emit(event, data) {
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
        // Note: IPC listeners are managed globally, not per-callback
        // They will be cleaned up when the channel is no longer needed
    }
    // Cleanup all listeners for an event (call when component unmounts or event is no longer needed)
    removeAllListeners(event) {
        this.listeners.delete(event);
        this.ipcListeners.delete(event);
        this.customEventHandlers.delete(event);
        this.registeredChannels.delete(event);
        // Remove global IPC handler if it exists
        if (window.ipc && window.ipc.removeListener) {
            const handler = this.ipcHandlers.get(event);
            if (handler) {
                window.ipc.removeListener(event, handler);
                this.ipcHandlers.delete(event);
            }
        }
    }
}
export const ipcEvents = new IPCEventBus();
// Subscribe to typed IPC channels
if (typeof window !== 'undefined') {
    // Listen for tab updates
    if (window.ipc && window.ipc.on) {
        const tabUpdateHandler = (_event, tabs) => {
            // Handle both direct data and event+data formats
            const tabList = Array.isArray(tabs) ? tabs : Array.isArray(_event) ? _event : [];
            ipcEvents.emit('tabs:updated', tabList);
        };
        const tabProgressHandler = (_event, data) => {
            const progressData = data || _event;
            ipcEvents.emit('tabs:progress', progressData);
        };
        const navigationStateHandler = (_event, data) => {
            const navData = data || _event;
            ipcEvents.emit('tabs:navigation-state', navData);
        };
        // Listen to both legacy and typed IPC channels
        window.ipc.on('tabs:updated', tabUpdateHandler);
        window.ipc.on('ob://ipc/v1/tabs:updated', tabUpdateHandler);
        window.ipc.on('tabs:progress', tabProgressHandler);
        window.ipc.on('ob://ipc/v1/tabs:progress', tabProgressHandler);
        window.ipc.on('tabs:navigation-state', navigationStateHandler);
        window.ipc.on('ob://ipc/v1/tabs:navigation-state', navigationStateHandler);
        // Proper cleanup using Page Lifecycle API instead of unload
        const cleanup = () => {
            if (window.ipc && window.ipc.removeListener) {
                window.ipc.removeListener('tabs:updated', tabUpdateHandler);
                window.ipc.removeListener('ob://ipc/v1/tabs:updated', tabUpdateHandler);
                window.ipc.removeListener('tabs:progress', tabProgressHandler);
                window.ipc.removeListener('ob://ipc/v1/tabs:progress', tabProgressHandler);
                window.ipc.removeListener('tabs:navigation-state', navigationStateHandler);
                window.ipc.removeListener('ob://ipc/v1/tabs:navigation-state', navigationStateHandler);
            }
        };
        // Use pagehide event (modern alternative to unload)
        if ('onpagehide' in window) {
            window.addEventListener('pagehide', cleanup);
        }
        // Fallback for browsers that don't support pagehide
        if (typeof document !== 'undefined' && 'visibilityState' in document) {
            const handleVisibilityChange = () => {
                if (document.visibilityState === 'hidden') {
                    // Don't cleanup on visibility change, only on actual page unload
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }
    }
    // Listen for shields counters
    window.addEventListener('shields:counters', ((e) => {
        ipcEvents.emit('shields:counters', e.detail);
    }));
    // Listen for network status
    window.addEventListener('net:status', ((e) => {
        ipcEvents.emit('net:status', e.detail);
    }));
    // Listen for downloads
    window.addEventListener('downloads:started', ((e) => {
        ipcEvents.emit('downloads:started', e.detail);
    }));
    window.addEventListener('downloads:progress', ((e) => {
        ipcEvents.emit('downloads:progress', e.detail);
    }));
    window.addEventListener('downloads:done', ((e) => {
        ipcEvents.emit('downloads:done', e.detail);
    }));
    // Listen for agent events
    window.addEventListener('agent:plan', ((e) => {
        ipcEvents.emit('agent:plan', e.detail);
    }));
    window.addEventListener('agent:step', ((e) => {
        ipcEvents.emit('agent:step', e.detail);
    }));
    window.addEventListener('agent:log', ((e) => {
        ipcEvents.emit('agent:log', e.detail);
    }));
    window.addEventListener('agent:consent:request', ((e) => {
        ipcEvents.emit('agent:consent:request', e.detail);
    }));
    // Listen for streaming AI events via IPC
    if (window.ipc && window.ipc.on) {
        window.ipc.on('agent:stream:chunk', (_event, data) => {
            ipcEvents.emit('agent:stream:chunk', data);
        });
        window.ipc.on('agent:stream:done', (_event, data) => {
            ipcEvents.emit('agent:stream:done', data);
        });
        window.ipc.on('agent:stream:error', (_event, data) => {
            ipcEvents.emit('agent:stream:error', data);
        });
    }
    // Listen for permission requests
    window.addEventListener('permissions:request', ((e) => {
        ipcEvents.emit('permissions:request', e.detail);
    }));
    // Listen for fullscreen changes
    window.addEventListener('app:fullscreen-changed', ((e) => {
        ipcEvents.emit('app:fullscreen-changed', e.detail);
    }));
    window.addEventListener('games:sandbox:warning', ((e) => {
        ipcEvents.emit('games:sandbox:warning', e.detail);
    }));
    // Also listen via IPC if available
    if (window.ipc && window.ipc.on) {
        const fullscreenHandler = (data) => {
            ipcEvents.emit('app:fullscreen-changed', data);
        };
        window.ipc.on('app:fullscreen-changed', fullscreenHandler);
        const sandboxWarningHandler = (_event, data) => {
            ipcEvents.emit('games:sandbox:warning', data);
        };
        window.ipc.on('games:sandbox:warning', sandboxWarningHandler);
        // Cleanup handler for fullscreen events
        const cleanupFullscreen = () => {
            if (window.ipc && window.ipc.removeListener) {
                window.ipc.removeListener('app:fullscreen-changed', fullscreenHandler);
                window.ipc.removeListener('games:sandbox:warning', sandboxWarningHandler);
            }
        };
        // Use pagehide for cleanup (modern alternative to unload)
        if ('onpagehide' in window) {
            window.addEventListener('pagehide', cleanupFullscreen, { once: true });
        }
    }
}
// React hooks for easy component integration
// Note: This hook must be imported and used in React components
// The actual hook implementation is in a separate file to avoid require() in browser
