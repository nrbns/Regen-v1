// Real-time Markdown Memory Watcher for Regen Browser
// Watches the ./memory directory and emits events to the event bus and WebSocket

const chokidar = require('chokidar');
const path = require('path');
const { _EventEmitter } = require('events');

// Central event bus (singleton)
const eventBus = require('./eventBus'); // You may need to create this if not present

// --- Real-time UI/AI/Automation bridge ---
// Broadcast memory events to all connected WebSocket clients
const { sendToClient: _sendToClient } = require('./services/realtime/websocket-server');

const MEMORY_DIR = path.resolve(__dirname, '../memory');

// Watch for changes in the memory directory (markdown files)
const watcher = chokidar.watch(MEMORY_DIR, {
  persistent: true,
  ignoreInitial: true,
  depth: 2,
  awaitWriteFinish: true,
});

watcher.on('change', filePath => {
  const relPath = path.relative(MEMORY_DIR, filePath);
  eventBus.emit('memory:changed', { path: relPath, absPath: filePath });
  // Optionally, broadcast to UI via WebSocket/Socket.IO here
  // sendToClient({ type: 'memory:update', path: relPath });
  console.log(`[MemoryWatcher] File changed: ${relPath}`);
});

watcher.on('add', filePath => {
  const relPath = path.relative(MEMORY_DIR, filePath);
  eventBus.emit('memory:added', { path: relPath, absPath: filePath });
  console.log(`[MemoryWatcher] File added: ${relPath}`);
});

watcher.on('unlink', filePath => {
  const relPath = path.relative(MEMORY_DIR, filePath);
  eventBus.emit('memory:removed', { path: relPath, absPath: filePath });
  console.log(`[MemoryWatcher] File removed: ${relPath}`);
});

// Listen for memory events and broadcast to all clients
['memory:changed', 'memory:added', 'memory:removed'].forEach(evt => {
  eventBus.on(evt, payload => {
    // Broadcast to all connected clients (broadcast, not per-client)
    // You may want to filter or target by session/user if needed
    // Here, we use a synthetic event type for the UI
    const message = {
      type: 'memory:update',
      event: evt,
      ...payload,
      timestamp: Date.now(),
    };
    // sendToClient can be adapted to broadcast to all clients
    // For now, iterate all wsClients and send
    try {
      const wsModule = require('./services/realtime/websocket-server');
      if (wsModule && wsModule.wsClients) {
        for (const [clientId, client] of wsModule.wsClients.entries()) {
          const _clientId = clientId;
          if (client.ws && client.ws.readyState === 1) {
            client.ws.send(JSON.stringify(message));
          }
        }
      }
    } catch (err) {
      console.error('[MemoryWatcher] Failed to broadcast memory event:', err);
    }
  });
});

// --- Real-time incremental search indexing ---
// On memory file change, re-index only the changed file
const { getRAGPipeline } = require('./search-engine/rag-pipeline.cjs');
const fs = require('fs');

function indexMemoryFile(relPath, absPath) {
  if (!relPath.endsWith('.md')) return;
  try {
    const pipeline = getRAGPipeline();
    const url = `memory://${relPath}`;
    const content = fs.readFileSync(absPath, 'utf-8');
    pipeline.indexDocument(url, content, { source: 'memory', relPath });
    console.log(`[MemoryWatcher] Incrementally indexed: ${relPath}`);
  } catch (err) {
    console.error('[MemoryWatcher] Indexing error:', err);
  }
}

eventBus.on('memory:changed', ({ path, absPath }) => {
  indexMemoryFile(path, absPath);
});

// --- Real-time automation: n8n workflow trigger ---
const { triggerN8nWorkflow } = require('./n8n-client.ts');

eventBus.on('memory:changed', ({ path, absPath }) => {
  // Example: trigger n8n workflow for summarization or backup
  triggerN8nWorkflow('memory-changed', { path, absPath })
    .then(result => {
      console.log('[MemoryWatcher] n8n workflow triggered:', result);
    })
    .catch(err => {
      console.error('[MemoryWatcher] n8n workflow error:', err);
    });
});

console.log(`[MemoryWatcher] Watching memory directory: ${MEMORY_DIR}`);
