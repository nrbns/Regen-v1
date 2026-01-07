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
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Extracting content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{content.title || propTitle}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {isPlaying && !isPaused ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Play
              </>
            )}
          </button>
          {isPlaying && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Volume2 className="w-4 h-4" />
            <span>Text-to-Speech</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div
          className="prose prose-invert max-w-none prose-lg prose-slate"
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

