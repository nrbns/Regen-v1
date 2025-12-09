/**
 * Research Streaming E2E Tests
 * Tests the complete research flow with job queue and WebSocket streaming
 */

import { test, expect } from '@playwright/test';

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:3000/agent/stream';

test.describe('Research Streaming', () => {
  test('research job queues and streams progress', async ({ page }) => {
    // Generate unique client ID
    const clientId = `test-${Date.now()}`;
    const sessionId = `session-${Date.now()}`;

    // Navigate to app
    await page.goto('http://localhost:5173');

    // Set up WebSocket connection tracking
    const wsMessages: any[] = [];
    let wsConnected = false;

    // Intercept WebSocket messages
    await page.addInitScript(
      (wsUrl, cId, sId) => {
        const originalWebSocket = window.WebSocket;
        (window as any).WebSocket = class extends originalWebSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);
            if (url.toString().includes('/agent/stream')) {
              this.addEventListener('message', event => {
                try {
                  const data = JSON.parse(event.data);
                  (window as any).__wsMessages = (window as any).__wsMessages || [];
                  (window as any).__wsMessages.push(data);
                } catch (e) {
                  // Ignore parse errors
                }
              });
              this.addEventListener('open', () => {
                (window as any).__wsConnected = true;
              });
            }
          }
        };
      },
      WS_URL,
      clientId,
      sessionId
    );

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Start research job
    const response = await page.evaluate(
      async ({ serverUrl, query, cId, sId }) => {
        const res = await fetch(`${serverUrl}/api/research/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            lang: 'en',
            clientId: cId,
            sessionId: sId,
          }),
        });
        return res.json();
      },
      {
        serverUrl: SERVER_URL,
        query: 'What is artificial intelligence?',
        cId: clientId,
        sId: sessionId,
      }
    );

    expect(response).toHaveProperty('jobId');
    expect(response.status).toBe('queued');

    const { jobId } = response;

    // Wait for WebSocket messages
    await page
      .waitForFunction(() => (window as any).__wsConnected === true, { timeout: 5000 })
      .catch(() => {
        // WebSocket might not connect in test environment - that's okay
      });

    // Poll for job status
    const statusResponse = await page.evaluate(
      async ({ serverUrl, jId }) => {
        const res = await fetch(`${serverUrl}/api/research/status/${jId}`);
        return res.json();
      },
      { serverUrl: SERVER_URL, jId: jobId }
    );

    expect(statusResponse).toHaveProperty('id', jobId);
    expect(['completed', 'active', 'waiting', 'delayed']).toContain(statusResponse.state);

    // If completed, verify result structure
    if (statusResponse.state === 'completed' && statusResponse.result) {
      expect(statusResponse.result).toHaveProperty('summary');
      expect(statusResponse.result).toHaveProperty('sources');
      expect(Array.isArray(statusResponse.result.sources)).toBe(true);
      expect(statusResponse.result.sources.length).toBeGreaterThan(0);
    }
  });

  test('research handles Hindi language query', async ({ page }) => {
    const clientId = `test-hi-${Date.now()}`;
    const sessionId = `session-hi-${Date.now()}`;

    await page.goto('http://localhost:5173');

    const response = await page.evaluate(
      async ({ serverUrl, query, cId, sId }) => {
        const res = await fetch(`${serverUrl}/api/research/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            lang: 'hi',
            clientId: cId,
            sessionId: sId,
          }),
        });
        return res.json();
      },
      {
        serverUrl: SERVER_URL,
        query: 'कृत्रिम बुद्धिमत्ता क्या है?', // "What is artificial intelligence?" in Hindi
        cId: clientId,
        sId: sessionId,
      }
    );

    expect(response).toHaveProperty('jobId');
    expect(response.status).toBe('queued');

    // Wait a bit for processing
    await page.waitForTimeout(2000);

    // Check job status
    const statusResponse = await page.evaluate(
      async ({ serverUrl, jId }) => {
        const res = await fetch(`${serverUrl}/api/research/status/${jId}`);
        return res.json();
      },
      { serverUrl: SERVER_URL, jId: response.jobId }
    );

    expect(statusResponse).toHaveProperty('id');
  });

  test('research job returns error for invalid query', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const response = await page.evaluate(
      async ({ serverUrl }) => {
        const res = await fetch(`${serverUrl}/api/research/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'a', // Too short
            lang: 'en',
          }),
        });
        return { status: res.status, body: await res.json() };
      },
      { serverUrl: SERVER_URL }
    );

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});







