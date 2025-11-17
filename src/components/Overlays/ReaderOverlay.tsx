import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Loader2,
  Sparkles,
  Download,
  RefreshCcw,
  X,
  ExternalLink,
  Quote,
  AlertTriangle,
} from 'lucide-react';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';

type SummaryBullet = {
  summary: string;
  citation?: {
    text: string;
    url?: string;
  };
};

interface ReaderOverlayProps {
  active: boolean;
  onClose: () => void;
  tabId?: string | null;
  url?: string | null;
}

interface ArticleState {
  title: string;
  html: string;
  content: string;
  url?: string;
}

export function ReaderOverlay({ active, onClose, tabId, url }: ReaderOverlayProps) {
  const [article, setArticle] = useState<ArticleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryBullet[]>([]);
  const [summaryMode, setSummaryMode] = useState<'local' | 'cloud' | 'extractive' | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const tabsStore = useTabsStore();
  const activeTab = useMemo(
    () => tabsStore.tabs.find((t) => t.id === tabId),
    [tabsStore.tabs, tabId],
  );

  useEffect(() => {
    if (!active) {
      setArticle(null);
      setSummary([]);
      setSummaryMode(null);
      setSummaryError(null);
      setExportMessage(null);
      return;
    }
    if (!tabId) {
      setError('No active tab to read.');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      setSummary([]);
      setSummaryMode(null);
      setSummaryError(null);
      try {
        // Try extraction via IPC (Electron) first
        let result;
        try {
          // Use research:extractContent IPC call if available
          if (tabId && typeof window !== 'undefined' && (window as any).ipc) {
            try {
              result = await ipc.research.extractContent(tabId);
            } catch (ipcError) {
              console.warn('[ReaderOverlay] IPC extractContent failed, trying Redix fallback:', ipcError);
              
              // Try Redix /extract endpoint if available
              const redixUrl = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';
              try {
                const redixResponse = await fetch(`${redixUrl}/extract`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    url: activeTab?.url || url,
                    tabId,
                  }),
                }).catch(() => null);
                
                if (redixResponse?.ok) {
                  const redixData = await redixResponse.json();
                  if (redixData.title || redixData.content) {
                    result = {
                      title: redixData.title || activeTab?.title,
                      content: redixData.content || redixData.text,
                      html: redixData.html || `<h1>${redixData.title}</h1><p>${redixData.content}</p>`,
                    };
                  }
                }
              } catch (redixError) {
                console.debug('[ReaderOverlay] Redix extract also failed:', redixError);
              }
            }
          }
        } catch {
          // Continue to fallback
        }
        
        // Fallback: Try to use page extractor from document
        if (!result && typeof window !== 'undefined' && window.document) {
          try {
            const { extractPageContent } = await import('../../utils/pageExtractor');
            const pageMeta = extractPageContent(window.document, activeTab?.url || url || undefined);
            result = {
              title: pageMeta.title,
              content: pageMeta.mainContent,
              html: `<h1>${pageMeta.title}</h1>\n<p>${pageMeta.mainContent}</p>`,
            };
          } catch (extractError) {
            console.warn('[ReaderOverlay] Page extractor fallback failed:', extractError);
          }
        }
        
        // Final fallback: Use tab title/URL if available
        if (!result && activeTab) {
          result = {
            title: activeTab.title || 'Reader View',
            content: `Content from: ${activeTab.url || 'Current page'}\n\nUnable to extract readable content. Please ensure the page has loaded completely.`,
            html: `<h1>${activeTab.title || 'Reader View'}</h1>\n<p>Content from: <a href="${activeTab.url}">${activeTab.url}</a></p>\n<p>Unable to extract readable content. Please ensure the page has loaded completely.</p>`,
          };
        }
        
        if (!result || (!result.content && !result.html)) {
          setError('Unable to extract article content for this page. The page may not have readable content, or it may still be loading.');
          return;
        }
        
        setArticle({
          title: result.title || activeTab?.title || activeTab?.url || 'Reader View',
          html: result.html || `<p>${sanitizeText(result.content)}</p>`,
          content: result.content || '',
          url: activeTab?.url || url || undefined,
        });
      } catch (err) {
        console.error('Failed to load reader content:', err);
        setError('Failed to load reader view for this page. Please try again or ensure the page has loaded.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [active, tabId, activeTab, url]);

  const handleSummarize = async () => {
    if (!article?.content) return;
    setSummaryLoading(true);
    setSummaryError(null);
    setExportMessage(null);
    try {
      // Try using LLM adapter first, fallback to IPC
      try {
        const { sendPrompt } = await import('../../core/llm/adapter');
        const prompt = `Summarize the following article in 3-5 bullet points:\n\nTitle: ${article.title}\n\n${article.content}`;
        const response = await sendPrompt(prompt, {
          systemPrompt: 'You are a helpful assistant that creates concise summaries of web articles.',
          maxTokens: 300,
        });
        
        // Parse bullet points from response
        const bullets = response.text
          .split(/\n/)
          .filter(line => line.trim().match(/^[-•*]\s|^\d+\.\s/))
          .map(line => ({
            summary: line.replace(/^[-•*]\s|^\d+\.\s/, '').trim(),
            citation: { text: article.title, url: article.url },
          }));
        
        if (bullets.length > 0) {
          setSummary(bullets);
          setSummaryMode('cloud');
          return;
        }
      } catch {
        // Fallback to IPC
      }
      
      // Fallback to IPC method
      const result = await ipc.reader.summarize({
        url: article.url,
        title: article.title,
        content: article.content,
        html: article.html,
      });
      setSummary(result.bullets);
      setSummaryMode(result.mode);
    } catch (err) {
      console.error('Failed to summarize article:', err);
      setSummaryError('Summarization failed. Try again or check AI settings.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleExport = async () => {
    if (!article?.html) return;
    setExporting(true);
    setExportMessage(null);
    try {
      const result = await ipc.reader.export({
        url: article.url,
        title: article.title,
        html: article.html,
      });
      if (result?.success) {
        setExportMessage(`Saved clean copy to ${result.path}`);
      } else {
        setExportMessage('Export failed. Please try again.');
      }
    } catch (err) {
      console.error('Failed to export reader view:', err);
      setExportMessage('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenCitation = (link?: string) => {
    if (!link) return;
    ipc.tabs.create({ url: link, mode: 'normal' }).catch(console.error);
    onClose();
  };

  if (!active) {
    return null;
  }

  return (
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-gray-950"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-8 z-[80] rounded-2xl border border-gray-800/70 bg-[#0B1120]/98 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/60 bg-gray-900/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
                  <BookOpen size={20} className="text-blue-200" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-100">
                    {article?.title || activeTab?.title || 'Reader'}
                  </h2>
                  <div className="text-xs text-gray-500">
                    {article?.url ? getHostname(article.url) : activeTab?.url}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={!article?.html || exporting}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-700/60 bg-gray-800/50 hover:bg-gray-800/70 text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Export clean view
                </button>
                <button
                  onClick={() => void handleSummarize()}
                  disabled={!article?.content || summaryLoading}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-blue-600/70 hover:bg-blue-600 text-blue-50 border border-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {summaryLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Cite-preserving summary
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800/60 text-gray-400 hover:text-gray-200 transition-colors"
                  title="Close reader"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {exportMessage && (
              <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-sm text-emerald-200 flex items-center justify-between">
                <span>{exportMessage}</span>
                <button
                  onClick={() => setExportMessage(null)}
                  className="text-emerald-300 hover:text-emerald-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error ? (
              <div className="flex-1 flex items-center justify-center text-sm text-red-300 bg-red-500/10">
                {error}
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[2fr_1fr] overflow-hidden">
                <div className="relative overflow-y-auto">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm z-10">
                      <Loader2 size={32} className="text-blue-400 animate-spin" />
                    </div>
                  )}
                  <div className="prose prose-invert max-w-none px-8 py-6">
                    {article ? (
                      <div
                        className="reader-article"
                        dangerouslySetInnerHTML={{ __html: article.html }}
                      />
                    ) : (
                      <div className="text-center text-gray-500 text-sm py-12">
                        Preparing clean article view…
                      </div>
                    )}
                  </div>
                </div>
                <aside className="border-l border-gray-800/60 bg-gray-900/30 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                    <div>
                      <div className="text-sm font-semibold text-gray-100 flex items-center gap-2">
                        <Sparkles size={16} className="text-blue-300" />
                        Summary with citations
                      </div>
                      <div className="text-xs text-gray-500">
                        {summaryMode === 'local' && 'Generated locally (GGUF)'}
                        {summaryMode === 'cloud' && 'Generated via cloud model (with consent)'}
                        {summaryMode === 'extractive' && 'Extractive summary from source paragraphs'}
                        {!summaryMode && 'Click summarize to generate key bullet points'}
                      </div>
                    </div>
                    <button
                      onClick={() => void handleSummarize()}
                      disabled={!article?.content || summaryLoading}
                      className="p-2 rounded-lg border border-gray-700/50 text-gray-300 hover:text-gray-100 hover:bg-gray-800/60 disabled:opacity-50"
                      title="Refresh summary"
                    >
                      <RefreshCcw size={16} className={summaryLoading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {summaryLoading && (
                      <div className="flex items-center justify-center h-full text-sm text-gray-400 gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        Generating summary…
                      </div>
                    )}
                    {summaryError && (
                      <div className="flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-200 px-3 py-2 text-sm">
                        <AlertTriangle size={16} />
                        {summaryError}
                      </div>
                    )}
                    {!summaryLoading && !summaryError && summary.length === 0 && (
                      <div className="text-sm text-gray-500">
                        The summary will include direct citations from the article to preserve attribution.
                        Click{" "}
                        <span className="text-blue-400">“Cite-preserving summary”</span> to begin.
                      </div>
                    )}
                    {summary.map((bullet, idx) => (
                      <motion.div
                        key={`${bullet.summary}-${idx}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-gray-700/50 bg-gray-900/50 p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3 text-gray-100">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/20 border border-blue-500/40 text-xs text-blue-200">
                            {idx + 1}
                          </div>
                          <p className="text-sm leading-relaxed">{bullet.summary}</p>
                        </div>
                        {bullet.citation && (
                          <button
                            onClick={() => handleOpenCitation(bullet.citation?.url)}
                            className="mt-3 flex w-full items-start gap-2 rounded-lg bg-gray-900/70 border border-gray-800/70 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-700 transition-colors text-left"
                          >
                            <Quote size={14} className="flex-shrink-0 text-gray-500" />
                            <span className="flex-1">
                              {bullet.citation.text.length > 220
                                ? `${bullet.citation.text.slice(0, 220)}…`
                                : bullet.citation.text}
                            </span>
                            {bullet.citation.url && <ExternalLink size={12} className="text-gray-500" />}
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </aside>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, '').replace(/\s+/g, ' ');
}

function getHostname(input: string): string {
  try {
    return new URL(input).hostname;
  } catch {
    return input;
  }
}

