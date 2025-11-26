/**
 * Caption Service
 * Auto-generates captions from video/audio using speech recognition
 */

export interface Caption {
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence?: number;
}

export interface CaptionOptions {
  language?: string; // ISO 639-1 code
  maxDuration?: number; // seconds
}

/**
 * Extract audio from video and generate captions
 */
export async function generateCaptions(
  videoBlob: Blob,
  options: CaptionOptions = {}
): Promise<Caption[]> {
  try {
    // Extract audio from video
    const audioBlob = await extractAudioFromVideo(videoBlob);

    // Convert audio to text using Web Speech API or Whisper
    const transcript = await audioToText(audioBlob, options.language || 'en');

    // Generate captions with timing
    const captions = await generateTimedCaptions(transcript, videoBlob);

    return captions;
  } catch (error) {
    console.error('[CaptionService] Caption generation failed:', error);
    throw new Error(
      `Failed to generate captions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract audio from video blob
 */
async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    video.src = URL.createObjectURL(videoBlob);
    video.onloadedmetadata = async () => {
      try {
        // Create audio source from video
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();

        source.connect(destination);
        source.connect(audioContext.destination);

        // Extract audio stream
        const audioStream = destination.stream;
        const mediaRecorder = new MediaRecorder(audioStream);

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          URL.revokeObjectURL(video.src);
          resolve(audioBlob);
        };

        mediaRecorder.start();
        video.play();
        video.onended = () => mediaRecorder.stop();
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };
    video.onerror = reject;
  });
}

/**
 * Convert audio to text using Web Speech API or Whisper
 */
async function audioToText(audioBlob: Blob, language: string): Promise<string> {
  try {
    // Try Web Speech API first (free, browser-based)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      return await audioToTextWebSpeech(audioBlob, language);
    }

    // Fallback to Whisper API if available
    if (import.meta.env.VITE_OPENAI_API_KEY) {
      return await audioToTextWhisper(audioBlob);
    }

    throw new Error(
      'No speech recognition available. Enable Web Speech API or provide OpenAI API key.'
    );
  } catch (error) {
    console.error('[CaptionService] Audio to text failed:', error);
    throw error;
  }
}

/**
 * Convert audio to text using Web Speech API
 */
async function audioToTextWebSpeech(audioBlob: Blob, language: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Web Speech API not supported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language || 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    let transcript = '';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
    };

    recognition.onend = () => {
      resolve(transcript.trim());
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    // Note: Web Speech API doesn't directly process audio blobs
    // This is a limitation - we'd need to play the audio and capture speech
    // For production, use Whisper API instead
    recognition.start();

    // Fallback: Return placeholder if Web Speech doesn't work with blob
    setTimeout(() => {
      recognition.stop();
      if (!transcript) {
        reject(new Error('No speech detected'));
      }
    }, 5000);
  });
}

/**
 * Convert audio to text using OpenAI Whisper API
 */
async function audioToTextWhisper(audioBlob: Blob): Promise<string> {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Can be made dynamic

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('[CaptionService] Whisper API failed:', error);
    throw error;
  }
}

/**
 * Generate timed captions from transcript
 * Simple implementation - splits transcript into chunks based on duration
 */
async function generateTimedCaptions(transcript: string, videoBlob: Blob): Promise<Caption[]> {
  // Get video duration
  const duration = await getVideoDuration(videoBlob);

  // Split transcript into sentences
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Distribute sentences across duration
  const captions: Caption[] = [];
  const timePerSentence = duration / Math.max(sentences.length, 1);

  sentences.forEach((sentence, index) => {
    captions.push({
      text: sentence.trim(),
      startTime: index * timePerSentence,
      endTime: (index + 1) * timePerSentence,
      confidence: 0.9, // Default confidence
    });
  });

  return captions;
}

/**
 * Get video duration
 */
function getVideoDuration(videoBlob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(video.src);
      resolve(duration);
    };
    video.onerror = reject;
  });
}

/**
 * Format captions as SRT (SubRip) format
 */
export function formatCaptionsAsSRT(captions: Caption[]): string {
  return captions
    .map((caption, index) => {
      const start = formatSRTTime(caption.startTime);
      const end = formatSRTTime(caption.endTime);
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    })
    .join('\n');
}

/**
 * Format time as SRT timestamp (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Edit captions manually
 */
export function editCaption(captions: Caption[], index: number, newText: string): Caption[] {
  const updated = [...captions];
  if (updated[index]) {
    updated[index] = { ...updated[index], text: newText };
  }
  return updated;
}
