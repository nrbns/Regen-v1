import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, ExternalLink, Loader2 } from 'lucide-react';
function formatRelativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return '';
    const deltaMs = Date.now() - date.getTime();
    const deltaMinutes = Math.round(deltaMs / 60000);
    if (deltaMinutes < 1)
        return 'just now';
    if (deltaMinutes < 60)
        return `${deltaMinutes}m ago`;
    const deltaHours = Math.round(deltaMinutes / 60);
    if (deltaHours < 24)
        return `${deltaHours}h ago`;
    const deltaDays = Math.round(deltaHours / 24);
    return `${deltaDays}d ago`;
}
const MAX_NOTIFICATIONS = 50;
export function NotificationsMenu() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const itemRefs = useRef([]);
    const eventSourceRef = useRef(null);
    const unreadLabel = useMemo(() => (unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'), [unreadCount]);
    const closeMenu = useCallback(() => {
        setOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
    }, []);
    const fetchNotifications = useCallback(async () => {
        try {
            // Check if we're in Electron - notifications API may not be available
            const isElectron = typeof window !== 'undefined' && window.ipc;
            if (!isElectron) {
                // In web mode, try to fetch from API
                const res = await fetch('/api/notifications?limit=10');
                if (!res.ok) {
                    // API not available - silently fail
                    setLoading(false);
                    return;
                }
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    // Server returned HTML instead of JSON (likely 404 page)
                    setLoading(false);
                    return;
                }
                const data = (await res.json());
                setItems(data.notifications ?? []);
                setUnreadCount(data.unreadCount ?? 0);
            }
            else {
                // In Electron, notifications API is not implemented yet
                setItems([]);
                setUnreadCount(0);
            }
        }
        catch (error) {
            // Silently fail - notifications are optional
            if (process.env.NODE_ENV === 'development') {
                console.debug('[NotificationsMenu] Notifications API not available:', error);
            }
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);
    useEffect(() => {
        // Only set up EventSource if not in Electron (where notifications API may not be available)
        const isElectron = typeof window !== 'undefined' && window.ipc;
        if (isElectron) {
            // Notifications SSE not available in Electron yet
            return;
        }
        try {
            const source = new EventSource('/ws/notifications');
            eventSourceRef.current = source;
            source.addEventListener('notification', event => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload?.payload) {
                        setItems(prev => [payload.payload, ...prev].slice(0, MAX_NOTIFICATIONS));
                        setUnreadCount(count => count + 1);
                    }
                }
                catch (error) {
                    if (process.env.NODE_ENV === 'development') {
                        console.debug('[NotificationsMenu] Failed to parse SSE payload', error);
                    }
                }
            });
            source.onerror = () => {
                // Silently close on error - notifications are optional
                source.close();
                eventSourceRef.current = null;
            };
            return () => {
                source.close();
                eventSourceRef.current = null;
            };
        }
        catch (error) {
            // Silently fail - EventSource may not be available
            if (process.env.NODE_ENV === 'development') {
                console.debug('[NotificationsMenu] EventSource not available:', error);
            }
        }
    }, []);
    useEffect(() => {
        function handlePointer(event) {
            if (!open)
                return;
            const target = event.target;
            if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
                closeMenu();
            }
        }
        window.addEventListener('pointerdown', handlePointer);
        return () => window.removeEventListener('pointerdown', handlePointer);
    }, [closeMenu, open]);
    useEffect(() => {
        if (!open)
            return;
        function handleKey(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
                return;
            }
            if (!items.length)
                return;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setFocusedIndex(index => Math.min(items.length - 1, index + 1));
            }
            else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setFocusedIndex(index => Math.max(0, index - 1));
            }
            else if (event.key.toLowerCase() === 'm' && focusedIndex >= 0) {
                event.preventDefault();
                void markAsRead(items[focusedIndex].id);
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [closeMenu, focusedIndex, items, open]);
    useEffect(() => {
        if (focusedIndex < 0)
            return;
        const ref = itemRefs.current[focusedIndex];
        ref?.focus();
    }, [focusedIndex]);
    const markAsRead = useCallback(async (id) => {
        try {
            const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
            if (!res.ok)
                throw new Error(`Failed to mark notification as read (${res.status})`);
            setItems(prev => prev.map(item => (item.id === id ? { ...item, read: true } : item)));
            setUnreadCount(count => Math.max(0, count - 1));
        }
        catch (error) {
            console.error('[NotificationsMenu] Failed to mark notification as read', error);
        }
    }, []);
    const markAllRead = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
            if (!res.ok)
                throw new Error('Failed to mark all notifications as read');
            setItems(prev => prev.map(item => ({ ...item, read: true })));
            setUnreadCount(0);
        }
        catch (error) {
            console.error('[NotificationsMenu] Failed to mark all read', error);
        }
    }, []);
    const openNotification = useCallback(async (item) => {
        if (item.url) {
            window.open(item.url, '_blank', 'noopener,noreferrer');
        }
        if (!item.read) {
            await markAsRead(item.id);
        }
    }, [markAsRead]);
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { ref: triggerRef, type: "button", "aria-label": "Notifications", "aria-haspopup": "menu", "aria-expanded": open, className: "relative rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]", onClick: () => {
                    setOpen(value => !value);
                    if (!open) {
                        setFocusedIndex(items.length ? 0 : -1);
                    }
                }, children: [_jsx(Bell, { className: "h-5 w-5", "aria-hidden": true }), unreadCount > 0 && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary-500)] px-1 text-[0.65rem] font-semibold text-white", "aria-live": "polite", children: unreadCount > 99 ? '99+' : unreadCount })), _jsx("span", { className: "sr-only", children: unreadLabel })] }), open && (_jsxs("div", { ref: panelRef, role: "menu", "aria-label": "Notifications", className: "absolute right-0 z-50 mt-3 w-[360px] max-w-[90vw] rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-panel)] shadow-2xl focus-visible:outline-none", tabIndex: -1, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-[var(--text-primary)]", children: "Notifications" }), _jsx("p", { className: "text-xs text-[var(--text-muted)]", children: unreadLabel })] }), _jsx("button", { type: "button", className: "text-xs font-medium text-[var(--color-primary-500)] hover:text-[var(--color-primary-400)]", onClick: () => void markAllRead(), children: "Mark all as read" })] }), _jsxs("div", { className: "max-h-[360px] overflow-y-auto px-2 py-2", "aria-live": "polite", children: [loading && (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Loading notifications\u2026"] })), !loading && items.length === 0 && (_jsx("div", { className: "py-8 text-center text-sm text-[var(--text-muted)]", children: "You\u2019re all caught up." })), items.map((item, index) => {
                                const tags = Array.isArray(item.meta?.tags) ? item.meta?.tags : null;
                                return (_jsxs("div", { ref: node => {
                                        itemRefs.current[index] = node;
                                    }, role: "menuitem", tabIndex: 0, className: `group flex cursor-pointer gap-3 rounded-xl px-3 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-2 ${item.read
                                        ? 'bg-transparent hover:bg-[var(--surface-hover)]'
                                        : 'bg-[var(--surface-elevated)]'}`, onClick: () => void openNotification(item), onKeyDown: event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            void openNotification(item);
                                        }
                                        else if (event.key.toLowerCase() === 'm') {
                                            event.preventDefault();
                                            void markAsRead(item.id);
                                        }
                                    }, children: [_jsx("div", { className: "mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-semibold uppercase text-[var(--color-primary-400)]", children: item.type.slice(0, 2) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: `truncate text-sm font-semibold ${item.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`, children: item.title }), _jsx("span", { className: "text-xs text-[var(--text-muted)]", children: formatRelativeTime(item.timestamp) })] }), item.body && (_jsx("p", { className: "mt-1 line-clamp-2 text-xs text-[var(--text-muted)]", "aria-live": "polite", children: item.body })), tags && (_jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: tags.map(tag => (_jsx("span", { className: "rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]", children: tag }, tag))) }))] }), _jsxs("div", { className: "flex flex-col items-center gap-2", children: [item.url && (_jsx("button", { type: "button", "aria-label": "Open notification", className: "rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]", onClick: event => {
                                                        event.stopPropagation();
                                                        void openNotification(item);
                                                    }, children: _jsx(ExternalLink, { className: "h-4 w-4" }) })), !item.read && (_jsx("button", { type: "button", "aria-label": "Mark as read", className: "rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]", onClick: event => {
                                                        event.stopPropagation();
                                                        void markAsRead(item.id);
                                                    }, children: _jsx(Check, { className: "h-4 w-4" }) }))] })] }, item.id));
                            })] })] }))] }));
}
