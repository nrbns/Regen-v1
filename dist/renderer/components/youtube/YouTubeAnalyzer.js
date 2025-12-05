import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
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
        }
        catch (err) {
            setError(err.message || 'Analysis failed');
            console.error('[YouTubeAnalyzer] Error:', err);
        }
        finally {
            setAnalyzing(false);
        }
    };
    const generateResponseVideo = async () => {
        if (!url || !result)
            return;
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
            setResult(prev => ({
                ...prev,
                response_video_url: data.response_video_url,
                script: data.script,
            }));
        }
        catch (err) {
            setError(err.message || 'Video generation failed');
            console.error('[YouTubeAnalyzer] Video error:', err);
        }
        finally {
            setGeneratingVideo(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-4 p-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Youtube, { size: 24, className: "text-red-500" }), _jsx("h2", { className: "text-xl font-semibold", children: "YouTube Deep Analysis" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "Paste YouTube URL here...", className: "flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none" }), _jsx("button", { onClick: analyzeYouTube, disabled: !url || analyzing, className: "flex items-center gap-2 rounded-lg bg-red-500 px-6 py-2 text-white transition hover:bg-red-600 disabled:opacity-50", children: analyzing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Analyzing..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileText, { size: 16 }), "Analyze Video"] })) })] }), error && (_jsxs("div", { className: "rounded-lg bg-red-50 p-3 text-sm text-red-700", children: ["Error: ", error] })), result && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "rounded-lg border border-gray-200 bg-gray-50 p-4", children: [_jsx("h3", { className: "mb-2 font-semibold text-gray-900", children: result.title }), _jsxs("div", { className: "text-sm text-gray-600", children: ["Duration: ", Math.floor(result.duration / 60), ":", (result.duration % 60).toString().padStart(2, '0'), " \u2022 Transcript: ", result.transcript_length, " characters"] }), result.thumbnail && (_jsx("img", { src: result.thumbnail, alt: result.title, className: "mt-2 max-w-xs rounded" }))] }), _jsxs("div", { className: "rounded-lg border border-gray-200 bg-white p-4", children: [_jsxs("h3", { className: "mb-3 flex items-center gap-2 font-semibold text-gray-900", children: [_jsx(FileText, { size: 18 }), "Deep Research Report"] }), _jsx("div", { className: "prose max-w-none text-gray-700", dangerouslySetInnerHTML: {
                                    __html: result.research_report
                                        .replace(/\n/g, '<br>')
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                        .replace(/^\d+\.\s/gm, '<strong>$&</strong>'),
                                } })] }), result.ready_for_video && (_jsxs("div", { className: "rounded-lg border border-indigo-200 bg-indigo-50 p-4", children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsxs("h3", { className: "flex items-center gap-2 font-semibold text-indigo-900", children: [_jsx(Video, { size: 18 }), "Response Video"] }), !result.response_video_url && (_jsx("button", { onClick: generateResponseVideo, disabled: generatingVideo, className: "flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white transition hover:bg-indigo-600 disabled:opacity-50", children: generatingVideo ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Generating..."] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 16 }), "Generate 60s Response Video"] })) }))] }), result.response_video_url && (_jsxs("div", { className: "mt-3", children: [_jsx("video", { src: result.response_video_url, controls: true, className: "w-full rounded", style: { maxHeight: '400px' }, children: "Your browser does not support the video tag." }), _jsx("a", { href: result.response_video_url, target: "_blank", rel: "noopener noreferrer", className: "mt-2 block text-sm text-indigo-600 hover:underline", children: "Open in new tab \u2192" })] })), result.script && (_jsxs("div", { className: "mt-3 rounded bg-white p-3 text-sm", children: [_jsx("div", { className: "font-medium text-gray-700", children: "Script:" }), _jsx("div", { className: "mt-1 text-gray-600", children: result.script })] }))] }))] }))] }));
}
