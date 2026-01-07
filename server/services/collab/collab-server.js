/* eslint-env node */
/**
 * Real-Time Collaborative Research
 * Yjs + WebSocket for multi-user editing
 * Converted from Python production code
 *
 * Note: Full Yjs integration requires yjs package
 * For now, using simplified collaborative editing
 */

import { WebSocketServer } from 'ws';

// Yjs is optional - use simplified version if not available
let Y = null;
try {
  Y = await import('yjs');
} catch {
  console.warn('[CollabServer] Yjs not available, using simplified mode');
}

// Note: For full Yjs integration, you'd need y-websocket
// For now, we'll implement a simplified version

const rooms = new Map(); // roomId -> { doc: Y.Doc | null, content: string, clients: Set }

/**
 * Create collaborative WebSocket server
 */
export function createCollabWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/collab',
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('room') || 'default';

    console.log(`[CollabWS] Client joined room: ${roomId}`);

    // Get or create room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        doc: Y ? new Y.Doc() : null,
        content: '',
        clients: new Set(),
      });
    }

    const room = rooms.get(roomId);
    room.clients.add(ws);

    const ydoc = room.doc;
    const ytext = Y && ydoc ? ydoc.getText('research') : null;

    // Send current state
    ws.send(
      JSON.stringify({
        type: 'init',
        roomId,
        content: ytext ? ytext.toString() : room.content,
      })
    );

    // Handle updates from client
    ws.on('message', data => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'update':
            // Apply Yjs update
            if (Y && ydoc && message.update) {
              Y.applyUpdate(ydoc, Buffer.from(message.update, 'base64'));
            }
            break;

          case 'text':
            // Simple text update (works with or without Yjs)
            if (Y && ytext) {
              ytext.delete(0, ytext.length);
              ytext.insert(0, message.text);
            } else {
              // Simplified mode: just store content
              room.content = message.text;
            }
            break;

          case 'delta':
            // Delta update (insert/delete)
            if (Y && ytext) {
              if (message.delete) {
                ytext.delete(message.index, message.delete);
              }
              if (message.insert) {
                ytext.insert(message.index, message.insert);
              }
            }
            break;
        }

        // Broadcast to all clients in room
        const currentContent = ytext ? ytext.toString() : room.content;
        broadcastToRoom(
          roomId,
          {
            type: 'update',
            roomId,
            content: currentContent,
          },
          ws
        );
      } catch (error) {
        console.error('[CollabWS] Message error:', error);
        ws.send(
          JSON.stringify({
            type: 'error',
            message: error.message,
          })
        );
      }
    });

    // Listen to Yjs changes (if Yjs available)
    let updateHandler = null;
    if (Y && ydoc) {
      updateHandler = (update, origin) => {
        if (origin !== ws) {
          // Send update to this client
          ws.send(
            JSON.stringify({
              type: 'yjs-update',
              update: Buffer.from(update).toString('base64'),
            })
          );
        }
      };
      ydoc.on('update', updateHandler);
    }

    // Send awareness (cursor positions, etc.)
    const awareness = {
      clients: new Map(),
    };

    ws.on('close', () => {
      console.log(`[CollabWS] Client left room: ${roomId}`);
      if (Y && ydoc && updateHandler) {
        ydoc.off('update', updateHandler);
      }

      // Remove client from room
      if (room.clients) {
        room.clients.delete(ws);
      }

      // Cleanup awareness
      if (awareness && awareness.clients) {
        awareness.clients.delete(ws);
      }
      broadcastAwareness(roomId);
    });

    ws.on('error', error => {
      console.error('[CollabWS] WebSocket error:', error);
    });
  });

  return wss;
}

/**
 * Broadcast message to all clients in a room
 */
function broadcastToRoom(_roomId, message, _exclude = null) {
  // In a full implementation, you'd track all WebSocket connections per room
  // For now, this is a placeholder
  const _messageStr = JSON.stringify(message);
  // Would broadcast to all clients in room except exclude
}

/**
 * Broadcast awareness updates
 */
function broadcastAwareness(_roomId) {
  // Would broadcast cursor positions, selections, etc.
}

/**
 * Get room content
 */
export function getRoomContent(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  if (Y && room.doc) {
    const ytext = room.doc.getText('research');
    return ytext.toString();
  }

  return room.content || '';
}

/**
 * Create or join room
 */
export function joinRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      doc: Y ? new Y.Doc() : null,
      content: '',
      clients: new Set(),
    });
  }
  return rooms.get(roomId);
}
