/**
 * Regen Streamer
 * Wraps Regen message handling with real-time streaming
 */

const { v4: uuidv4 } = require('uuid');
const { sendToClient } = require('./websocket-server');
const { handleMessage } = require('../../electron/services/regen/core');
const { getResponseLanguage } = require('../../electron/services/regen/session');
const { createLogger } = require('../../electron/services/utils/logger');

const log = createLogger('regen-streamer');

/**
 * Handle message with real-time streaming
 */
async function handleMessageSafe(input) {
  const { clientId, sessionId, message, mode, source, tabId, context } = input;

  try {
    // Send initial status
    await sendToClient({
      id: uuidv4(),
      clientId,
      sessionId,
      type: 'status',
      phase: 'planning',
      detail: 'Analyzing your request...',
      timestamp: Date.now(),
      version: 1,
    });

    // Call Regen core with streaming callback
    const response = await handleMessage({
      sessionId,
      message,
      mode,
      source: source || 'text',
      tabId,
      context,
    });

    // Get response language from session
    const responseLanguage = getResponseLanguage(sessionId);

    // Stream response text in chunks (optimized for real-time)
    const text = response.text || '';
    const chunkSize = 100; // Increased chunk size for better performance

    // Send entire message if small, otherwise chunk it
    if (text.length <= chunkSize) {
      await sendToClient({
        id: uuidv4(),
        clientId,
        sessionId,
        type: 'message',
        role: 'assistant',
        mode: mode || 'research',
        language: responseLanguage,
        text: text,
        done: true,
        timestamp: Date.now(),
        version: 1,
      });
    } else {
      // Stream in chunks for longer messages
      let _accumulatedText = '';
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        _accumulatedText = _accumulatedText + chunk;
        const isLastChunk = i + chunkSize >= text.length;

        await sendToClient({
          id: uuidv4(),
          clientId,
          sessionId,
          type: 'message',
          role: 'assistant',
          mode: mode || 'research',
          language: responseLanguage,
          text: chunk,
          done: isLastChunk,
          timestamp: Date.now(),
          version: 1,
        });

        // Reduced delay for faster streaming (only if not last chunk)
        if (!isLastChunk) {
          await new Promise(resolve => setTimeout(resolve, 20)); // Reduced from 50ms to 20ms
        }
      }
    }

    // Send commands if any
    if (response.commands && response.commands.length > 0) {
      for (const cmd of response.commands) {
        await sendToClient({
          id: uuidv4(),
          clientId,
          sessionId,
          type: 'command',
          command: convertRegenCommand(cmd),
          timestamp: Date.now(),
          version: 1,
        });
      }
    }

    // Send final status
    await sendToClient({
      id: uuidv4(),
      clientId,
      sessionId,
      type: 'status',
      phase: 'idle',
      timestamp: Date.now(),
      version: 1,
    });

    return response;
  } catch (error) {
    log.error('Error in handleMessageSafe', { clientId, sessionId, error: error.message });

    // Send error event
    await sendToClient({
      id: uuidv4(),
      clientId,
      sessionId,
      type: 'error',
      code: 'AGENT_INTERNAL',
      message: 'Regen ran into a problem but recovered.',
      recoverable: true,
      timestamp: Date.now(),
      version: 1,
    });

    // Send idle status
    await sendToClient({
      id: uuidv4(),
      clientId,
      sessionId,
      type: 'status',
      phase: 'idle',
      timestamp: Date.now(),
      version: 1,
    });

    throw error;
  }
}

/**
 * Convert Regen command to real-time command format
 */
function convertRegenCommand(cmd) {
  const { type, payload } = cmd;

  switch (type) {
    case 'OPEN_TAB':
      return {
        kind: 'OPEN_TAB',
        url: payload.url,
        background: payload.background || false,
      };

    case 'SCROLL':
      return {
        kind: 'SCROLL',
        tabId: payload.tabId,
        amount: payload.amount || 200,
      };

    case 'CLICK':
      return {
        kind: 'CLICK_ELEMENT',
        tabId: payload.tabId,
        elementId: payload.elementId,
        selector: payload.selector,
      };

    case 'TYPE':
      return {
        kind: 'TYPE_INTO_ELEMENT',
        tabId: payload.tabId,
        selector: payload.selector,
        text: payload.text,
      };

    case 'GO_BACK':
      return {
        kind: 'GO_BACK',
        tabId: payload.tabId,
      };

    case 'GO_FORWARD':
      return {
        kind: 'GO_FORWARD',
        tabId: payload.tabId,
      };

    case 'SWITCH_TAB':
      return {
        kind: 'SWITCH_TAB',
        tabId: payload.tabId,
      };

    case 'CLOSE_TAB':
      return {
        kind: 'CLOSE_TAB',
        tabId: payload.tabId,
      };

    case 'READ_PAGE':
      // Convert to SPEAK command
      return {
        kind: 'SPEAK',
        text: payload.text || 'Reading page content...',
        language: 'en',
      };

    default:
      log.warn('Unknown command type', { type });
      return null;
  }
}

/**
 * Send status update
 */
async function sendStatus(clientId, sessionId, phase, detail) {
  return sendToClient({
    id: uuidv4(),
    clientId,
    sessionId,
    type: 'status',
    phase,
    detail,
    timestamp: Date.now(),
    version: 1,
  });
}

/**
 * Send notification
 */
async function sendNotification(clientId, sessionId, level, title, message, duration) {
  return sendToClient({
    id: uuidv4(),
    clientId,
    sessionId,
    type: 'notification',
    level,
    title,
    message,
    duration,
    timestamp: Date.now(),
    version: 1,
  });
}

module.exports = {
  handleMessageSafe,
  sendStatus,
  sendNotification,
};
