/**
 * Clip Recorder Component
 * AI-powered screen recording with auto-captions and watermark
 */

import { useState, useRef, useCallback } from 'react';
import {
  Video,
  Square,
  Download,
  Edit3,
  Loader2,
  X,
  Instagram,
  Twitter,
  Music,
} from 'lucide-react';
import { generateCaptions, type Caption, editCaption } from '../../services/captionService';
import { exportVideo, downloadVideo, shareVideo } from '../../utils/videoExport';
import { useLanguageState } from '../../state/languageState';
import toast from 'react-hot-toast';

const MAX_RECORDING_DURATION = 8; // seconds

export function ClipRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [editingCaptionIndex, setEditingCaptionIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const detectedLanguage = useLanguageState(state => state.detectedLanguage || 'en');

  const startRecording = useCallback(async () => {
    try {
      toast.loading('Starting recording...');

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      } as any);

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Generate captions
        setProcessing(true);
        try {
          toast.loading('Generating captions...');
          const generatedCaptions = await generateCaptions(blob, {
            language: detectedLanguage,
            maxDuration: MAX_RECORDING_DURATION,
          });
          setCaptions(generatedCaptions);
          toast.dismiss();
          toast.success('Captions generated!');
        } catch (error) {
          console.error('[ClipRecorder] Caption generation failed:', error);
          toast.dismiss();
          toast.error('Failed to generate captions');
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Update duration
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingDuration(elapsed);

        // Auto-stop at max duration
        if (elapsed >= MAX_RECORDING_DURATION) {
          stopRecording();
        }
      }, 100);

      toast.dismiss();
      toast.success('Recording started!');
    } catch (error) {
      console.error('[ClipRecorder] Recording failed:', error);
      toast.dismiss();
      toast.error('Failed to start recording. Please grant screen capture permissions.');
    }
  }, [detectedLanguage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const handleExport = useCallback(async () => {
    if (!recordedBlob) return;

    setProcessing(true);
    try {
      toast.loading('Processing video with watermark and captions...');
      const exportedBlob = await exportVideo(recordedBlob, {
        aspectRatio: '9:16',
        maxDuration: MAX_RECORDING_DURATION,
        quality: 'high',
        watermark: true,
        captions: captions,
      });

      await downloadVideo(exportedBlob, `regen-clip-${Date.now()}.webm`);
      toast.dismiss();
      toast.success('Video exported successfully!');
    } catch (error) {
      console.error('[ClipRecorder] Export failed:', error);
      toast.dismiss();
      toast.error('Failed to export video');
    } finally {
      setProcessing(false);
    }
  }, [recordedBlob, captions]);

  const handleShare = useCallback(
    async (platform: 'instagram' | 'tiktok' | 'twitter' | 'generic') => {
      if (!recordedBlob) return;

      setProcessing(true);
      try {
        toast.loading('Preparing video for sharing...');
        const exportedBlob = await exportVideo(recordedBlob, {
          aspectRatio: '9:16',
          maxDuration: MAX_RECORDING_DURATION,
          quality: 'high',
          watermark: true,
          captions: captions,
        });

        await shareVideo(exportedBlob, platform);
        toast.dismiss();
        toast.success(`Video ready for ${platform}!`);
      } catch (error: any) {
        console.error('[ClipRecorder] Share failed:', error);
        toast.dismiss();
        if (error.message?.includes('manually')) {
          toast.success(error.message);
        } else {
          toast.error('Failed to prepare video for sharing');
        }
      } finally {
        setProcessing(false);
      }
    },
    [recordedBlob, captions]
  );

  const handleEditCaption = useCallback((index: number, newText: string) => {
    setCaptions(prev => editCaption(prev, index, newText));
    setEditingCaptionIndex(null);
  }, []);

  const handleReset = useCallback(() => {
    setRecordedBlob(null);
    setCaptions([]);
    setPreviewUrl(null);
    setEditingCaptionIndex(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Video className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">AI Clip Recorder</h1>
          </div>
          <p className="text-slate-400">
            Record 8-second clips with auto-captions, watermark, and one-tap share to Reels/X
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recording & Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recording Control */}
            {!recordedBlob ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-center">
                <div className="mb-6">
                  <div
                    className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 ${
                      isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-slate-800'
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-12 h-12 text-red-500" />
                    ) : (
                      <Video className="w-12 h-12 text-blue-400" />
                    )}
                  </div>
                  {isRecording && (
                    <div className="text-2xl font-bold text-red-500 mb-2">
                      {MAX_RECORDING_DURATION - Math.floor(recordingDuration)}s
                    </div>
                  )}
                </div>

                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold flex items-center justify-center gap-2 mx-auto"
                  >
                    <Video size={20} />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-8 py-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2 mx-auto"
                  >
                    <Square size={20} />
                    Stop Recording
                  </button>
                )}

                <p className="text-sm text-slate-400 mt-4">
                  {isRecording
                    ? 'Recording your screen... Click stop when done.'
                    : 'Record up to 8 seconds of your screen with audio'}
                </p>
              </div>
            ) : (
              <>
                {/* Preview */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white">Preview</h3>
                    <button
                      onClick={handleReset}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {previewUrl && (
                    <video
                      src={previewUrl}
                      controls
                      className="w-full rounded-lg bg-black"
                      style={{ maxHeight: '400px' }}
                    />
                  )}
                </div>

                {/* Captions */}
                {captions.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white">Captions</h3>
                      <span className="text-xs text-slate-400">{captions.length} captions</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {captions.map((caption, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-slate-800 border border-slate-700"
                        >
                          {editingCaptionIndex === index ? (
                            <input
                              type="text"
                              defaultValue={caption.text}
                              onBlur={e => handleEditCaption(index, e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleEditCaption(index, e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                  setEditingCaptionIndex(null);
                                }
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="flex items-start justify-between gap-2 cursor-pointer group"
                              onClick={() => setEditingCaptionIndex(index)}
                            >
                              <p className="text-sm text-slate-200 flex-1">{caption.text}</p>
                              <Edit3
                                size={14}
                                className="text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"
                              />
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-1">
                            {Math.floor(caption.startTime)}s - {Math.floor(caption.endTime)}s
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export & Share */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="font-semibold text-white mb-4">Export & Share</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleExport}
                      disabled={processing}
                      className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Download
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleShare('instagram')}
                      disabled={processing}
                      className="px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                    >
                      <Instagram size={16} />
                      Reels
                    </button>

                    <button
                      onClick={() => handleShare('tiktok')}
                      disabled={processing}
                      className="px-4 py-3 rounded-lg bg-black hover:bg-slate-900 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                    >
                      <Music size={16} />
                      TikTok
                    </button>

                    <button
                      onClick={() => handleShare('twitter')}
                      disabled={processing}
                      className="px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
                    >
                      <Twitter size={16} />X
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Features Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold text-white mb-3">Features</h3>
              <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                <li>8-second screen recording</li>
                <li>Auto-generated captions</li>
                <li>Watermark overlay</li>
                <li>Optimized for Reels/X</li>
                <li>One-tap share</li>
                <li>Edit captions</li>
              </ul>
            </div>

            {/* Tips Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="font-semibold text-white mb-3">Tips</h3>
              <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                <li>Record the most engaging 8 seconds</li>
                <li>Ensure clear audio for better captions</li>
                <li>Edit captions for accuracy</li>
                <li>Watermark helps with attribution</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
