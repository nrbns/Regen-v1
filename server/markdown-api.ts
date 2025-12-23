import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import fetch from 'node-fetch';
import { triggerN8nWorkflow } from './n8n-client';
import { triggerPersonalLLMFineTune } from './llm-personal';

// --- CONFIG ---
const MEMORY_DIR = path.resolve(process.env.REGEN_MEMORY_DIR || './memory');
if (!fs.existsSync(MEMORY_DIR)) fs.mkdirSync(MEMORY_DIR, { recursive: true });

// --- EVENT BUS ---
export const eventBus = new EventEmitter();

// --- FILESYSTEM WATCHER ---
const watcher = chokidar.watch(MEMORY_DIR, { ignoreInitial: true });
watcher.on('all', (event, filePath) => {
  eventBus.emit('memory:change', { event, filePath });
});

// --- MARKDOWN MEMORY API ---
export function listMarkdownFiles() {
  return fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'));
}

export function readMarkdownFile(filename: string) {
  const file = path.join(MEMORY_DIR, filename);
  if (!fs.existsSync(file)) throw new Error('File not found');
  return fs.readFileSync(file, 'utf-8');
}

export function writeMarkdownFile(filename: string, content: string) {
  const file = path.join(MEMORY_DIR, filename);
  fs.writeFileSync(file, content, 'utf-8');
  eventBus.emit('memory:write', { filename });
}

// --- LLM CALL (LOCAL AI BRIDGE) ---
const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || 'http://127.0.0.1:4300/v1/chat';
const AI_BRIDGE_TOKEN = process.env.AI_BRIDGE_TOKEN || null;

export async function callLocalLLM(messages, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (AI_BRIDGE_TOKEN) headers['Authorization'] = `Bearer ${AI_BRIDGE_TOKEN}`;
  const res = await fetch(AI_BRIDGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages, ...opts }),
  });
  if (!res.ok) throw new Error('LLM call failed');
  return res.json();
}

// --- EXPRESS + WEBSOCKET BRIDGE ---
const app = express();
app.use(express.json());

app.get('/api/memory', (req, res) => {
  res.json(listMarkdownFiles());
});

app.get('/api/memory/:file', (req, res) => {
  try {
    res.send(readMarkdownFile(req.params.file));
  } catch {
    res.status(404).send('Not found');
  }
});

app.post('/api/memory/:file', (req, res) => {
  try {
    writeMarkdownFile(req.params.file, req.body.content || '');
    res.send('OK');
  } catch {
    res.status(500).send('Write failed');
  }
});

// --- LLM API ROUTE ---
app.post('/api/llm', async (req, res) => {
  try {
    const { messages, ...opts } = req.body;
    const result = await callLocalLLM(messages, opts);
    res.json(result);
  } catch {
    res.status(500).send('LLM error');
  }
});

// --- SEARCH: FULL-TEXT SEARCH OVER MARKDOWN MEMORY ---
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  if (!q) return res.json([]);
  const files = listMarkdownFiles();
  const results = files
    .map(f => {
      const content = readMarkdownFile(f);
      const idx = content.toLowerCase().indexOf(q);
      if (idx === -1) return null;
      // Return snippet around match
      const start = Math.max(0, idx - 40);
      const end = Math.min(content.length, idx + 40);
      return {
        file: f,
        match: content.substring(start, end),
        index: idx,
      };
    })
    .filter(Boolean);
  res.json(results);
});

// --- AUTOMATION: TRIGGER N8N ON MEMORY CHANGE ---
eventBus.on('memory:change', async ({ event, filePath }) => {
  try {
    await triggerN8nWorkflow('memory-change', { event, filePath });
  } catch (err) {
    console.warn('[n8n] Workflow trigger failed:', err?.message || err);
  }
});

// --- API: MANUAL N8N WORKFLOW TRIGGER ---
app.post('/api/automation', async (req, res) => {
  try {
    const { workflow, payload } = req.body;
    const result = await triggerN8nWorkflow(workflow, payload);
    res.json(result);
  } catch {
    res.status(500).send('n8n workflow error');
  }
});

// --- PERSONAL AI: TRIGGER FINE-TUNE ON MEMORY CHANGE ---
eventBus.on('memory:change', async () => {
  try {
    await triggerPersonalLLMFineTune();
  } catch (err) {
    console.warn('[llm-personal] Fine-tune failed:', err?.message || err);
  }
});

// --- API: MANUAL PERSONAL LLM FINE-TUNE TRIGGER ---
app.post('/api/personal-llm', async (_req, res) => {
  try {
    const result = await triggerPersonalLLMFineTune();
    res.json(result);
  } catch {
    res.status(500).send('Personal LLM error');
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  const onChange = (data: any) => ws.send(JSON.stringify({ type: 'memory:change', data }));
  eventBus.on('memory:change', onChange);
  ws.on('close', () => eventBus.off('memory:change', onChange));
});

const PORT = process.env.REGEN_API_PORT || 8080;
server.listen(PORT, () => {
  console.log(`[REGEN] Markdown API + Event Bus running on port ${PORT}`);
});
