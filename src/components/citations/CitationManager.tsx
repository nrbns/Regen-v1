/**
 * Citation Manager UI - Track and export citations
 */

import { useState, useEffect } from 'react';
import { FileText, Download, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { CitationTracker, Citation } from '../../core/citations/CitationTracker';
import { SessionWorkspace } from '../../core/workspace/SessionWorkspace';
import { toast } from '../../utils/toast';

export function CitationManager({ sessionId }: { sessionId: string }) {
  const [citations, setCitations] = useState<Citation[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<'apa' | 'mla' | 'chicago' | 'ieee'>('apa');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadCitations();
  }, [sessionId]);

  const loadCitations = () => {
    const loaded = CitationTracker.getCitations(sessionId);
    setCitations(loaded);
  };

  const addCitation = async () => {
    const url = prompt('URL:');
    if (!url) return;

    const title = prompt('Title:') || 'Untitled';
    const author = prompt('Author (optional):') || undefined;
    const date = prompt('Date (optional):') || undefined;

    try {
      const citation = CitationTracker.addCitation(sessionId, {
        url,
        title,
        author,
        date,
        type: 'web',
        metadata: {
          domain: new URL(url).hostname,
        },
      });

      // Calculate credibility
      const credibility = await CitationTracker.calculateCredibility(citation);
      citation.credibility = {
        score: credibility,
        factors: [],
      };

      loadCitations();
      toast.success('Citation added');
    } catch (error) {
      toast.error('Failed to add citation');
    }
  };

  const deleteCitation = (citationId: string) => {
    if (!confirm('Delete this citation?')) return;

    const session = SessionWorkspace.getSession(sessionId);
    if (!session) return;

    if (session.metadata.sources) {
      (session.metadata.sources as Citation[]) = (session.metadata.sources as Citation[]).filter(
        c => c.id !== citationId
      );
      SessionWorkspace.saveSession(session);
      loadCitations();
      toast.success('Citation deleted');
    }
  };

  const exportCitations = (format: 'bibtex' | 'json' | 'formatted') => {
    if (citations.length === 0) {
      toast.error('No citations to export');
      return;
    }

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'bibtex') {
      content = CitationTracker.exportToBibTeX(citations);
      filename = 'citations.bib';
      mimeType = 'text/plain';
    } else if (format === 'json') {
      content = CitationTracker.exportToJSON(citations);
      filename = 'citations.json';
      mimeType = 'application/json';
    } else {
      // Formatted (selected format)
      content = citations
        .map((cite, index) => `${index + 1}. ${CitationTracker.generateCitation(cite, selectedFormat)}`)
        .join('\n\n');
      filename = `citations_${selectedFormat}.txt`;
      mimeType = 'text/plain';
    }

    // Download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Citations exported');
  };

  const getCredibilityColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCredibilityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Citations ({citations.length})
          </h2>
          <button
            onClick={addCitation}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Export Options */}
        <div className="flex items-center gap-2">
          <select
            value={selectedFormat}
            onChange={e => setSelectedFormat(e.target.value as any)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-1"
          >
            <option value="apa">APA</option>
            <option value="mla">MLA</option>
            <option value="chicago">Chicago</option>
            <option value="ieee">IEEE</option>
          </select>
          <button
            onClick={() => exportCitations('formatted')}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Export {selectedFormat.toUpperCase()}
          </button>
          <button
            onClick={() => exportCitations('bibtex')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            BibTeX
          </button>
          <button
            onClick={() => exportCitations('json')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto p-4">
        {citations.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No citations yet</p>
            <p className="text-xs mt-2">Add citations to track sources</p>
          </div>
        ) : (
          <div className="space-y-3">
            {citations.map((citation, index) => (
              <div key={citation.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white">{citation.title}</h3>
                      {citation.credibility && (
                        <div className={`flex items-center gap-1 ${getCredibilityColor(citation.credibility.score)}`}>
                          {getCredibilityIcon(citation.credibility.score)}
                          <span className="text-xs">{citation.credibility.score}/100</span>
                        </div>
                      )}
                    </div>
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline block mb-2"
                    >
                      {citation.url}
                    </a>
                    {citation.author && (
                      <p className="text-xs text-gray-400">Author: {citation.author}</p>
                    )}
                    {citation.date && (
                      <p className="text-xs text-gray-400">Date: {citation.date}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteCitation(citation.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Generated Citation */}
                <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">{selectedFormat.toUpperCase()} Format:</p>
                  <p className="text-xs text-gray-300 font-mono">
                    {CitationTracker.generateCitation(citation, selectedFormat)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

