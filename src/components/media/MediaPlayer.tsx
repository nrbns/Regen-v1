import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';

interface MediaPlayerProps {
  src: string;
  type: 'audio' | 'video';
  title?: string;
  onDownload?: () => void;
}

export function MediaPlayer({ src, type, title, onDownload }: MediaPlayerProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 space-y-4">
      {title && (
        <h3 className="text-lg font-medium text-slate-200">{title}</h3>
      )}

      {/* Media Element */}
      <div className="bg-slate-900 rounded-lg overflow-hidden">
        {type === 'video' ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={src}
            className="w-full h-auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="p-8 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                <Volume2 className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-400">Audio file loaded</p>
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-400 w-12">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const time = parseFloat(e.target.value);
              if (mediaRef.current) {
                mediaRef.current.currentTime = time;
                setCurrentTime(time);
              }
            }}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-sm text-slate-400 w-12">{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="p-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-200"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}