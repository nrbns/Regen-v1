/**
 * Voice WebSocket Server
 * Real-time streaming STT for voice commands
 */

const { WebSocketServer } = require('ws');
const { getWhisperService } = require('./whisper-service.cjs');
const Pino = require('pino');

const logger = Pino({ name: 'voice-websocket' });

function createVoiceWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/voice' });
  const whisperService = getWhisperService();
  
  // Lazy load agent manager to avoid circular dependencies
  let agentManager = null;
  function getAgentManager() {
    if (!agentManager) {
      try {
        agentManager = require('../../agent-engine/agent-manager.cjs').getAgentManager();
      } catch (error) {
        logger.warn({ error: error.message }, 'Agent manager not available');
      }
    }
    return agentManager;
  }

  wss.on('connection', (ws, req) => {
    const sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId') || 
                      `voice-${Date.now()}`;
    
    logger.info({ sessionId }, 'Voice WebSocket connected');

    let audioBuffer = Buffer.alloc(0);
    let isRecording = false;
    let transcriptBuffer = '';

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      message: 'Connected to voice stream',
    }));

    // DESI POLISH: Track language preference per session
    let sessionLanguage = 'auto';

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        // Check if message is binary (audio) or JSON (control)
        if (Buffer.isBuffer(message) || message instanceof ArrayBuffer) {
          // Audio data
          if (isRecording) {
            const chunk = Buffer.from(message);
            audioBuffer = Buffer.concat([audioBuffer, chunk]);
            
            // Send partial transcript if buffer is large enough
            if (audioBuffer.length >= 8000) { // ~0.5 seconds at 16kHz
              try {
                // DESI POLISH: Pass language to Whisper
                const result = await whisperService.transcribe(audioBuffer, { language: sessionLanguage });
                if (result.text && result.text !== transcriptBuffer) {
                  transcriptBuffer = result.text;
                  ws.send(JSON.stringify({
                    type: 'transcript:partial',
                    text: result.text,
                    timestamp: Date.now(),
                  }));
                }
                // Keep some overlap
                audioBuffer = audioBuffer.slice(-4000);
              } catch (error) {
                logger.error({ sessionId, error: error.message }, 'Partial transcription failed');
              }
            }
          }
        } else {
          // Control message
          const data = JSON.parse(message.toString());
          const { type, action, language } = data;

          // DESI POLISH: Update session language if provided
          if (language) {
            sessionLanguage = language;
          }

          switch (type) {
            case 'start':
              isRecording = true;
              audioBuffer = Buffer.alloc(0);
              transcriptBuffer = '';
              // DESI POLISH: Update language from start message
              if (language) {
                sessionLanguage = language;
              }
              ws.send(JSON.stringify({
                type: 'recording:started',
                sessionId,
                language: sessionLanguage,
              }));
              break;

            case 'stop':
              isRecording = false;
              
              // Final transcription
              if (audioBuffer.length > 0) {
                try {
                  // DESI POLISH: Pass language to Whisper
                  const result = await whisperService.transcribe(audioBuffer, { language: sessionLanguage });
                  ws.send(JSON.stringify({
                    type: 'transcript:final',
                    text: result.text,
                    language: result.language || sessionLanguage,
                    timestamp: Date.now(),
                  }));

                  // Auto-send to agent if enabled
                  if (data.autoSendToAgent && result.text) {
                    try {
                      const manager = getAgentManager();
                      if (manager) {
                        const taskId = await manager.executeTask(sessionId, result.text);
                        ws.send(JSON.stringify({
                          type: 'agent:task:started',
                          taskId,
                          text: result.text,
                        }));
                      }
                    } catch (error) {
                      logger.error({ sessionId, error: error.message }, 'Failed to send to agent');
                    }
                  }
                } catch (error) {
                  logger.error({ sessionId, error: error.message }, 'Final transcription failed');
                  ws.send(JSON.stringify({
                    type: 'transcript:error',
                    error: error.message,
                  }));
                }
              }
              
              ws.send(JSON.stringify({
                type: 'recording:stopped',
                sessionId,
              }));
              break;

            case 'cancel':
              isRecording = false;
              audioBuffer = Buffer.alloc(0);
              transcriptBuffer = '';
              ws.send(JSON.stringify({
                type: 'recording:cancelled',
                sessionId,
              }));
              break;

            default:
              ws.send(JSON.stringify({
                type: 'error',
                message: `Unknown command: ${type}`,
              }));
          }
        }
      } catch (error) {
        logger.error({ sessionId, error: error.message }, 'Voice WebSocket message error');
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      logger.info({ sessionId }, 'Voice WebSocket disconnected');
      isRecording = false;
      audioBuffer = Buffer.alloc(0);
    });

    ws.on('error', (error) => {
      logger.error({ sessionId, error: error.message }, 'Voice WebSocket error');
    });
  });

  logger.info('Voice WebSocket server created');
  return wss;
}

module.exports = { createVoiceWebSocket };

