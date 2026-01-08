/**
 * YouTube Analyzer Component
 * Full video → instant deep research report → response video
 */

import { useState } from 'react';
import { Youtube, Loader2, Video, FileText, Play } from 'lucide-react';

export function YouTubeAnalyzer() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const analyzeYouTube = async () => {
    if (!url) {
      setError('Please enter a YouTube URL');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/youtube/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      console.error('[YouTubeAnalyzer] Error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateResponseVideo = async () => {
    if (!url || !result) return;

    setGeneratingVideo(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/youtube/to-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtube_url: url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Video generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult((prev: any) => ({
        ...prev,
        response_video_url: data.response_video_url,
        script: data.script,
      }));
    } catch (err: any) {
      setError(err.message || 'Video generation failed');
      console.error('[YouTubeAnalyzer] Video error:', err);
    } finally {
      setGeneratingVideo(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Youtube size={24} className="text-red-500" />
        <h2 className="text-xl font-semibold">YouTube Deep Analysis</h2>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Paste YouTube URL here..."
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={analyzeYouTube}
          disabled={!url || analyzing}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-2 text-white transition hover:bg-red-600 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FileText size={16} />
              Analyze Video
            </>
          )}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Error: {error}</div>}

      {result && (
        <div className="space-y-4">
          {/* Video Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">{result.title}</h3>
            <div className="text-sm text-gray-600">
              Duration: {Math.floor(result.duration / 60)}:
              {(result.duration % 60).toString().padStart(2, '0')} • Transcript:{' '}
              {result.transcript_length} characters
            </div>
            {result.thumbnail && (
              <img src={result.thumbnail} alt={result.title} className="mt-2 max-w-xs rounded" />
            )}
          </div>

          {/* Research Report */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
              <FileText size={18} />
              Deep Research Report
            </h3>
            <div
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{
                __html: result.research_report
                  .replace(/\n/g, '<br>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^\d+\.\s/gm, '<strong>$&</strong>'),
              }}
            />
          </div>

          {/* Response Video */}
          {result.ready_for_video && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold text-indigo-900">
                  <Video size={18} />
                  Response Video
                </h3>
                {!result.response_video_url && (
                  <button
                    onClick={generateResponseVideo}
                    disabled={generatingVideo}
                    className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white transition hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {generatingVideo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Generate 60s Response Video
                      </>
                    )}
                  </button>
                )}
              </div>

              {result.response_video_url && (
                <div className="mt-3">
                  <video
                    src={result.response_video_url}
                    controls
                    className="w-full rounded"
                    style={{ maxHeight: '400px' }}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <a
                    href={result.response_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-sm text-indigo-600 hover:underline"
                  >
                    Open in new tab →
                  </a>
                </div>
              )}

              {result.script && (
                <div className="mt-3 rounded bg-white p-3 text-sm">
                  <div className="font-medium text-gray-700">Script:</div>
                  <div className="mt-1 text-gray-600">{result.script}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
