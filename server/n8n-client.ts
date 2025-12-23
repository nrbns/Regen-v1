// n8n-client.ts
// Real, buildable n8n workflow trigger for AI-OS Kernel
import fetch from 'node-fetch';

const N8N_URL = process.env.N8N_URL || 'http://127.0.0.1:5678/webhook';
const N8N_API_KEY = process.env.N8N_API_KEY || null;

export async function triggerN8nWorkflow(workflow: string, payload: any = {}) {
  const url = `${N8N_URL}/${workflow}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (N8N_API_KEY) headers['X-API-KEY'] = N8N_API_KEY;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('n8n workflow trigger failed');
  return res.json();
}
