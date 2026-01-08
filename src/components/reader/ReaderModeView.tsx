/**
 * SPRINT 2: Enhanced Reader Mode View
 * Low-data text-only format with TTS support
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Volume2, BookOpen, Clock } from 'lucide-react';
import { extractReaderContent, type ReaderContent } from '../../services/reader/readerFirstEngine';
import { getReaderTTS as getTTS } from '../../services/reader/readerFirstEngine';

interface ReaderModeViewProps {
  html: string;
  url?: string;
  title?: string;
}

export function ReaderModeView({ html, url, title: propTitle }: ReaderModeViewProps) {
  const [content, setContent] = useState<ReaderContent | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [tts] = useState(() => getTTS());

  useEffect(() => {
    const extracted = extractReaderContent(html, url);
    setContent(extracted);
  }, [html, url]);

  const handlePlay = () => {
    if (!content) return;

    if (isPaused) {
      tts.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      tts.speak(content.text, {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        onEnd: () => {
          setIsPlaying(false);
          setIsPaused(false);
        },
      });
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    tts.pause();
    setIsPaused(true);
  };

  const handleStop = () => {
    tts.stop();
    setIsPlaying(false);
    setIsPaused(false);
  };

  if (!content) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>Extracting content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold">{content.title || propTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{content.readingTime} min read</span>
              </div>
              <div>{content.wordCount.toLocaleString()} words</div>
            </div>
          </div>
        </div>

        {/* TTS Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPlaying && !isPaused ? handlePause : handlePlay}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {isPlaying && !isPaused ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Play
              </>
            )}
          </button>
          {isPlaying && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-600"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Volume2 className="h-4 w-4" />
            <span>Text-to-Speech</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div
          className="prose prose-invert prose-lg prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: content.html }}
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            lineHeight: 1.8,
            color: '#e5e7eb',
          }}
        />
      </div>
    </div>
  );
}
