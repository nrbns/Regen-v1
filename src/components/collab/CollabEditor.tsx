/**
 * Real-Time Collaborative Research Editor
 * Multi-user editing with Yjs
 */

import { useEffect, useRef, useState } from 'react';
import { Users, Share2 } from 'lucide-react';

interface CollabState {
  connected: boolean;
  roomId: string;
  content: string;
  users: number;
}

export function CollabEditor({ roomId = 'default' }: { roomId?: string }) {
  const [state, setState] = useState<CollabState>({
    connected: false,
    roomId,
    content: '',
    users: 1,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wsUrl = (() => {
    const baseUrl = import.meta.env.VITE_WS_URL || 'localhost:4000';
    const protocol =
      typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const cleanUrl = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    return `${protocol}${cleanUrl}`;
  })();
  const collabWsUrl = `${wsUrl}/ws/collab?room=${roomId}`;

  useEffect(() => {
    // Connect to collaborative WebSocket
    const ws = new WebSocket(collabWsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[CollabEditor] Connected to room:', roomId);
      setState(prev => ({ ...prev, connected: true }));
    };

    ws.onmessage = event => {
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
      } catch (error) {
        console.error('[CollabEditor] Message parse error:', error);
      }
    };

    ws.onerror = error => {
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setState(prev => ({ ...prev, content: newContent }));

    // Send update to server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: newContent,
        })
      );
    }
  };

  const shareRoom = () => {
    const url = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(url);
    alert(`Room URL copied: ${url}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Collaborative Research</span>
          {state.connected && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <span className="text-xs text-gray-500">Connected</span>
            </div>
          )}
        </div>

        <button
          onClick={shareRoom}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          <Share2 size={14} />
          Share Room
        </button>
      </div>

      {/* Editor */}
      <textarea
        ref={textareaRef}
        id="collab-editor"
        name="collab-editor"
        value={state.content}
        onChange={handleTextChange}
        placeholder="Start typing... Multiple people can edit this document in real-time."
        className="flex-1 resize-none border-0 p-4 text-base leading-relaxed focus:outline-none"
        style={{ fontFamily: 'monospace', fontSize: '18px' }}
      />

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
        Room: {roomId} • {state.users} user{state.users !== 1 ? 's' : ''} online
      </div>
    </div>
  );
}
