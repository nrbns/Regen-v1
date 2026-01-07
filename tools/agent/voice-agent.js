#!/usr/bin/env node
/**
 * Voice Agent - Real-time Whisper transcription
 * Accepts audio frames, streams partial transcripts
 * PR: Voice pipeline glue
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BUS_URL = process.env.BUS_URL || 'ws://localhost:4002';
const AUDIO_CHANNEL = 'voice.frames';
const TRANSCRIPT_CHANNEL_PREFIX = 'voice.transcripts';

// Whisper configuration
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base.en';
const WHISPER_CMD = process.env.WHISPER_CMD || 'whisper';

let ws = null;
let activeSessions = new Map(); // sessionId -> { process, buffer }

/**
 * Connect to bus
 */
function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  console.log(`[VoiceAgent] Connecting to bus: ${BUS_URL}`);

  ws = new WebSocket(BUS_URL);

  ws.on('open', () => {
    console.log('[VoiceAgent] Connected to bus');

    // Subscribe to audio frames
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        channel: AUDIO_CHANNEL,
      })
    );
  });

  ws.on('message', data => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(message);
    } catch (error) {
      console.error('[VoiceAgent] Message parse error:', error);
    }
  });

  ws.on('error', error => {
    console.error('[VoiceAgent] WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('[VoiceAgent] Disconnected, reconnecting...');
    setTimeout(() => connect(), 3000);
  });
}

/**
 * Handle messages
 */
function handleMessage(message) {
  if (message.type === 'connected') {
    console.log(`[VoiceAgent] Connected as ${message.clientId}`);
    return;
  }

  if (message.type === 'subscribed') {
    console.log(`[VoiceAgent] Subscribed to ${message.channel}`);
    return;
  }

  if (message.type === 'message' && message.channel === AUDIO_CHANNEL) {
    handleAudioFrame(message.data);
  }
}

/**
 * Handle audio frame
 */
function handleAudioFrame(frame) {
  const { sessionId, audioData, isFinal } = frame;

  if (!sessionId) {
    console.warn('[VoiceAgent] Frame missing sessionId');
    return;
  }

  // Get or create session
  let session = activeSessions.get(sessionId);
  if (!session) {
    session = createSession(sessionId);
    activeSessions.set(sessionId, session);
  }

  // Append audio data to buffer
  if (audioData) {
    const buffer = Buffer.from(audioData, 'base64');
    session.buffer = Buffer.concat([session.buffer, buffer]);
  }

  // Process if final or buffer is large enough
  if (isFinal || session.buffer.length > 16000) {
    // ~1 second at 16kHz
    processAudio(sessionId, session);

    if (isFinal) {
      // Cleanup session
      if (session.process) {
        session.process.kill();
      }
      activeSessions.delete(sessionId);
    } else {
      // Reset buffer for next chunk
      session.buffer = Buffer.alloc(0);
    }
  }
}

/**
 * Create new transcription session
 */
function createSession(sessionId) {
  console.log(`[VoiceAgent] Creating session: ${sessionId}`);

  // For now, use mock transcription
  // In production, spawn whisper.cpp process
  const session = {
    sessionId,
    buffer: Buffer.alloc(0),
    process: null,
    startTime: Date.now(),
  };

  // Publish session started
  publishTranscript(sessionId, {
    type: 'start',
    sessionId,
    timestamp: Date.now(),
  });

  return session;
}

/**
 * Process audio buffer
 */
function processAudio(sessionId, session) {
  // Mock transcription (replace with actual whisper.cpp call)
  const mockTranscript = generateMockTranscript(session.buffer.length);

  // Publish partial transcript
  publishTranscript(sessionId, {
    type: 'partial',
    sessionId,
    text: mockTranscript,
    timestamp: Date.now(),
  });

  // In production, this would:
  // 1. Write buffer to temp file
  // 2. Spawn whisper.cpp: whisper -m base.en -f audio.wav
  // 3. Parse output and stream tokens
}

/**
 * Generate mock transcript (for testing)
 */
function generateMockTranscript(bufferLength) {
  // Simulate transcription based on buffer size
  const words = ['hello', 'world', 'this', 'is', 'a', 'test', 'transcription'];
  const wordCount = Math.floor(bufferLength / 2000); // Rough estimate
  return words.slice(0, Math.min(wordCount, words.length)).join(' ');
}

/**
 * Publish transcript
 */
function publishTranscript(sessionId, data) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const channel = `${TRANSCRIPT_CHANNEL_PREFIX}.${sessionId}`;
  ws.send(
    JSON.stringify({
      type: 'publish',
      channel,
      data,
    })
  );
}

/**
 * Start voice agent
 */
console.log('🎤 Voice Agent starting...');
console.log(`📡 Bus URL: ${BUS_URL}`);
console.log(`📥 Subscribing to: ${AUDIO_CHANNEL}`);
console.log(`📤 Publishing to: ${TRANSCRIPT_CHANNEL_PREFIX}.*`);

connect();

// Cleanup on exit
process.on('SIGTERM', () => {
  console.log('[VoiceAgent] Shutting down...');
  activeSessions.forEach((session, sessionId) => {
    if (session.process) {
      session.process.kill();
    }
  });
  if (ws) {
    ws.close();
  }
  process.exit(0);
});
