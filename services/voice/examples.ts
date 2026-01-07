/**
 * Voice Integration Examples
 * Complete workflows using speech-to-text, text-to-speech, and voice agents
 */

import { audioProcessor } from './audioProcessor';
import { whisperService } from './whisperService';
import { StreamingTranscriber } from './streamingTranscriber';
import { ttsService } from './ttsService';
import { createVoiceAgent } from './voiceAgent';

/**
 * Example 1: Simple Voice Command (Record -> Transcribe)
 */
export async function example1_SimpleVoiceCommand() {
  console.log('🎤 Example 1: Simple Voice Command\n');

  try {
    // Start recording
    console.log('  Recording... speak your command');
    await audioProcessor.startRecording();

    // Simulate speaking (in real app: user speaks for 3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Stop recording
    const audioBlob = await audioProcessor.stopRecording();
    console.log(`  ✓ Recording complete (${audioBlob.size} bytes)`);

    // Transcribe
    const result = await whisperService.transcribe(audioBlob);
    console.log(`  ✓ Transcribed: "${result.text}"`);
    console.log(`    Language: ${result.language}, Confidence: ${result.confidence || 'N/A'}`);
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
}

/**
 * Example 2: Streaming Transcription (Live Partial Results)
 */
export async function example2_StreamingTranscription() {
  console.log('\n📝 Example 2: Streaming Transcription\n');

  const partialResults: string[] = [];

  const transcriber = new StreamingTranscriber({
    chunkDurationMs: 500,
    language: 'en-US',
    includePartial: true,
    onChunk: chunk => {
      if (chunk.isFinal) {
        console.log(`  ✓ Final: "${chunk.partial}"`);
      } else {
        partialResults.push(chunk.partial);
        console.log(`  → Partial: "${chunk.partial}"`);
      }
    },
    onError: error => {
      console.error('  ✗ Error:', error);
    },
  });

  try {
    console.log('  Starting stream transcription...');
    await transcriber.start();

    // Simulate speaking (3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Stop and get final result
    const fullText = await transcriber.stop();
    console.log(`\n  Final Text: "${fullText}"`);
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
}

/**
 * Example 3: Text-to-Speech Synthesis
 */
export async function example3_TextToSpeech() {
  console.log('\n🔊 Example 3: Text-to-Speech\n');

  const texts = [
    'Summarizing your emails',
    'Creating a presentation about sales',
    'Booking your flight to New York',
  ];

  for (const text of texts) {
    try {
      console.log(`  Synthesizing: "${text}"`);

      const result = await ttsService.synthesize(text);
      console.log(`  ✓ Synthesized (${result.audioBlob.size} bytes, ${result.mimeType})`);

      // In real app: play audio
      // await ttsService.play(result.audioBlob);
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
    }
  }
}

/**
 * Example 4: Voice Agent - Single Command
 */
export async function example4_VoiceAgentSingleCommand() {
  console.log('\n🤖 Example 4: Voice Agent - Single Command\n');

  const voiceAgent = createVoiceAgent({
    userId: 'alice@example.com',
    language: 'en-US',
    enableSpokenFeedback: false, // Disable for demo
    autoExecute: true, // Auto-approve low-risk tasks
  });

  try {
    console.log('  Starting voice agent...');
    console.log('  ► Listening for command...');

    // In real app: user speaks here
    // "Summarize my emails"

    // Simulate listening (2 seconds)
    await voiceAgent.startListening();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await voiceAgent.stopListening();

    if (result) {
      console.log(`  ✓ Command: "${result.command}"`);
      console.log(`  ✓ Status: ${result.status}`);
      if (result.result) {
        console.log(`  ✓ Result: ${result.result}`);
      }
      if (result.error) {
        console.log(`  ✗ Error: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
}

/**
 * Example 5: Voice Agent - Multiple Commands (Loop)
 */
export async function example5_VoiceAgentMultipleCommands() {
  console.log('\n🎙️ Example 5: Voice Agent - Multiple Commands\n');

  const voiceAgent = createVoiceAgent({
    userId: 'bob@example.com',
    language: 'en-US',
    enableSpokenFeedback: false,
    autoExecute: true,
  });

  const commands = [
    'Summarize my emails',
    'Create a presentation about sales',
    'Book me a flight to New York',
  ];

  for (const command of commands) {
    try {
      console.log(`\n  Command: "${command}"`);
      console.log('  ► Processing...');

      // Simulate voice command
      await voiceAgent.startListening();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await voiceAgent.stopListening();

      if (result) {
        console.log(`  ✓ Status: ${result.status}`);
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
    }
  }
}

/**
 * Example 6: Voice with Continuous Feedback
 */
export async function example6_VoiceWithFeedback() {
  console.log('\n💬 Example 6: Voice with Continuous Feedback\n');

  const transcriber = new StreamingTranscriber({
    chunkDurationMs: 300,
    language: 'en-US',
    includePartial: true,
    onChunk: async chunk => {
      if (!chunk.isFinal) {
        console.log(`  🗣️  "${chunk.partial}"`);
      } else {
        console.log(`  ✓ Heard: "${chunk.partial}"`);

        // Speak back
        try {
          const feedback = `I heard: ${chunk.partial}`;
          const _audio = await ttsService.synthesize(feedback);
          console.log(`  🔊 Speaking: "${feedback}"`);
          // await ttsService.play(_audio.audioBlob);
        } catch (error) {
          console.error(`  ✗ TTS Error: ${error}`);
        }
      }
    },
    onError: error => {
      console.error(`  ✗ Error: ${error}`);
    },
  });

  try {
    console.log('  Starting transcription with feedback...');
    await transcriber.start();

    // Simulate speaking (3 seconds)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const fullText = await transcriber.stop();
    console.log(`\n  Final: "${fullText}"`);
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
}

/**
 * Example 7: Voice Agent with Approval Workflow
 */
export async function example7_VoiceAgentWithApproval() {
  console.log('\n⚠️ Example 7: Voice Agent with Approval\n');

  const voiceAgent = createVoiceAgent({
    userId: 'charlie@example.com',
    language: 'en-US',
    enableSpokenFeedback: false,
    autoExecute: false, // Require approval
  });

  try {
    console.log('  Command: "Send email reply to John"');
    console.log('  ► Listening...');

    await voiceAgent.startListening();
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('  ► Processing...');
    const result = await voiceAgent.stopListening();

    if (result) {
      console.log(`  Status: ${result.status}`);
      console.log(`  Plan ID: ${result.planId}`);

      if (result.status === 'pending') {
        console.log('  ⏳ Waiting for approval...');
        console.log('  (In real app: user speaks "yes" or "no")');

        // Simulate approval
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error('  ✗ Error:', error);
  }
}

// Run examples
console.log('=== Voice Module Examples ===\n');

(async () => {
  try {
    // Example 1: Simple voice command
    await example1_SimpleVoiceCommand();

    // Example 2: Streaming transcription
    await example2_StreamingTranscription();

    // Example 3: Text-to-speech
    await example3_TextToSpeech();

    // Example 4: Single voice command
    await example4_VoiceAgentSingleCommand();

    // Example 5: Multiple commands
    await example5_VoiceAgentMultipleCommands();

    // Example 6: Feedback loop
    await example6_VoiceWithFeedback();

    // Example 7: Approval workflow
    await example7_VoiceAgentWithApproval();

    console.log('\n✅ All examples completed');
  } catch (error) {
    console.error('Error running examples:', error);
  }
})();
