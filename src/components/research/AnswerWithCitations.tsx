/**
 * AnswerWithCitations - Displays research summary with inline citations
 */

import { useMemo, useState } from 'react';
import { ExternalLink, FileText, Download } from 'lucide-react';
import type { ResearchInlineEvidence, ResearchCitation, ResearchSource } from '../../types/research';
import { motion } from 'framer-motion';
import { ipc } from '../../lib/ipc-typed';

interface AnswerWithCitationsProps {
  summary: string;
  citations: ResearchCitation[];
  inlineEvidence?: ResearchInlineEvidence[];
  sources: ResearchSource[];
  activeSourceId: string | null;
  onActivate: (sourceKey: string) => void;
  onOpenSource: (url: string) => void;
  onExport?: (format: 'markdown' | 'pdf') => void;
}

export function AnswerWithCitations({
  summary,
  citations,
  inlineEvidence = [],
  sources,
  activeSourceId,
  onActivate,
  onOpenSource,
  onExport,
}: AnswerWithCitationsProps) {
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const [exporting, setExporting] = useState<'markdown' | 'pdf' | null>(null);

  // Build text with inline citations
  const renderedText = useMemo(() => {
    if (!inlineEvidence || inlineEvidence.length === 0) {
      // Fallback: render summary with citation markers
      return summary.split(/(\[(\d+)\])/g).map((part, idx) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const citationIndex = parseInt(match[1], 10);
          const citation = citations.find(c => c.index === citationIndex);
          if (citation) {
            const source = sources[citation.sourceIndex];
            const sourceKey = source?.url ?? `source-${citation.sourceIndex}`;
            return (
              <CitationMarker
                key={`citation-${citationIndex}-${idx}`}
                index={citationIndex}
                source={source}
                sourceKey={sourceKey}
                isActive={activeSourceId === sourceKey}
                isHovered={hoveredCitation === citationIndex}
                onHover={setHoveredCitation}
                onActivate={onActivate}
                onOpenSource={onOpenSource}
              />
            );
          }
        }
        return <span key={`text-${idx}`}>{part}</span>;
      });
    }

    // Use inline evidence for precise citation placement
    const parts: Array<{ text: string; citation?: number; sourceIndex?: number }> = [];
    let lastPos = 0;

    // Sort inline evidence by position
    const sortedEvidence = [...inlineEvidence].sort((a, b) => a.from - b.from);

    sortedEvidence.forEach((evidence) => {
      if (evidence.from > lastPos) {
        parts.push({ text: summary.slice(lastPos, evidence.from) });
      }
      parts.push({
        text: summary.slice(evidence.from, evidence.to),
        citation: evidence.citationIndex,
        sourceIndex: evidence.sourceIndex,
      });
      lastPos = evidence.to;
    });

    if (lastPos < summary.length) {
      parts.push({ text: summary.slice(lastPos) });
    }

    return parts.map((part, idx) => {
      if (part.citation !== undefined && part.sourceIndex !== undefined) {
        // const citation = citations.find(c => c.index === part.citation); // Unused for now
        const source = sources[part.sourceIndex];
        const sourceKey = source?.url ?? `source-${part.sourceIndex}`;
        return (
          <span key={`part-${idx}`}>
            <CitationMarker
              index={part.citation}
              source={source}
              sourceKey={sourceKey}
              isActive={activeSourceId === sourceKey}
              isHovered={hoveredCitation === part.citation}
              onHover={setHoveredCitation}
              onActivate={onActivate}
              onOpenSource={onOpenSource}
            />
            {part.text}
          </span>
        );
      }
      return <span key={`text-${idx}`}>{part.text}</span>;
    });
  }, [summary, citations, inlineEvidence, sources, activeSourceId, hoveredCitation, onActivate, onOpenSource]);

  const handleExport = async (format: 'markdown' | 'pdf') => {
    setExporting(format);
    try {
      if (onExport) {
        await onExport(format);
      } else {
        // Default export implementation
        const _exportData = {
          query: '',
          summary,
          citations: citations.map(c => ({
            index: c.index,
            source: sources[c.sourceIndex],
            quote: c.quote,
            confidence: c.confidence,
          })),
          sources: sources.map(s => ({
            title: s.title,
            url: s.url,
            domain: s.domain,
          })),
        };

        if (format === 'markdown') {
          let markdown = `# Research Summary\n\n`;
          markdown += `${summary}\n\n`;
          markdown += `## Citations\n\n`;
          citations.forEach(c => {
            const source = sources[c.sourceIndex];
            markdown += `[${c.index}] ${source?.title || 'Unknown'} (${source?.url || ''})\n`;
            markdown += `  Confidence: ${(c.confidence * 100).toFixed(0)}%\n`;
            if (c.quote) {
              markdown += `  Quote: "${c.quote}"\n`;
            }
            markdown += `\n`;
          });
          markdown += `## Sources\n\n`;
          sources.forEach((s, idx) => {
            markdown += `${idx + 1}. [${s.title}](${s.url}) - ${s.domain}\n`;
          });

          const blob = new Blob([markdown], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `research-${Date.now()}.md`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // PDF export would require a library like jsPDF or IPC call
          await ipc.research.export({
            format: 'markdown', // Fallback to markdown for now
            sources: sources.map(s => s.url),
            includeNotes: true,
          });
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">
          {renderedText}
        </p>
        {onExport && (
          <div className="flex items-center gap-2 ml-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleExport('markdown')}
              disabled={exporting !== null}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Export as Markdown"
            >
              <FileText size={16} className={exporting === 'markdown' ? 'animate-pulse' : ''} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Export as PDF"
            >
              <Download size={16} className={exporting === 'pdf' ? 'animate-pulse' : ''} />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CitationMarkerProps {
  index: number;
  source: ResearchSource | undefined;
  sourceKey: string;
  isActive: boolean;
  isHovered: boolean;
  onHover: (index: number | null) => void;
  onActivate: (sourceKey: string) => void;
  onOpenSource: (url: string) => void;
}

function CitationMarker({
  index,
  source,
  sourceKey,
  isActive,
  isHovered,
  onHover,
  onActivate,
  onOpenSource,
}: CitationMarkerProps) {
  return (
    <motion.sup
      className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all ${
        isActive
          ? 'bg-blue-500/30 text-blue-200 border border-blue-400/50'
          : isHovered
          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
          : 'bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15'
      }`}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onActivate(sourceKey);
        if (source?.url) {
          onOpenSource(source.url);
        }
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={source ? `${source.title} - ${source.domain}` : `Citation ${index}`}
    >
      [{index}]
      {isHovered && source && (
        <ExternalLink size={10} className="opacity-70" />
      )}
    </motion.sup>
  );
}

