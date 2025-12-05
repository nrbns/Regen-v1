import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Real-Time Collaborative Research Editor
 * Multi-user editing with Yjs
 */
import { useEffect, useRef, useState } from 'react';
import { Users, Share2 } from 'lucide-react';
export function CollabEditor({ roomId = 'default' }) {
    const [state, setState] = useState({
        connected: false,
        roomId,
        content: '',
        users: 1,
    });
    const wsRef = useRef(null);
    const textareaRef = useRef(null);
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
    const collabWsUrl = `${wsUrl}/ws/collab?room=${roomId}`;
    useEffect(() => {
        // Connect to collaborative WebSocket
        const ws = new WebSocket(collabWsUrl);
        wsRef.current = ws;
        ws.onopen = () => {
            console.log('[CollabEditor] Connected to room:', roomId);
            setState(prev => ({ ...prev, connected: true }));
        };
        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                switch (msg.type) {
                    case 'init':
                        setState(prev => ({
                            ...prev,
                            content: msg.content || '',
                            roomId: msg.roomId,
                        }));
                        if (textareaRef.current) {
                            textareaRef.current.value = msg.content || '';
                        }
                        break;
                    case 'update':
                        setState(prev => ({
                            ...prev,
                            content: msg.content || '',
                        }));
                        if (textareaRef.current && textareaRef.current.value !== msg.content) {
                            textareaRef.current.value = msg.content || '';
                        }
                        break;
                    case 'yjs-update':
                        // In full implementation, would apply Yjs update
                        console.log('[CollabEditor] Yjs update received');
                        break;
                }
            }
            catch (error) {
                console.error('[CollabEditor] Message parse error:', error);
            }
        };
        ws.onerror = (error) => {
            console.error('[CollabEditor] WebSocket error:', error);
            setState(prev => ({ ...prev, connected: false }));
        };
        ws.onclose = () => {
            console.log('[CollabEditor] WebSocket closed');
            setState(prev => ({ ...prev, connected: false }));
        };
        return () => {
            ws.close();
        };
    }, [roomId, collabWsUrl]);
    const handleTextChange = (e) => {
        const newContent = e.target.value;
        setState(prev => ({ ...prev, content: newContent }));
        // Send update to server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'text',
                text: newContent,
            }));
        }
    };
    const shareRoom = () => {
        const url = `${window.location.origin}?room=${roomId}`;
        navigator.clipboard.writeText(url);
        alert(`Room URL copied: ${url}`);
    };
    return (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { size: 18, className: "text-gray-600" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Collaborative Research" }), state.connected && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "h-2 w-2 animate-pulse rounded-full bg-green-500" }), _jsx("span", { className: "text-xs text-gray-500", children: "Connected" })] }))] }), _jsxs("button", { onClick: shareRoom, className: "flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100", children: [_jsx(Share2, { size: 14 }), "Share Room"] })] }), _jsx("textarea", { ref: textareaRef, value: state.content, onChange: handleTextChange, placeholder: "Start typing... Multiple people can edit this document in real-time.", className: "flex-1 resize-none border-0 p-4 text-base leading-relaxed focus:outline-none", style: { fontFamily: 'monospace', fontSize: '18px' } }), _jsxs("div", { className: "border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500", children: ["Room: ", roomId, " \u2022 ", state.users, " user", state.users !== 1 ? 's' : '', " online"] })] }));
}
