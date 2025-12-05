import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioLines, Laptop, Maximize2, Minimize2, MonitorPlay, Pause, Play, PlayCircle, SkipBack, SkipForward, Volume2, VolumeX, X, } from 'lucide-react';
import { Portal } from './common/Portal';
import { ipc } from '../lib/ipc-typed';
import { isDevEnv } from '../lib/env';
const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpg', 'mpeg', 'ogv'];
const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'wav', 'flac', 'ogg', 'opus', 'aiff', 'oga'];
function normalizeFileUrl(filePath) {
    if (!filePath)
        return '';
    if (filePath.startsWith('file://')) {
        return filePath;
    }
    let normalized = filePath.replace(/\\/g, '/');
    if (/^[a-zA-Z]:/.test(normalized)) {
        normalized = `/${normalized}`;
    }
    else if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }
    return encodeURI(`file://${normalized}`);
}
export function getMediaKind(fileName) {
    if (!fileName)
        return null;
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension)
        return null;
    if (VIDEO_EXTENSIONS.includes(extension))
        return 'video';
    if (AUDIO_EXTENSIONS.includes(extension))
        return 'audio';
    return null;
}
export function MediaPlayer({ filePath, fileName, autoPlay = true, onClose }) {
    const mediaKind = useMemo(() => getMediaKind(fileName || filePath), [fileName, filePath]);
    const sourceUrl = useMemo(() => normalizeFileUrl(filePath), [filePath]);
    const mediaRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [pipSupported, setPipSupported] = useState(false);
    useEffect(() => {
        const handler = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);
    useEffect(() => {
        const element = mediaRef.current;
        if (!element)
            return;
        const handleLoaded = () => {
            setDuration(element.duration || 0);
            setVolume(element.volume);
            setMuted(element.muted);
        };
        const handleTime = () => setCurrentTime(element.currentTime || 0);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleVolumeChange = () => {
            setVolume(element.volume);
            setMuted(element.muted);
        };
        element.addEventListener('loadedmetadata', handleLoaded);
        element.addEventListener('timeupdate', handleTime);
        element.addEventListener('play', handlePlay);
        element.addEventListener('pause', handlePause);
        element.addEventListener('volumechange', handleVolumeChange);
        if (autoPlay) {
            const maybePromise = element.play();
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.catch(() => {
                    // Autoplay might be blocked; keep state consistent
                    setIsPlaying(false);
                });
            }
        }
        if (mediaKind === 'video' && typeof document !== 'undefined') {
            setPipSupported(Boolean(document.pictureInPictureEnabled));
        }
        else {
            setPipSupported(false);
        }
        return () => {
            element.removeEventListener('loadedmetadata', handleLoaded);
            element.removeEventListener('timeupdate', handleTime);
            element.removeEventListener('play', handlePlay);
            element.removeEventListener('pause', handlePause);
            element.removeEventListener('volumechange', handleVolumeChange);
            element.pause();
        };
    }, [autoPlay, mediaKind, sourceUrl]);
    const togglePlay = useCallback(() => {
        const element = mediaRef.current;
        if (!element)
            return;
        if (element.paused) {
            const maybePromise = element.play();
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.catch(() => setIsPlaying(false));
            }
        }
        else {
            element.pause();
        }
    }, []);
    const toggleMute = useCallback(() => {
        const element = mediaRef.current;
        if (!element)
            return;
        element.muted = !element.muted;
    }, []);
    const handleVolumeChange = (value) => {
        const element = mediaRef.current;
        if (!element)
            return;
        const nextVolume = Math.min(1, Math.max(0, value));
        element.volume = nextVolume;
        element.muted = nextVolume === 0;
    };
    const handleSeek = (value) => {
        const element = mediaRef.current;
        if (!element || !Number.isFinite(duration) || duration <= 0)
            return;
        element.currentTime = (value / 100) * duration;
        setCurrentTime(element.currentTime);
    };
    const skipBy = (seconds) => {
        const element = mediaRef.current;
        if (!element)
            return;
        element.currentTime = Math.min(Math.max(0, element.currentTime + seconds), duration || element.currentTime);
    };
    const togglePictureInPicture = async () => {
        if (mediaKind !== 'video')
            return;
        const videoElement = mediaRef.current;
        if (!videoElement || typeof videoElement.requestPictureInPicture !== 'function')
            return;
        try {
            const doc = document;
            if (doc.pictureInPictureElement) {
                await doc.exitPictureInPicture?.();
            }
            else {
                await videoElement.requestPictureInPicture();
            }
        }
        catch (error) {
            if (isDevEnv()) {
                console.warn('[MediaPlayer] Failed to request Picture-in-Picture:', error);
            }
        }
    };
    const toggleFullscreen = () => {
        const container = document.getElementById('ob-media-player-container');
        if (!container)
            return;
        const doc = document;
        if (!isFullscreen) {
            container.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => { });
        }
        else {
            doc.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };
    useEffect(() => {
        const handleFsChange = () => {
            const doc = document;
            setIsFullscreen(Boolean(doc.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);
    const openFile = () => {
        if (!filePath)
            return;
        ipc.downloads.openFile(filePath).catch(() => { });
    };
    const showInFolder = () => {
        if (!filePath)
            return;
        ipc.downloads.showInFolder(filePath).catch(() => { });
    };
    const formatTime = (value) => {
        if (!Number.isFinite(value))
            return '0:00';
        const totalSeconds = Math.max(0, Math.round(value));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
    return (_jsx(Portal, { children: _jsx(AnimatePresence, { children: _jsx(motion.div, { className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 py-8", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, children: _jsxs(motion.div, { id: "ob-media-player-container", className: "relative w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-700/60 bg-gray-950/90 shadow-2xl", initial: { y: 40, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 40, opacity: 0 }, transition: { type: 'spring', damping: 22, stiffness: 180 }, onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between border-b border-gray-800/60 bg-gray-900/70 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-100", children: fileName || filePath.split(/[\\/]/).pop() || 'Media file' }), _jsxs("p", { className: "text-xs text-gray-400", children: [mediaKind ? mediaKind.toUpperCase() : 'Unknown', " \u2022 ", formatTime(duration)] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: openFile, className: "rounded-lg border border-gray-700/70 bg-gray-800/70 px-3 py-1.5 text-xs text-gray-200 transition hover:border-blue-500/60 hover:text-blue-300", children: "Open" }), _jsx("button", { onClick: showInFolder, className: "rounded-lg border border-gray-700/70 bg-gray-800/70 px-3 py-1.5 text-xs text-gray-200 transition hover:border-blue-500/60 hover:text-blue-300", children: "Reveal" }), _jsx("button", { onClick: onClose, className: "rounded-lg border border-gray-700/70 bg-gray-800/70 p-1.5 text-gray-300 transition hover:border-red-500/60 hover:text-red-300", children: _jsx(X, { size: 16 }) })] })] }), _jsxs("div", { className: `relative flex flex-col items-center justify-center bg-black ${mediaKind === 'audio' ? 'py-12' : 'py-4'}`, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), children: [mediaKind === 'video' && sourceUrl ? (_jsx("video", { ref: mediaRef, src: sourceUrl, className: "max-h-[60vh] w-full bg-black object-contain", autoPlay: autoPlay, controls: false })) : null, mediaKind === 'audio' && sourceUrl ? (_jsxs("div", { className: "flex w-full flex-col items-center gap-6 px-8", children: [_jsx("div", { className: "mt-4 flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-200", children: _jsx(AudioLines, { size: 64 }) }), _jsx("audio", { ref: mediaRef, src: sourceUrl, autoPlay: autoPlay, controls: false })] })) : null, !mediaKind || !sourceUrl ? (_jsxs("div", { className: "flex h-48 w-full flex-col items-center justify-center gap-3 text-center text-gray-400", children: [_jsx(MonitorPlay, { size: 40, className: "text-gray-600" }), _jsx("p", { className: "text-sm", children: "Unable to load media preview" }), _jsx("p", { className: "text-xs text-gray-500", children: "Unsupported format or missing file reference." })] })) : null, mediaKind && sourceUrl ? (_jsx(motion.div, { className: "absolute bottom-3 left-1/2 z-10 w-[92%] -translate-x-1/2 rounded-xl border border-gray-800/80 bg-gray-900/95 px-4 py-3 shadow-xl backdrop-blur", animate: { opacity: hovered || !isPlaying ? 1 : 0.85 }, children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: togglePlay, className: "flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/90 text-white transition hover:bg-blue-500", children: isPlaying ? _jsx(Pause, { size: 18 }) : _jsx(Play, { size: 18 }) }), _jsxs("div", { className: "flex flex-col gap-1 text-xs text-gray-400", children: [_jsx("span", { className: "font-mono text-sm text-gray-100", children: formatTime(currentTime) }), _jsxs("span", { className: "font-mono text-[11px] text-gray-500", children: [formatTime(duration - currentTime), " remaining"] })] }), _jsx("input", { type: "range", min: 0, max: 100, value: progressPercent, onChange: (event) => handleSeek(Number(event.target.value)), className: "flex-1 accent-blue-500" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => skipBy(-10), className: "rounded-full border border-gray-700/60 p-2 text-gray-300 transition hover:border-blue-500/60 hover:text-blue-300", title: "Back 10 seconds", children: _jsx(SkipBack, { size: 16 }) }), _jsx("button", { onClick: () => skipBy(10), className: "rounded-full border border-gray-700/60 p-2 text-gray-300 transition hover:border-blue-500/60 hover:text-blue-300", title: "Forward 10 seconds", children: _jsx(SkipForward, { size: 16 }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: toggleMute, className: "rounded-full border border-gray-700/60 p-2 text-gray-300 transition hover:border-blue-500/60 hover:text-blue-300", children: muted || volume === 0 ? _jsx(VolumeX, { size: 16 }) : _jsx(Volume2, { size: 16 }) }), _jsx("input", { type: "range", min: 0, max: 100, value: muted ? 0 : Math.round(volume * 100), onChange: (event) => handleVolumeChange(Number(event.target.value) / 100), className: "w-24 accent-blue-500" })] }), pipSupported ? (_jsx("button", { onClick: togglePictureInPicture, className: "rounded-full border border-gray-700/60 p-2 text-gray-300 transition hover:border-blue-500/60 hover:text-blue-300", title: "Toggle picture-in-picture", children: _jsx(PlayCircle, { size: 16 }) })) : null, _jsx("button", { onClick: toggleFullscreen, className: "rounded-full border border-gray-700/60 p-2 text-gray-300 transition hover:border-blue-500/60 hover:text-blue-300", title: isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen', children: isFullscreen ? _jsx(Minimize2, { size: 16 }) : _jsx(Maximize2, { size: 16 }) })] })] }) })) : null] }), _jsxs("div", { className: "flex items-center justify-between border-t border-gray-800/60 bg-gray-900/70 px-4 py-3 text-xs text-gray-400", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Laptop, { size: 14, className: "text-blue-300" }), _jsx("span", { children: "Secure local playback" })] }), _jsx("span", { children: filePath })] })] }) }) }) }));
}
