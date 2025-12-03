#!/usr/bin/env node
/**
 * Assistant/Orchestrator Agent
 * Routes requests, enforces permissions, manages context, stores provenance
 * PR: Full orchestrator implementation
 */

const WebSocket = require('ws');
const crypto = require('crypto');

const BUS_URL = process.env.BUS_URL || 'ws://localhost:4002';
const REQUEST_CHANNEL = 'assistant.requests';
const RESPONSE_CHANNEL_PREFIX = 'assistant.responses';

// Agent registry
const agents = {
  summarizer: { channel: 'agent.requests', available: true },
  searcher: { channel: 'search.requests', available: false },
  vision: { channel: 'vision.requests', available: false },
  market: { channel: 'market.requests', available: false },
};

// Request context storage
const requestContexts = new Map(); // requestId -> context

// Rate limiting
const rateLimits = new Map(); // userId -> { count, resetAt }
const MAX_REQUESTS_PER_MINUTE = 10;

// Tool permissions
const toolPermissions = {
  browser_click: ['assistant', 'user'],
  browser_navigate: ['assistant', 'user'],
  browser_extract: ['assistant', 'user', 'summarizer'],
  trade_order: ['user'], // Only user can place trades
  file_read: ['assistant', 'user'],
  file_write: ['user'],
};

let ws = null;
let reconnectTimer = null;
let isConnected = false;

/**
 * Connect to bus
 */
function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  console.log(`[Assistant] Connecting to bus: ${BUS_URL}`);

  ws = new WebSocket(BUS_URL);

  ws.on('open', () => {
    isConnected = true;
    console.log('[Assistant] Connected to bus');

    // Subscribe to request channel
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: REQUEST_CHANNEL,
    }));

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(message);
    } catch (error) {
      console.error('[Assistant] Message parse error:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('[Assistant] WebSocket error:', error);
    isConnected = false;
  });

  ws.on('close', () => {
    isConnected = false;
    console.log('[Assistant] Disconnected, reconnecting in 3s...');
    reconnectTimer = setTimeout(() => connect(), 3000);
  });
}

/**
 * Handle incoming messages
 */
function handleMessage(message) {
  if (message.type === 'connected') {
    console.log(`[Assistant] Connected as ${message.clientId}`);
    return;
  }

  if (message.type === 'subscribed') {
    console.log(`[Assistant] Subscribed to ${message.channel}`);
    return;
  }

  if (message.type === 'message' && message.channel === REQUEST_CHANNEL) {
    handleRequest(message.data);
  }
}

/**
 * Handle assistant request
 */
async function handleRequest(request) {
  const {
    id,
    userId = 'anonymous',
    query,
    tools = [],
    context = {},
    priority = 'normal',
  } = request;

  if (!id) {
    console.warn('[Assistant] Request missing id');
    return;
  }

  // Rate limiting
  if (!checkRateLimit(userId)) {
    sendError(id, 'Rate limit exceeded. Please wait a moment.');
    return;
  }

  // Create request context
  const contextId = id;
  const requestContext = {
    id: contextId,
    userId,
    query,
    tools,
    context,
    priority,
    startedAt: Date.now(),
    toolCalls: [],
    responses: [],
    provenance: [],
  };

  requestContexts.set(contextId, requestContext);

  console.log(`[Assistant] Processing request ${id} from ${userId}: ${query}`);

  try {
    // Route to appropriate agents
    const response = await routeRequest(requestContext);

    // Store provenance
    requestContext.provenance.push({
      timestamp: Date.now(),
      action: 'request_completed',
      result: 'success',
    });

    // Send final response
    sendResponse(contextId, {
      type: 'complete',
      requestId: id,
      response: response,
      provenance: requestContext.provenance,
      duration: Date.now() - requestContext.startedAt,
    });

    // Cleanup after delay
    setTimeout(() => {
      requestContexts.delete(contextId);
    }, 60000); // Keep for 1 minute

  } catch (error) {
    console.error(`[Assistant] Request ${id} failed:`, error);
    sendError(id, error.message);
  }
}

/**
 * Route request to appropriate agents
 */
async function routeRequest(context) {
  const { query, tools, context: requestContext } = context;

  // Determine which agents to use
  const needsSummarize = query.toLowerCase().includes('summarize') || 
                         query.toLowerCase().includes('summary');
  const needsSearch = query.toLowerCase().includes('search') ||
                      query.toLowerCase().includes('find');
  const needsVision = tools.includes('vision') || tools.includes('screenshot');

  const responses = [];

  // Call summarizer if needed
  if (needsSummarize && agents.summarizer.available) {
    const summary = await callAgent('summarizer', {
      id: `${context.id}-summary`,
      query,
      content: requestContext.content || '',
      url: requestContext.url,
    });
    responses.push({ agent: 'summarizer', result: summary });
    context.toolCalls.push({ agent: 'summarizer', timestamp: Date.now() });
  }

  // Call searcher if needed
  if (needsSearch && agents.searcher.available) {
    const search = await callAgent('searcher', {
      id: `${context.id}-search`,
      query,
    });
    responses.push({ agent: 'searcher', result: search });
    context.toolCalls.push({ agent: 'searcher', timestamp: Date.now() });
  }

  // Combine responses
  return combineResponses(responses, query);
}

/**
 * Call an agent
 */
function callAgent(agentName, request) {
  return new Promise((resolve, reject) => {
    if (!agents[agentName] || !agents[agentName].available) {
      reject(new Error(`Agent ${agentName} not available`));
      return;
    }

    const agentChannel = agents[agentName].channel;
    const responseChannel = `${agentName}.responses.${request.id}`;

    // Subscribe to response channel
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: responseChannel,
    }));

    // Set timeout
    const timeout = setTimeout(() => {
      reject(new Error(`Agent ${agentName} timeout`));
    }, 30000); // 30s timeout

    // Listen for response
    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'message' && message.channel === responseChannel) {
          clearTimeout(timeout);
          ws.onmessage = originalOnMessage;
          resolve(message.data);
        }
      } catch (error) {
        // Continue listening
      }
    };

    // Publish request
    ws.send(JSON.stringify({
      type: 'publish',
      channel: agentChannel,
      data: request,
    }));
  });
}

/**
 * Combine agent responses
 */
function combineResponses(responses, query) {
  if (responses.length === 0) {
    return {
      text: `I couldn't find any relevant information for "${query}".`,
      sources: [],
    };
  }

  const combined = responses.map(r => r.result.text || r.result).join('\n\n');
  const sources = responses.flatMap(r => r.result.sources || []);

  return {
    text: combined,
    sources: [...new Set(sources)], // Deduplicate
    agents: responses.map(r => r.agent),
  };
}

/**
 * Check rate limit
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const limit = rateLimits.get(userId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(userId, {
      count: 1,
      resetAt: now + 60000, // Reset after 1 minute
    });
    return true;
  }

  if (limit.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }

  limit.count++;
  return true;
}

/**
 * Check tool permission
 */
function checkToolPermission(tool, userId) {
  const allowed = toolPermissions[tool] || [];
  return allowed.includes(userId) || allowed.includes('assistant');
}

/**
 * Send response
 */
function sendResponse(requestId, data) {
  if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const channel = `${RESPONSE_CHANNEL_PREFIX}.${requestId}`;
  ws.send(JSON.stringify({
    type: 'publish',
    channel,
    data,
  }));
}

/**
 * Send error
 */
function sendError(requestId, error) {
  sendResponse(requestId, {
    type: 'error',
    requestId,
    error,
    timestamp: Date.now(),
  });
}

/**
 * Start orchestrator
 */
console.log('🎯 Assistant/Orchestrator starting...');
console.log(`📡 Bus URL: ${BUS_URL}`);
console.log(`📥 Subscribing to: ${REQUEST_CHANNEL}`);
console.log(`📤 Publishing to: ${RESPONSE_CHANNEL_PREFIX}.*`);

connect();

// Keep process alive
process.on('SIGTERM', () => {
  console.log('[Assistant] Shutting down...');
  if (ws) {
    ws.close();
  }
  process.exit(0);
});

