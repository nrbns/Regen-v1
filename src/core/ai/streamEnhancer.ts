/**
 * Stream Enhancer
 * Converts token-based streaming to character-by-character streaming
 * for smoother UI updates and better perceived performance
 */

export interface StreamEvent {
  type: 'token' | 'done' | 'error';
  data?: string | any;
}

export type StreamHandler = (event: StreamEvent) => void;

/**
 * Enhance a stream handler to emit character-by-character updates
 * This provides smoother UI updates compared to token-by-token streaming
 */
export function createCharByCharStream(
  onChar: (char: string, accumulated: string) => void,
  onComplete?: (fullText: string) => void,
  onError?: (error: string) => void
): StreamHandler {
  let accumulatedText = '';
  let _charIndex = 0;
  let charQueue: string[] = [];
  let isProcessing = false;
  let animationFrameId: number | null = null;

  // Process characters with a slight delay for smooth animation
  const processCharQueue = () => {
    if (charQueue.length === 0) {
      isProcessing = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      return;
    }

    // Emit a few characters per frame for smooth streaming
    const charsPerFrame = 3; // Adjust for speed (higher = faster)
    for (let i = 0; i < charsPerFrame && charQueue.length > 0; i++) {
      const char = charQueue.shift();
      if (char) {
        accumulatedText += char;
        onChar(char, accumulatedText);
      }
    }

    if (charQueue.length > 0) {
      animationFrameId = requestAnimationFrame(processCharQueue);
    } else {
      isProcessing = false;
      animationFrameId = null;
    }
  };

  return (event: StreamEvent) => {
    if (event.type === 'token' && typeof event.data === 'string') {
      // Add all characters from the token to the queue
      const token = event.data;
      for (const char of token) {
        charQueue.push(char);
      }

      // Start processing if not already processing
      if (!isProcessing) {
        isProcessing = true;
        animationFrameId = requestAnimationFrame(processCharQueue);
      }
    } else if (event.type === 'done') {
      // Flush remaining characters
      while (charQueue.length > 0) {
        const char = charQueue.shift();
        if (char) {
          accumulatedText += char;
          onChar(char, accumulatedText);
        }
      }

      // If done event has full text, use it
      if (event.data && typeof event.data === 'object' && event.data.text) {
        accumulatedText = event.data.text;
      }

      if (onComplete) {
        onComplete(accumulatedText);
      }
    } else if (event.type === 'error') {
      if (onError) {
        onError(typeof event.data === 'string' ? event.data : 'An error occurred');
      }
    }
  };
}

/**
 * Fast character-by-character stream (no animation delay)
 * Use this for faster perceived performance
 */
export function createFastCharStream(
  onChar: (char: string, accumulated: string) => void,
  onComplete?: (fullText: string) => void,
  onError?: (error: string) => void
): StreamHandler {
  let accumulatedText = '';

  return (event: StreamEvent) => {
    if (event.type === 'token' && typeof event.data === 'string') {
      const token = event.data;
      for (const char of token) {
        accumulatedText += char;
        onChar(char, accumulatedText);
      }
    } else if (event.type === 'done') {
      // If done event has full text, use it
      if (event.data) {
        if (typeof event.data === 'object' && event.data.text) {
          accumulatedText = event.data.text;
        } else if (typeof event.data === 'string') {
          accumulatedText = event.data;
        }
      }

      if (onComplete) {
        onComplete(accumulatedText);
      }
    } else if (event.type === 'error') {
      if (onError) {
        onError(typeof event.data === 'string' ? event.data : 'An error occurred');
      }
    }
  };
}

