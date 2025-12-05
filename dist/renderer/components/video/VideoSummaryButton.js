import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Video Summary Button Component
 * Generate 60-second video summary
 */
import { useState } from 'react';
import { Video, Loader2, Play } from 'lucide-react';
export function VideoSummaryButton({ text, voiceId }) {
    const [generating, setGenerating] = useState(false);
    const [videoUrl, setVideoUrl] = useState(null);
    const [error, setError] = useState(null);
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
        }
        catch (err) {
            setError(err.message || 'Video generation failed');
            console.error('[VideoSummary] Error:', err);
        }
        finally {
            setGenerating(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx("button", { onClick: generateVideo, disabled: !text || generating, className: "flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition hover:bg-red-600 disabled:opacity-50", children: generating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Generating Video..."] })) : (_jsxs(_Fragment, { children: [_jsx(Video, { size: 16 }), "Generate 60s Video Summary"] })) }), error && (_jsxs("div", { className: "rounded-lg bg-red-50 p-2 text-sm text-red-700", children: ["Error: ", error] })), videoUrl && (_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-medium text-gray-700", children: [_jsx(Play, { size: 16 }), "Video Ready"] }), _jsx("video", { src: videoUrl, controls: true, className: "w-full rounded", style: { maxHeight: '400px' }, children: "Your browser does not support the video tag." }), _jsx("a", { href: videoUrl, target: "_blank", rel: "noopener noreferrer", className: "mt-2 block text-sm text-indigo-600 hover:underline", children: "Open in new tab \u2192" })] }))] }));
}
