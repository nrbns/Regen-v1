// server/distributed/agent-peer.js
// Distributed Agent Peer: enables multi-device, multi-node agent execution

const eventBus = require('../eventBus');
const WebSocket = require('ws');
const os = require('os');

// Peer registry (in-memory for demo; use Redis/DB for prod)
const peers = new Map();

// This peer's info
const peerId = `${os.hostname()}-${process.pid}`;
const peerInfo = {
  id: peerId,
  host: os.hostname(),
  pid: process.pid,
  startedAt: Date.now(),
  status: 'online',
};
peers.set(peerId, peerInfo);

// Connect to other peers (addresses from env or config)
const PEER_URLS = (process.env.AGENT_PEER_URLS || '').split(',').filter(Boolean);
const peerSockets = new Map();

for (const url of PEER_URLS) {
  const ws = new WebSocket(url);
  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'peer:hello', peer: peerInfo }));
    peerSockets.set(url, ws);
  });
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'peer:hello') {
        peers.set(data.peer.id, data.peer);
        eventBus.emit('peer:joined', data.peer);
      }
      if (data.type === 'agent:task') {
        // Forward distributed agent task to local event bus
        eventBus.emit('agent:task', data.task);
      }
    } catch {
      // Intentionally ignore malformed messages
    }
  });
  ws.on('close', () => {
    peerSockets.delete(url);
  });
}

// Broadcast agent tasks to all peers
function broadcastAgentTask(task) {
  for (const ws of peerSockets.values()) {
    ws.send(JSON.stringify({ type: 'agent:task', task }));
  }
}

eventBus.on('agent:task:broadcast', broadcastAgentTask);

eventBus.emit('peer:ready', peerInfo);

module.exports = {
  peerId,
  peerInfo,
  peers,
  broadcastAgentTask,
};
