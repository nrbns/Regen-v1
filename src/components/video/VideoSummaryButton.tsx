/**
 * Video Summary Button Component
 * Generate 60-second video summary
 */

import { useState } from 'react';
import { Video, Loader2, Play } from 'lucide-react';

interface VideoSummaryButtonProps {
  text: string;
  voiceId?: string;
}

export function VideoSummaryButton({ text, voiceId }: VideoSummaryButtonProps) {
  const [generating, setGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const generateVideo = async () => {
    if (!text) {
      setError('No text provided');
      return;
    }

    setGenerating(true);
    setError(null);
    setVideoUrl(null);

    try {
      const response = await fetch(`${API_BASE}/api/video/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Video generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setVideoUrl(data.video_url);
    } catch (err: any) {
      setError(err.message || 'Video generation failed');
      console.error('[VideoSummary] Error:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={generateVideo}
        disabled={!text || generating}
        className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600 disabled:opacity-50"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Video...
          </>
        ) : (
          <>
            <Video size={16} />
            Generate 60s Video Summary
          </>
        )}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
          Error: {error}
        </div>
      )}

      {videoUrl && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Play size={16} />
            Video Ready
          </div>
          <video
            src={videoUrl}
            controls
            className="w-full rounded"
            style={{ maxHeight: '400px' }}
          >
            Your browser does not support the video tag.
          </video>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-sm text-indigo-600 hover:underline"
          >
            Open in new tab →
          </a>
        </div>
      )}
    </div>
  );
}








