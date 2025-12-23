/**
 * Voice Module Exports
 */

export { AudioProcessor, WebAudioProcessor, audioProcessor } from './audioProcessor';
export type { AudioConfig, AudioChunk } from './audioProcessor';

export { WhisperService, whisperService } from './whisperService';
export type { TranscriptionResult, TranscriptionChunk } from './whisperService';

export { StreamingTranscriber, WebSocketTranscriber } from './streamingTranscriber';
export type { StreamingTranscriberOptions } from './streamingTranscriber';

export { TTSService, ttsService } from './ttsService';
export type { TTSOptions, TTSResult } from './ttsService';

export { VoiceAgent, createVoiceAgent } from './voiceAgent';
export type { VoiceCommandResult, VoiceAgentConfig } from './voiceAgent';
