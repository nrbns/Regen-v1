// llm-personal.ts
// Real, buildable personal AI engine integration for memory-driven learning
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const PERSONAL_LLM_URL = process.env.PERSONAL_LLM_URL || 'http://127.0.0.1:4400/v1/fine-tune';
const PERSONAL_LLM_TOKEN = process.env.PERSONAL_LLM_TOKEN || null;
const MEMORY_DIR = path.resolve(process.env.REGEN_MEMORY_DIR || './memory');

export async function triggerPersonalLLMFineTune() {
  // Gather all markdown memory as training data
  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'));
  const data = files.map(f => fs.readFileSync(path.join(MEMORY_DIR, f), 'utf-8')).join('\n\n');
  const headers = { 'Content-Type': 'application/json' };
  if (PERSONAL_LLM_TOKEN) headers['Authorization'] = `Bearer ${PERSONAL_LLM_TOKEN}`;
  const res = await fetch(PERSONAL_LLM_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error('Personal LLM fine-tune failed');
  return res.json();
}

// --- Real-time memory event integration ---
// Listen for memory:changed events and trigger AI fine-tune
const eventBus = require('./eventBus');

// Debounce to avoid retraining on every keystroke
let fineTuneTimeout = null;
const DEBOUNCE_MS = 5000;

eventBus.on('memory:changed', () => {
  if (fineTuneTimeout) clearTimeout(fineTuneTimeout);
  fineTuneTimeout = setTimeout(() => {
    triggerPersonalLLMFineTune()
      .then(result => {
        console.log('[PersonalLLM] Fine-tune triggered by memory change:', result);
      })
      .catch(err => {
        console.error('[PersonalLLM] Fine-tune error:', err);
      });
  }, DEBOUNCE_MS);
});
