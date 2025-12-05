import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export default function VideoPage() {
    const [url, setUrl] = useState('');
    const [log, setLog] = useState('');
    useEffect(() => {
        const onProg = (_e, line) => setLog(prev => prev + line);
        window.api?.video?.onProgress?.(onProg);
        return () => { };
    }, []);
    return (_jsxs("div", { className: "p-4 space-y-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Video Download" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { className: "flex-1 bg-neutral-800 rounded px-2 py-1 text-sm", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "Paste video URL (You must have rights)" }), _jsx("button", { className: "bg-indigo-600 text-white px-3 py-1 rounded", onClick: async () => { const ok = await window.api?.video?.start?.({ url }); if (!ok?.ok)
                            alert(ok?.error || 'Error'); }, children: "Start" })] }), _jsx("pre", { className: "text-xs bg-neutral-900 p-2 rounded h-64 overflow-auto", children: log || 'Waiting…' })] }));
}
