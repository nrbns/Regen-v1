/**
 * Export Button Component
 * One-click export to Notion/Obsidian/Roam
 */

import { useState } from 'react';
import { Download, FileText, Share2, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  content: string; // Markdown content
  parentId?: string; // For Notion
  graphName?: string; // For Roam
}

export function ExportButton({ content, parentId, graphName }: ExportButtonProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const exportTo = async (tool: 'notion' | 'obsidian' | 'roam') => {
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
      } else {
        const data = await response.json();
        const url = data.url || data.pageId;

        if (url) {
          window.open(url, '_blank');
          alert(`✅ Exported to ${tool}!`);
        } else {
          alert(`✅ Exported to ${tool}!`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Export failed');
      console.error('[ExportButton] Export error:', err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => exportTo('notion')}
          disabled={!content || !!exporting}
          className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white transition hover:bg-indigo-600 disabled:opacity-50"
        >
          {exporting === 'notion' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <FileText size={16} />
              Export to Notion
            </>
          )}
        </button>

        <button
          onClick={() => exportTo('obsidian')}
          disabled={!content || !!exporting}
          className="flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-white transition hover:bg-purple-600 disabled:opacity-50"
        >
          {exporting === 'obsidian' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download size={16} />
              Export to Obsidian
            </>
          )}
        </button>

        <button
          onClick={() => exportTo('roam')}
          disabled={!content || !!exporting}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
        >
          {exporting === 'roam' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Share2 size={16} />
              Export to Roam
            </>
          )}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">Error: {error}</div>}
    </div>
  );
}
