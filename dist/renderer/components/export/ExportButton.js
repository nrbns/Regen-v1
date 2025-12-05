import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Export Button Component
 * One-click export to Notion/Obsidian/Roam
 */
import { useState } from 'react';
import { Download, FileText, Share2, Loader2 } from 'lucide-react';
export function ExportButton({ content, parentId, graphName }) {
    const [exporting, setExporting] = useState(null);
    const [error, setError] = useState(null);
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    const exportTo = async (tool) => {
        setExporting(tool);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/api/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content_md: content,
                    tool,
                    parent_id: parentId,
                    graph_name: graphName,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Export failed: ${response.statusText}`);
            }
            if (tool === 'obsidian') {
                // Download file
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `regen_export_${Date.now()}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('✅ Exported to Obsidian! Download the file and drop it in your vault.');
            }
            else {
                const data = await response.json();
                const url = data.url || data.pageId;
                if (url) {
                    window.open(url, '_blank');
                    alert(`✅ Exported to ${tool}!`);
                }
                else {
                    alert(`✅ Exported to ${tool}!`);
                }
            }
        }
        catch (err) {
            setError(err.message || 'Export failed');
            console.error('[ExportButton] Export error:', err);
        }
        finally {
            setExporting(null);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => exportTo('notion'), disabled: !content || !!exporting, className: "flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white transition hover:bg-indigo-600 disabled:opacity-50", children: exporting === 'notion' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Exporting..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileText, { size: 16 }), "Export to Notion"] })) }), _jsx("button", { onClick: () => exportTo('obsidian'), disabled: !content || !!exporting, className: "flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-white transition hover:bg-purple-600 disabled:opacity-50", children: exporting === 'obsidian' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Exporting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { size: 16 }), "Export to Obsidian"] })) }), _jsx("button", { onClick: () => exportTo('roam'), disabled: !content || !!exporting, className: "flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50", children: exporting === 'roam' ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), "Exporting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Share2, { size: 16 }), "Export to Roam"] })) })] }), error && (_jsxs("div", { className: "rounded-lg bg-red-50 p-2 text-sm text-red-700", children: ["Error: ", error] }))] }));
}
