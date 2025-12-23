/**
 * Simple Research API Server - No Redis Required
 * Provides /api/research endpoints for the frontend
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { runResearch, getResearchStatus } from './api/research-controller.js';

const app = Fastify({
  logger: true,
});

// CORS for frontend
await app.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'tauri://localhost'],
  credentials: true,
});

// Health check
app.get('/health', async () => ({ status: 'ok', service: 'research-api' }));

// Research API routes
app.post('/api/research/run', runResearch);
app.get('/api/research/status/:jobId', getResearchStatus);

// Start server
const port = parseInt(process.env.PORT || '4000');
try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`[ResearchAPI] Server running at http://localhost:${port}`);
  console.log('[ResearchAPI] Ready to handle research requests');
} catch (err) {
  console.error('[ResearchAPI] Failed to start:', err);
  process.exit(1);
}
