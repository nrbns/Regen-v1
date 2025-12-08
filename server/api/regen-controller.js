/**
 * Regen API Controller
 * Handles /api/agent/query and /api/agent/stream endpoints
 */

const { handleMessage } = require('../../electron/services/regen/core');
const { runResearchWorkflow } = require('../../electron/services/regen/tools/n8nTools');
const {
  getDom,
  clickElement,
  scrollTab,
  openTab,
} = require('../../electron/services/regen/tools/browserTools');

/**
 * Handle agent query endpoint
 */
async function handleAgentQuery(request, reply) {
  const { sessionId, message, source = 'text', tabId, context } = request.body;

  try {
    // Handle message through Regen core
    const response = await handleMessage({
      sessionId,
      message,
      source,
      tabId,
      context,
    });

    // Execute commands if any
    if (response.commands && response.commands.length > 0) {
      for (const cmd of response.commands) {
        try {
          switch (cmd.type) {
            case 'GET_DOM': {
              if (cmd.payload.tabId) {
                const domResult = await getDom(cmd.payload.tabId);
                response.metadata = { ...response.metadata, dom: domResult.data };
              }
              break;
            }
            case 'CLICK': {
              if (cmd.payload.tabId && cmd.payload.selector) {
                await clickElement(cmd.payload.tabId, cmd.payload.selector);
              }
              break;
            }
            case 'SCROLL': {
              if (cmd.payload.tabId) {
                await scrollTab(cmd.payload.tabId, cmd.payload.amount || 500);
              }
              break;
            }
            case 'OPEN_TAB': {
              if (cmd.payload.url) {
                await openTab(cmd.payload.url);
              }
              break;
            }
          }
        } catch (cmdError) {
          request.log.warn({ error: cmdError }, 'Command execution failed');
        }
      }
    }

    // If research intent, call n8n workflow
    if (response.intent === 'research') {
      try {
        const researchResult = await runResearchWorkflow(message);
        if (researchResult.success) {
          response.metadata = {
            ...response.metadata,
            researchData: researchResult.data,
          };
        }
      } catch (error) {
        request.log.warn({ error }, 'Research workflow failed, continuing without it');
      }
    }

    return reply.send({
      success: true,
      response,
    });
  } catch (error) {
    request.log.error({ error }, 'Agent query failed');
    return reply.status(500).send({
      success: false,
      error: error.message || 'Agent query failed',
    });
  }
}

/**
 * Handle agent stream endpoint (SSE)
 */
async function handleAgentStream(request, reply) {
  const { sessionId, message, source = 'text', tabId, context } = request.query;

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendEvent = (type, data) => {
    reply.raw.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  try {
    sendEvent('status', { message: 'Processing your request...' });

    const response = await handleMessage({
      sessionId,
      message,
      source,
      tabId,
      context,
    });

    // Stream response text
    sendEvent('message', { text: response.text });

    // Stream commands
    if (response.commands && response.commands.length > 0) {
      for (const cmd of response.commands) {
        sendEvent('command', { command: cmd });
      }
    }

    // Stream status updates
    if (response.intent === 'research') {
      sendEvent('status', { message: 'Searching web sources...' });
      try {
        const researchResult = await runResearchWorkflow(message);
        if (researchResult.success) {
          sendEvent('message', { text: 'Research complete. Opening sources...' });
          sendEvent('data', { researchData: researchResult.data });
        }
      } catch (error) {
        request.log.warn({ error }, 'Research workflow failed');
      }
    }

    sendEvent('done', {});
  } catch (error) {
    request.log.error({ error }, 'Agent stream failed');
    sendEvent('error', { error: error.message || 'Stream failed' });
  } finally {
    reply.raw.end();
  }
}

module.exports = {
  handleAgentQuery,
  handleAgentStream,
};
