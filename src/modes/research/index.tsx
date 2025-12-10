// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResearchStagehandIntegration } from './stagehand-integration';
import { Sparkles, RefreshCcw, ChevronRight, Search, Upload, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../state/settingsStore';
import VoiceButton from '../../components/VoiceButton';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useDebounce } from '../../utils/useDebounce';
import { fetchDuckDuckGoInstant, formatDuckDuckGoResults } from '../../services/duckDuckGoSearch';
import { type MultiSourceSearchResult } from '../../services/multiSourceSearch';
import { performLiveWebSearch } from '../../services/liveWebSearch';
import { optimizedSearch } from '../../services/optimizedSearch';
import { scrapeResearchSources, type ScrapedSourceResult } from '../../services/researchScraper';
import { searchLocal } from '../../utils/lunrIndex';
// import { useOfflineRAG } from '../../hooks/useOfflineRAG'; // Unused
// import { searchOfflineDocuments } from '../../services/offlineRAG'; // Unused
// import { SavePageButton } from '../../components/offline/SavePageButton'; // Unused
import { aiEngine, type AITaskResult } from '../../core/ai';
import { semanticSearchMemories } from '../../core/supermemory/search';
import { parsePdfFile } from '../docs/parsers/pdf';
import { parseDocxFile } from '../docs/parsers/docx';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { parseResearchVoiceCommand } from '../../utils/voiceCommandParser';
import { detectLanguage } from '../../services/languageDetection';
import { summarizeOffline } from '../../services/offlineSummarizer';
import { ZeroPromptSuggestions } from '../../components/ZeroPromptSuggestions';
// LAG FIX #8: Hindi defaults for Research mode
import { getModeDefaults, getLocalizedText } from '../../config/modeDefaults';
import {
  ResearchResult,
  ResearchSource,
  ResearchSourceType,
  VerificationResult,
  ResearchInlineEvidence,
} from '../../types/research';
import { ContainerInfo } from '../../lib/ipc-events';
import { useContainerStore } from '../../state/containerStore';
import { ResearchGraphView } from '../../components/research/ResearchGraphView';
// import { isWebMode } from '../../lib/env'; // Unused
import { SourceCard } from '../../components/research/SourceCard';
import { AnswerWithCitations } from '../../components/research/AnswerWithCitations';
import { EvidenceOverlay } from '../../components/research/EvidenceOverlay';
import { CompareAnswersPanel } from '../../components/research/CompareAnswers';
import { LayoutEngine, LayoutHeader, LayoutBody } from '../../ui/layout-engine';
import BrowserView from '../../components/BrowserView';
import { useResearchCompareStore } from '../../state/researchCompareStore';
import { toast } from '../../utils/toast';
import { runDeepScan, type DeepScanStep, type DeepScanSource } from '../../services/deepScan';
import { CursorChat } from '../../components/cursor/CursorChat';
import { OmniAgentInput } from '../../components/OmniAgentInput';
import { executeAgentActions } from '../../services/agenticActions';
import { RegenResearchPanel } from '../../components/research/RegenResearchPanel';
import { researchApi } from '../../lib/api-client';
import { getLanguageMeta } from '../../constants/languageMeta';
import { getSearchHealth } from '../../services/searchHealth';
import { multiLanguageAI, type SupportedLanguage } from '../../core/language/multiLanguageAI';

type UploadedDocument = {
  id: string;
  file: File;
  name: string;
  text: string;
  type: string;
  size: number;
};

type _ResearchPipelineArgs = {
  searchQuery: string;
  context: Record<string, unknown>;
  aggregatedSources: ResearchSource[];
  aggregatedProviderNames: string[];
  scrapedSnapshots?: ScrapedSourceResult[];
};

export default function ResearchPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [_loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string>('en');
  const language = useSettingsStore(s => s.language || 'auto');
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [includeCounterpoints, setIncludeCounterpoints] = useState(false);
  const [authorityBias, setAuthorityBias] = useState(50); // 0 = recency, 100 = authority
  const [region, setRegion] = useState<RegionOption>('global');
  const [graphData, setGraphData] = useState<any>(null);
  const [showGraph, setShowGraph] = useState(true);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
    Array<{ title: string; subtitle?: string; action?: () => void }>
  >([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // LAG FIX #8: Apply Hindi defaults for Research mode
  useEffect(() => {
    const defaults = getModeDefaults('Research');
    const settings = useSettingsStore.getState();
    if (!settings.language || settings.language === 'auto') {
      settings.setLanguage(defaults.language);
    }
  }, []);
  const { activeId, tabs } = useTabsStore();
  const useHybridSearch = useSettingsStore(s => s.searchEngine !== 'mock');
  const { containers, activeContainerId, setContainers } = useContainerStore();
  const graphSignatureRef = useRef<string>('');
  const debouncedQuery = useDebounce(query, 300);
  const {
    entries: compareEntries,
    addEntry: addCompareEntry,
    removeEntry: removeCompareEntry,
  } = useResearchCompareStore();
  const [comparePanelOpen, setComparePanelOpen] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [cursorPanelOpen, setCursorPanelOpen] = useState(false);
  const aiMetaRef = useRef<{ provider?: string; model?: string }>({});
  const [deepScanEnabled, setDeepScanEnabled] = useState(false);
  const [deepScanLoading, setDeepScanLoading] = useState(false);
  const [deepScanSteps, setDeepScanSteps] = useState<DeepScanStep[]>([]);
  const [deepScanError, setDeepScanError] = useState<string | null>(null);
  const [useEnhancedView, setUseEnhancedView] = useState(true); // Default to enhanced multilingual view
  const [viewingSourceUrl, setViewingSourceUrl] = useState<string | null>(null); // Real web page viewing

  useEffect(() => {
    if (containers.length === 0) {
      ipc.containers
        .list()
        .then(list => {
          if (Array.isArray(list)) {
            setContainers(list as ContainerInfo[]);
          }
        })
        .catch(err => {
          console.warn('[Research] Failed to load containers for badge', err);
        });
    }
  }, [containers.length, setContainers]);

  // Listen for handoff events from Trade mode
  // WISPR Research Command Handler
  useEffect(() => {
    const handleWisprResearch = (event: CustomEvent) => {
      const { query: researchQuery } = event.detail;
      if (researchQuery) {
        setQuery(researchQuery);
        toast.success(`Researching: ${researchQuery}`, { duration: 3000 });
        // Trigger search after a short delay - handleSearch will be called via query change
        setTimeout(() => {
          // Dispatch a custom event that will trigger search
          window.dispatchEvent(
            new CustomEvent('research:trigger', { detail: { query: researchQuery } })
          );
        }, 500);
      }
    };

    window.addEventListener('wispr:research', handleWisprResearch as EventListener);
    return () => window.removeEventListener('wispr:research', handleWisprResearch as EventListener);
  }, []);

  // AUDIT FIX #4: IPC scrape integration - enhanced voice agent handlers
  useEffect(() => {
    const handleAgentOpen = (event: CustomEvent<{ url?: string }>) => {
      const url = event?.detail?.url;
      if (!url) return;
      toast.success('Opening for research…');
      void executeAgentActions([`[OPEN ${url}]`]);
    };
    const handleAgentScraped = async (event: CustomEvent<{ url?: string; results?: any }>) => {
      const { url, results } = event.detail;
      if (!url || !results) return;
      toast.success(`Scraped: ${results.title || url}`);
      // Add scraped result to research sources if available
      if (results.content || results.excerpt) {
        const source: ResearchSource = {
          id: `agent-${Date.now()}`,
          url,
          title: results.title || url,
          snippet: results.excerpt || results.content?.substring(0, 200) || '',
          type: 'web' as ResearchSourceType,
          credibility: 'medium',
          timestamp: Date.now(),
        };
        if (result) {
          setResult({
            ...result,
            sources: [...(result.sources || []), source],
          });
        }
      }
    };

    // AUDIT FIX #4: Enhanced scrape handler with IPC fallback
    const _handleScrapeCommand = async (event: CustomEvent<{ command?: string }>) => {
      const command = event.detail?.command?.toLowerCase();
      if (!command || !command.includes('scrape')) return;

      const activeTab = tabs.find(t => t.id === activeId);
      if (!activeTab?.url || !activeTab.url.startsWith('http')) {
        toast.error('No active page to scrape');
        return;
      }

      try {
        toast.info('Scraping current page…');

        // Try IPC scrape first (Tauri/Electron)
        let scrapedContent: string | null = null;
        try {
          if (isElectronRuntime() || isTauriRuntime()) {
            // Use IPC to execute script in webview
            const script = `document.body.innerText || document.body.textContent || ''`;
            const result = await ipc.tabs.executeScript?.(activeId, script);
            if (result) {
              scrapedContent = typeof result === 'string' ? result : JSON.stringify(result);
            }
          }
        } catch (ipcError) {
          console.warn('[Research] IPC scrape failed, using fallback:', ipcError);
        }

        // Fallback to iframe postMessage scraping
        if (!scrapedContent) {
          const { scrapeActiveTab } = await import('../../services/liveTabScraper');
          const scraped = await scrapeActiveTab();
          scrapedContent = scraped?.content || scraped?.text || null;
        }

        if (scrapedContent) {
          // Send to LLM for analysis
          const analysis = await aiEngine.generate(
            `Analyze this page content and provide key insights:\n\n${scrapedContent.substring(0, 10000)}`
          );

          // Add as research source
          const source: ResearchSource = {
            id: `scrape-${Date.now()}`,
            url: activeTab.url,
            title: activeTab.title || activeTab.url,
            snippet: analysis.substring(0, 200),
            type: 'web' as ResearchSourceType,
            credibility: 'high',
            timestamp: Date.now(),
          };

          setResult(prev => ({
            ...prev,
            query: prev?.query || `Analysis of ${activeTab.url}`,
            answer: analysis,
            sources: [...(prev?.sources || []), source],
            timestamp: Date.now(),
          }));

          toast.success('Page scraped and analyzed');
        } else {
          toast.error('Failed to scrape page content');
        }
      } catch (error) {
        console.error('[Research] Scrape command failed:', error);
        toast.error('Scraping failed');
      }
    };
    const handleAgentSummarize = async (event: CustomEvent<{ url?: string | null }>) => {
      const targetUrl = event.detail.url;
      if (targetUrl) {
        // Summarize specific URL
        toast.info('Summarizing page…');
        try {
          const { scrapeResearchSources } = await import('../../services/researchScraper');
          const [scraped] = await scrapeResearchSources([targetUrl]);
          if (scraped?.content) {
            const { summarizeOffline } = await import('../../services/offlineSummarizer');
            const summary = await summarizeOffline(scraped.content);
            setResult({
              query: `Summary of ${targetUrl}`,
              answer: summary.summary,
              sources: [
                {
                  id: `summary-${Date.now()}`,
                  url: targetUrl,
                  title: scraped.title || targetUrl,
                  snippet: summary.summary,
                  type: 'web' as ResearchSourceType,
                  credibility: 'high',
                  timestamp: Date.now(),
                },
              ],
              confidence: summary.confidence,
              timestamp: Date.now(),
            });
            toast.success('Page summarized');
          }
        } catch (error) {
          console.warn('[Research] Summarize failed:', error);
          toast.error('Failed to summarize page');
        }
      } else {
        // Summarize current active tab
        const activeTab = tabs.find(t => t.id === activeId);
        if (activeTab?.url && activeTab.url.startsWith('http')) {
          toast.info('Summarizing current page…');
          try {
            const { scrapeResearchSources } = await import('../../services/researchScraper');
            const [scraped] = await scrapeResearchSources([activeTab.url]);
            if (scraped?.content) {
              const { summarizeOffline } = await import('../../services/offlineSummarizer');
              const summary = await summarizeOffline(scraped.content);
              setResult({
                query: `Summary of ${activeTab.url}`,
                answer: summary.summary,
                sources: [
                  {
                    id: `summary-${Date.now()}`,
                    url: activeTab.url,
                    title: scraped.title || activeTab.title || activeTab.url,
                    snippet: summary.summary,
                    type: 'web' as ResearchSourceType,
                    credibility: 'high',
                    timestamp: Date.now(),
                  },
                ],
                confidence: summary.confidence,
                timestamp: Date.now(),
              });
              toast.success('Page summarized');
            }
          } catch (error) {
            console.warn('[Research] Summarize failed:', error);
            toast.error('Failed to summarize page');
          }
        } else {
          toast.warning('No page to summarize');
        }
      }
    };
    window.addEventListener('agent:research-open', handleAgentOpen as EventListener);
    window.addEventListener('agent:research-scraped', handleAgentScraped as EventListener);
    window.addEventListener('agent:research-summarize', handleAgentSummarize as EventListener);
    return () => {
      window.removeEventListener('agent:research-open', handleAgentOpen as EventListener);
      window.removeEventListener('agent:research-scraped', handleAgentScraped as EventListener);
      window.removeEventListener('agent:research-summarize', handleAgentSummarize as EventListener);
    };
  }, [activeId, tabs, result, setResult]);

  useEffect(() => {
    const handleHandoff = (event: CustomEvent) => {
      const { query: handoffQuery, symbol, language: _handoffLanguage } = event.detail;
      if (handoffQuery) {
        setQuery(handoffQuery);
        // Trigger search after a short delay to allow mode switch
        setTimeout(() => {
          handleSearch(handoffQuery);
        }, 500);
        toast.success(`Researching: ${handoffQuery}`, {
          duration: 3000,
        });
      } else if (symbol) {
        const researchQuery = `${symbol} fundamentals and recent news`;
        setQuery(researchQuery);
        setTimeout(() => {
          handleSearch(researchQuery);
        }, 500);
        toast.success(`Researching ${symbol}...`, {
          duration: 3000,
        });
      }
    };

    // v0.4: Browser search integration - listen for omnibox searches
    const handleBrowserSearch = (event: CustomEvent) => {
      const { query: browserQuery } = event.detail;
      if (browserQuery) {
        // Always handle browser search in research mode (we're already in research panel)
        setQuery(browserQuery);
        setTimeout(() => {
          handleSearch(browserQuery);
        }, 200);
        toast.info(`Researching from browser: ${browserQuery}`);
      }
    };

    window.addEventListener('handoff:research', handleHandoff as EventListener);
    window.addEventListener('browser:search', handleBrowserSearch as EventListener);
    return () => {
      window.removeEventListener('handoff:research', handleHandoff as EventListener);
      window.removeEventListener('browser:search', handleBrowserSearch as EventListener);
    };
  }, [handleSearch]);

  useEffect(() => {
    setCompareSelection(prev => prev.filter(id => compareEntries.some(entry => entry.id === id)));
  }, [compareEntries]);

  useEffect(() => {
    if (!deepScanEnabled) {
      setDeepScanSteps([]);
      setDeepScanError(null);
    }
  }, [deepScanEnabled]);

  // Calculate weights from authorityBias - must be defined before callbacks that use them
  const recencyWeight = useMemo(() => (100 - authorityBias) / 100, [authorityBias]);
  const authorityWeight = useMemo(() => authorityBias / 100, [authorityBias]);

  // refreshGraph must be defined before _runResearchAnswer which uses it
  const refreshGraph = useCallback(async () => {
    if (typeof window === 'undefined' || !window.graph?.all) return;
    try {
      const snapshot = await window.graph.all();
      if (snapshot && Array.isArray(snapshot.nodes)) {
        setGraphData(snapshot);
      }
    } catch (err) {
      console.warn('[Research] Failed to load graph snapshot', err);
    }
  }, []);

  const _runResearchAnswer = useCallback(
    async ({
      searchQuery,
      context,
      aggregatedSources,
      aggregatedProviderNames,
      scrapedSnapshots = [],
    }: ResearchPipelineArgs) => {
      try {
        let streamedText = '';
        let streamedResult: AITaskResult | null = null;

        // v0.4: Parallel AI execution (reason + summarize) for faster responses
        // Also scrape active tab in parallel if available
        const [aiResult, liveScrapeResult] = await Promise.all([
          aiEngine.runTask(
            {
              kind: 'search',
              prompt: searchQuery,
              context,
              mode: 'research',
              metadata: {
                includeCounterpoints,
                region: region !== 'global' ? region : undefined,
                recencyWeight,
                authorityWeight,
                language: language !== 'auto' ? language : undefined,
              },
              llm: {
                temperature: 0.2,
                maxTokens: 1000,
              },
            },
            event => {
              if (event.type === 'token' && typeof event.data === 'string') {
                streamedText += event.data;
              } else if (event.type === 'done' && typeof event.data !== 'string') {
                streamedResult = event.data as AITaskResult;
              }
            }
          ),
          // v0.4: Live scrape active tab in parallel
          (async () => {
            try {
              const { scrapeActiveTab } = await import('../../services/liveTabScraper');
              const result = await scrapeActiveTab();
              if (result?.success) {
                console.debug('[Research] Live scraped active tab:', result.url);
              }
              return result;
            } catch (error) {
              console.warn('[Research] Live scraping failed:', error);
              return null;
            }
          })(),
        ]);

        const finalResult = streamedResult ?? aiResult;
        aiMetaRef.current = {
          provider: finalResult?.provider || 'ai',
          model: finalResult?.model,
        };
        let finalAnswer = streamedText || finalResult?.text || '';

        // v0.4: Parse and execute agentic actions from AI response
        if (finalAnswer) {
          const { parseAgenticActions, executeAgenticAction } =
            await import('../../services/agenticActionParser');
          const actions = parseAgenticActions(finalAnswer);

          if (actions.length > 0) {
            // Execute actions in parallel
            const actionResults = await Promise.all(
              actions.map(action =>
                executeAgenticAction(action, {
                  activeTabUrl: tabs.find(t => t.id === activeId)?.url,
                  query: searchQuery,
                })
              )
            );

            // Update answer with action results
            for (let i = 0; i < actions.length; i++) {
              const action = actions[i];
              const result = actionResults[i];

              if (result.success && result.result) {
                // Replace action marker with result
                const resultText =
                  typeof result.result === 'string'
                    ? result.result
                    : JSON.stringify(result.result, null, 2);
                finalAnswer = finalAnswer.replace(
                  action.raw,
                  `\n\n[Executed ${action.type}]: ${resultText.substring(0, 500)}\n\n`
                );
              }
            }
          }
        }

        // v0.4: Add live scraped content to sources if available
        if (liveScrapeResult?.success && liveScrapeResult.text) {
          aggregatedSources.unshift({
            id: `live-scrape-${Date.now()}`,
            title: liveScrapeResult.title || 'Current Page',
            url: liveScrapeResult.url,
            domain: new URL(liveScrapeResult.url).hostname,
            snippet: liveScrapeResult.text.substring(0, 300),
            text: liveScrapeResult.text,
            type: 'web' as ResearchSourceType,
            sourceType: 'web' as ResearchSourceType,
            relevanceScore: 100,
            timestamp: liveScrapeResult.timestamp,
            metadata: {
              provider: 'live-scrape',
              scraped: true,
            },
          });
        }

        // If offline and no answer, try offline mBART summarization
        if (!finalAnswer && typeof navigator !== 'undefined' && !navigator.onLine) {
          try {
            // Collect all source text for summarization
            const sourceTexts: string[] = [];
            if (scrapedSnapshots.length > 0) {
              scrapedSnapshots.forEach(snapshot => {
                if (snapshot.excerpt) sourceTexts.push(snapshot.excerpt);
                if (snapshot.text) sourceTexts.push(snapshot.text);
              });
            }
            if (aggregatedSources.length > 0) {
              aggregatedSources.forEach(source => {
                if (source.snippet) sourceTexts.push(source.snippet);
                if (source.title) sourceTexts.push(source.title);
              });
            }

            if (sourceTexts.length > 0) {
              const offlineSummary = await summarizeOffline(sourceTexts.join(' '), {
                maxLength: 500,
                minLength: 100,
                language: language !== 'auto' ? language : 'en',
                useOfflineModel: true,
              });
              if (offlineSummary.summary) {
                finalAnswer = offlineSummary.summary;
                aiMetaRef.current = {
                  provider: 'offline-mbart',
                  model: offlineSummary.method === 'mbart' ? 'mBART' : 'extraction',
                };
              }
            }
          } catch (error) {
            console.warn('[Research] Offline summarization failed:', error);
          }
        }

        if (finalAnswer && typeof window !== 'undefined' && window.graph) {
          try {
            const concepts = finalAnswer.split(/[.,;]/).slice(0, 5);
            for (const concept of concepts) {
              const trimmed = concept.trim();
              if (trimmed.length > 3 && trimmed.length < 50) {
                await window.graph.add({
                  id: `research-${Date.now()}-${Math.random()}`,
                  label: trimmed,
                  type: 'research-concept',
                });
              }
            }
            await refreshGraph();
          } catch (graphError) {
            console.debug('[Research] Auto-graph generation failed:', graphError);
          }
        }

        const sources: ResearchSource[] = [...aggregatedSources];

        if (finalResult?.citations && finalResult.citations.length > 0) {
          sources.push(
            ...finalResult.citations.map((cite, idx) => {
              let domain = cite.source || '';
              try {
                if (cite.url) {
                  domain = new URL(cite.url).hostname;
                }
              } catch {
                domain = cite.source || '';
              }
              const citationType: ResearchSourceType = inferSourceType(domain);
              return {
                id: `ai-citation-${idx}`,
                title: cite.title || cite.url || `Source ${idx + 1}`,
                url: cite.url || '',
                domain,
                snippet: cite.snippet || '',
                text: cite.snippet || '',
                type: citationType,
                sourceType: citationType,
                relevanceScore: 95 - idx * 3,
                timestamp: Date.now(),
                metadata: {
                  provider: 'ai-citation',
                },
              };
            })
          );
        }

        if (uploadedDocuments.length > 0) {
          sources.push(
            ...uploadedDocuments.map((doc, idx) => ({
              id: doc.id,
              title: doc.name,
              url: '',
              domain: 'uploaded',
              snippet: doc.text.slice(0, 200) + (doc.text.length > 200 ? '...' : ''),
              text: doc.text,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 98 - idx,
              timestamp: Date.now(),
              metadata: {
                provider: 'uploaded-doc',
              },
            }))
          );
        }

        try {
          const localResults = await searchLocal(searchQuery);
          sources.push(
            ...localResults.map((lr, idx) => ({
              id: `local-${lr.id}`,
              title: lr.title,
              url: '',
              domain: 'local',
              snippet: lr.snippet,
              text: lr.snippet,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 85 - idx * 3,
              timestamp: Date.now(),
              metadata: {
                provider: 'local-index',
              },
            }))
          );
        } catch (localError) {
          console.debug('[Research] Local search failed:', localError);
        }

        const inlineCitations =
          finalResult?.citations?.map((cite, idx) => ({
            id: `citation-${idx}`,
            text: cite.title || cite.url || `Source ${idx + 1}`,
            url: cite.url || '',
            position:
              finalAnswer.indexOf(cite.title || '') >= 0
                ? finalAnswer.indexOf(cite.title || '')
                : idx * 50,
          })) || [];

        const dedupedSources = dedupeResearchSources(sources);

        // v0.4: Subscribe to realtime source updates
        (async () => {
          try {
            const { subscribeToSourceUpdates, updateSource } =
              await import('../../services/realtimeSourceUpdater');
            const unsubscribe = subscribeToSourceUpdates(dedupedSources, update => {
              setResult(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  sources: updateSource(prev.sources, update),
                };
              });
            });
            // Cleanup after 5 minutes
            setTimeout(() => unsubscribe(), 5 * 60 * 1000);
          } catch (error) {
            console.warn('[Research] Realtime updates not available:', error);
          }
        })();

        setResult({
          query: searchQuery,
          summary: finalAnswer || 'No answer generated',
          sources: dedupedSources.slice(0, 16),
          citations: inlineCitations,
          inlineEvidence: [],
          contradictions: [],
          verification: {
            score: 0.8,
            confidence: 'high',
            suggestions: [
              `AI-generated response using ${finalResult?.provider || 'unknown'} (${finalResult?.model || 'unknown'})`,
              ...(finalResult?.citations?.length
                ? [`${finalResult.citations.length} citation(s) included`]
                : []),
            ],
          },
          confidence: Math.min(0.95, Math.max(0.45, finalResult?.confidence ?? 0.82)),
        });
        return;
      } catch (aiError) {
        console.warn('[Research] AI engine failed, falling back to legacy search:', aiError);

        if (aggregatedSources.length > 0) {
          const providerLabel =
            aggregatedProviderNames.length > 0
              ? aggregatedProviderNames.map(provider => formatProviderName(provider)).join(', ')
              : 'multi-source web';
          aiMetaRef.current = {
            provider: providerLabel,
            model: 'aggregate',
          };
          const dedupedAggregated = dedupeResearchSources(aggregatedSources);
          const topTitles = dedupedAggregated
            .slice(0, 3)
            .map(source => source.title)
            .join('; ');
          const scrapedSummary = scrapedSnapshots.find(snapshot => snapshot.excerpt)?.excerpt;
          setResult({
            query: searchQuery,
            summary: scrapedSummary?.length
              ? scrapedSummary
              : topTitles.length > 0
                ? `Multi-source (${providerLabel}) search returned ${dedupedAggregated.length} results. Top hits: ${topTitles}.`
                : `Multi-source (${providerLabel}) search returned ${dedupedAggregated.length} results.`,
            sources: dedupedAggregated.slice(0, 16),
            citations: [],
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.65,
              confidence: 'medium',
              suggestions: [`Review ${providerLabel} sources manually.`],
            },
            confidence: 0.62,
          });
          return;
        }

        const duckResult = await fetchDuckDuckGoInstant(searchQuery);
        if (duckResult) {
          aiMetaRef.current = {
            provider: 'duckduckgo',
            model: 'instant-answer',
          };
          const formatted = formatDuckDuckGoResults(duckResult);
          const localResults = await searchLocal(searchQuery).catch(() => []);
          const sources: ResearchSource[] = [
            ...(duckResult.Heading && duckResult.AbstractText
              ? [
                  {
                    id: 'duck-instant',
                    title: duckResult.Heading,
                    url: duckResult.AbstractURL || '',
                    domain: duckResult.AbstractURL
                      ? extractDomain(duckResult.AbstractURL)
                      : 'duckduckgo.com',
                    snippet: duckResult.AbstractText,
                    text: duckResult.AbstractText,
                    type: 'news' as ResearchSourceType,
                    sourceType: 'news' as ResearchSourceType,
                    relevanceScore: 100,
                    timestamp: Date.now(),
                    metadata: {
                      provider: 'duckduckgo',
                    },
                  },
                ]
              : []),
            ...formatted
              .filter(f => f.type === 'result' && f.url)
              .map((f, idx) => {
                const domain = f.url ? extractDomain(f.url) : '';
                const sourceType = inferSourceType(domain);
                return {
                  id: `duck-result-${idx}`,
                  title: f.title,
                  url: f.url || '',
                  domain,
                  snippet: f.snippet,
                  text: f.snippet,
                  type: sourceType,
                  sourceType,
                  relevanceScore: 85 - idx * 5,
                  timestamp: Date.now(),
                  metadata: {
                    provider: 'duckduckgo',
                  },
                };
              }),
            ...localResults.map((lr, idx) => ({
              id: `local-${lr.id}`,
              title: lr.title,
              url: '',
              domain: 'local',
              snippet: lr.snippet,
              text: lr.snippet,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 90 - idx * 3,
              timestamp: Date.now(),
              metadata: {
                provider: 'local-index',
              },
            })),
          ];

          setResult({
            query: searchQuery,
            summary:
              duckResult.AbstractText ||
              duckResult.Answer ||
              duckResult.Definition ||
              `Found ${sources.length} result${sources.length === 1 ? '' : 's'} for "${searchQuery}"`,
            sources: dedupeResearchSources(sources).slice(0, 16),
            citations: [],
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.7,
              confidence: 'medium',
              suggestions: ['Results from DuckDuckGo Instant Answer API'],
            },
            confidence: 0.58,
          });
          return;
        }

        const localResults = await searchLocal(searchQuery).catch(() => []);
        if (localResults.length > 0) {
          aiMetaRef.current = {
            provider: 'local-index',
            model: 'documents',
          };
          setResult({
            query: searchQuery,
            summary: `Found ${localResults.length} local result${localResults.length === 1 ? '' : 's'}`,
            sources: localResults.map((lr, idx) => ({
              id: `local-${lr.id}`,
              title: lr.title,
              url: '',
              domain: 'local',
              snippet: lr.snippet,
              text: lr.snippet,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 90 - idx * 3,
              timestamp: Date.now(),
              metadata: {
                provider: 'local-index',
              },
            })),
            citations: [],
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.6,
              confidence: 'low',
              suggestions: ['Results from local index only'],
            },
            confidence: 0.52,
          });
          return;
        }

        throw aiError;
      }
    },
    [authorityWeight, includeCounterpoints, region, recencyWeight, refreshGraph, uploadedDocuments]
  );

  const handleToggleCompareSelection = useCallback((id: string) => {
    setCompareSelection(prev => {
      if (prev.includes(id)) {
        return prev.filter(entryId => entryId !== id);
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  }, []);

  const handleRemoveCompare = useCallback(
    (id: string) => {
      removeCompareEntry(id);
      setCompareSelection(prev => prev.filter(entryId => entryId !== id));
      toast.info('Removed saved answer.');
    },
    [removeCompareEntry]
  );

  const handleSaveForCompare = useCallback(() => {
    if (!result) {
      toast.info('Run a research query before saving.');
      return;
    }
    const saved = addCompareEntry({
      query: result.query,
      summary: result.summary,
      provider: aiMetaRef.current.provider,
      model: aiMetaRef.current.model,
      confidence: result.confidence,
      sources: result.sources,
      citations: result.citations,
      settings: {
        includeCounterpoints,
        authorityBias,
        region,
      },
    });
    setCompareSelection([saved.id]);
    setComparePanelOpen(true);
    toast.success('Answer saved to compare drawer.');
  }, [result, addCompareEntry, includeCounterpoints, authorityBias, region]);

  const runDeepScanFlow = useCallback(async (searchQuery: string) => {
    setDeepScanLoading(true);
    setDeepScanError(null);
    setDeepScanSteps([]);
    try {
      const response = await runDeepScan(searchQuery, { maxPages: 5 });
      setDeepScanSteps(response.steps);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deep scan failed.';
      setDeepScanError(message);
      toast.error(message);
      throw error;
    } finally {
      setDeepScanLoading(false);
    }
  }, []);

  const buildSearchContext = useCallback(
    async (searchQuery: string) => {
      const context: Record<string, unknown> = {
        mode: 'research',
        includeCounterpoints,
        region: region !== 'global' ? region : undefined,
        recencyWeight,
        authorityWeight,
      };

      const activeTab = tabs.find(tab => tab.id === activeId);
      if (activeTab) {
        context.active_tab = {
          url: activeTab.url,
          title: activeTab.title,
        };
      }

      if (uploadedDocuments.length > 0) {
        context.documents = uploadedDocuments.map(doc => ({
          name: doc.name,
          text: doc.text.slice(0, 5000),
          type: doc.type,
          size: doc.size,
        }));
      }

      try {
        const memoryMatches = await semanticSearchMemories(searchQuery, {
          limit: 5,
          minSimilarity: 0.6,
        });
        const relevantMemories = memoryMatches.map(m => ({
          value: m.event.value,
          metadata: m.event.metadata,
          id: m.event.id,
          type: m.event.type,
          similarity: m.similarity,
        }));
        if (relevantMemories.length > 0) {
          context.memories = relevantMemories;
        }
      } catch (error) {
        console.warn('[Research] Failed to fetch memory context:', error);
      }

      return context;
    },
    [
      activeId,
      tabs,
      includeCounterpoints,
      region,
      recencyWeight,
      authorityWeight,
      uploadedDocuments,
    ]
  );

  const queryKey = useMemo(
    () => (result?.query ? buildQueryKey(result.query) : null),
    [result?.query]
  );

  // File upload handlers
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newDocuments: UploadedDocument[] = [];

    for (const file of Array.from(files)) {
      try {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();

        let extractedText = '';

        // Extract text based on file type
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
          extractedText = await parsePdfFile(file);
        } else if (
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          fileName.endsWith('.docx')
        ) {
          extractedText = await parseDocxFile(file);
        } else if (
          fileType === 'text/plain' ||
          fileType === 'text/markdown' ||
          fileName.endsWith('.txt') ||
          fileName.endsWith('.md')
        ) {
          // Plain text files
          extractedText = await file.text();
        } else {
          console.warn(`[Research] Unsupported file type: ${fileType} (${file.name})`);
          continue;
        }

        if (extractedText.trim().length > 0) {
          newDocuments.push({
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            name: file.name,
            text: extractedText.trim(),
            type: fileType || 'unknown',
            size: file.size,
          });
        }
      } catch (err) {
        console.error(`[Research] Failed to parse file ${file.name}:`, err);
      }
    }

    setUploadedDocuments(prev => [...prev, ...newDocuments]);
    setUploading(false);
  };

  const handleRemoveDocument = (id: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleSearch = async (input?: string) => {
    const searchQuery = typeof input === 'string' ? input : query;
    if (!searchQuery.trim()) return;

    // TELEMETRY FIX: Track search feature usage
    import('../../services/telemetryMetrics')
      .then(({ telemetryMetrics }) => {
        telemetryMetrics.trackFeature('search_executed', { mode: 'research' });
      })
      .catch(() => {
        // Telemetry not available
      });

    const searchStartTime = performance.now();

    // Phase 2: Auto-detect language using multi-language AI
    if (language === 'auto' && searchQuery.trim().length > 2) {
      try {
        // Use new multi-language AI for detection
        const detectedLang = await multiLanguageAI.detectLanguage(searchQuery);
        setDetectedLang(detectedLang);

        if (detectedLang !== 'en') {
          useSettingsStore.getState().setLanguage(detectedLang);
          console.log('[Research] Auto-detected language:', detectedLang);
        }
      } catch {
        // Fallback to old detection
        try {
          const detection = await detectLanguage(searchQuery, {
            preferIndic: true,
            useBackend: true,
          });
          if (detection.confidence > 0.7) {
            const detectedLang = detection.language;
            if (detectedLang !== 'en' || detection.isIndic) {
              useSettingsStore.getState().setLanguage(detectedLang);
              setDetectedLang(detectedLang);
            }
          }
        } catch (fallbackError) {
          console.warn('[Research] Language auto-detection failed:', fallbackError);
        }
      }
    }

    // Phase 2: Translate query if needed (for multi-language search)
    const currentLang = language !== 'auto' ? language : detectedLang;
    if (currentLang && currentLang !== 'en') {
      try {
        // Search in original language, but also prepare English version for backend
        const englishQuery = await multiLanguageAI.translate(
          searchQuery,
          'en',
          currentLang as SupportedLanguage
        );
        // Use both queries for better results
        console.log('[Research] Original query:', searchQuery, 'English:', englishQuery);
      } catch (error) {
        console.warn('[Research] Query translation failed:', error);
      }
    }

    setLoading(true);
    setLoadingMessage('Researching...');
    toast.loading('Researching...', { duration: 0 }); // Persistent loading toast
    setError(null);
    setResult(null);
    setActiveSourceId(null);

    // SEARCH SYSTEM VERIFICATION: Check search health before proceeding
    const searchHealth = getSearchHealth();
    if (searchHealth && searchHealth.status === 'offline') {
      setError('Search system is offline. Please check your connection.');
      setLoading(false);
      toast.error('Search system offline');
      return;
    }

    let aggregatedSources: ResearchSource[] = [];
    let aggregatedProviderNames: string[] = [];
    let scrapedSnapshots: ScrapedSourceResult[] = [];

    try {
      if (!useHybridSearch) {
        aiMetaRef.current = {
          provider: 'mock',
          model: 'offline',
        };
        setResult(generateMockResult(searchQuery));
        return;
      }

      const context: any = await buildSearchContext(searchQuery);

      if (deepScanEnabled) {
        const deepScanResult = await runDeepScanFlow(searchQuery);
        aggregatedSources = deepScanResult.sources.map((source, idx) =>
          mapDeepScanSourceToResearchSource(source, idx)
        );
        aggregatedProviderNames = ['deep-scan'];
        context.deep_scan = {
          created_at: deepScanResult.created_at,
          steps: deepScanResult.steps,
        };
      } else {
        // Try Tauri IPC first if available (real-time, streaming support)
        let backendResult: any = null;
        const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

        if (isTauri && ipc) {
          try {
            // Try research_api command (combines search + Ollama)
            const tauriResult = await (ipc as any).invoke('research_api', { query: searchQuery });
            if (tauriResult) {
              backendResult = {
                summary: tauriResult.summary || tauriResult.answer || '',
                sources: (tauriResult.sources || []).map((s: any, idx: number) => ({
                  title: s.Text || s.title || `Source ${idx + 1}`,
                  url: s.FirstURL || s.url || '',
                  snippet: s.Text || s.snippet || '',
                  sourceType: 'web',
                })),
                citations: tauriResult.citations || 0,
                hallucination: tauriResult.hallucination || 'medium',
              };
              console.log('[Research] Tauri IPC returned result:', backendResult);
            }
          } catch (tauriError) {
            console.warn('[Research] Tauri IPC failed, trying HTTP API:', tauriError);
          }
        }

        // Fallback to HTTP API if Tauri IPC not available or failed
        // Always try backend API - it may be running even in web mode
        if (!backendResult) {
          try {
            console.log('[Research] Attempting HTTP API call to backend...');
            backendResult = await researchApi.queryEnhanced({
              query: searchQuery,
              maxSources: 12,
              includeCounterpoints,
              recencyWeight,
              authorityWeight,
              language: language !== 'auto' ? language : undefined,
            });
            console.log(
              '[Research] Backend API returned result:',
              backendResult ? 'success' : 'empty'
            );
          } catch (apiError) {
            // Log the error for debugging
            const errorMsg = apiError instanceof Error ? apiError.message : String(apiError);
            console.warn('[Research] Backend API call failed (will use fallback):', errorMsg);

            // Show user-friendly message if backend is clearly offline
            if (
              errorMsg.includes('fetch') ||
              errorMsg.includes('network') ||
              errorMsg.includes('ECONNREFUSED') ||
              errorMsg.includes('Failed to fetch')
            ) {
              toast.info('Backend server is offline. Using fallback search engines...', {
                duration: 3000,
              });
            }

            // Continue with fallback - backend is optional
            backendResult = null;
          }
        }

        if (backendResult) {
          // Map sources
          if (backendResult.sources && backendResult.sources.length > 0) {
            aggregatedSources = backendResult.sources.map((source: any, idx: number) => ({
              id: `backend-${idx}`,
              title: source.title || 'Untitled',
              url: source.url || '',
              domain: source.domain || new URL(source.url || 'http://example.com').hostname,
              snippet: source.snippet || '',
              text: source.snippet || '',
              type: source.sourceType || 'other',
              sourceType: source.sourceType || 'other',
              relevanceScore: Math.round((source.relevanceScore || 0.5) * 100),
              timestamp: source.timestamp || Date.now(),
              metadata: {
                provider: 'backend-api',
              },
            }));
            aggregatedProviderNames = ['backend-api'];
          }

          // Use backend summary if available
          if (backendResult.summary) {
            context.backend_summary = backendResult.summary;
          }

          // Store metrics for verification
          if (backendResult.citations !== undefined || backendResult.hallucination) {
            context.backend_metrics = {
              citations: backendResult.citations || 0,
              hallucination: backendResult.hallucination || 'medium',
            };
          }

          console.log(
            `[Research] Backend API returned ${aggregatedSources.length} results with summary and metrics`
          );
        }

        // Fallback to multi-source search if backend API failed or returned no results
        if (aggregatedSources.length === 0) {
          try {
            console.log('[Research] Using fallback search (optimizedSearch)...');
            setLoadingMessage('Searching with fallback engines...');

            // OPTIMIZED SEARCH: Use optimized search service for better reliability
            const optimizedResults = await optimizedSearch(searchQuery, {
              count: 20,
              language,
              timeout: 10000,
            });

            console.log('[Research] Fallback search returned', optimizedResults.length, 'results');

            // Convert optimized results to multi-source format
            const multiSourceResults: MultiSourceSearchResult[] = optimizedResults.map(r => ({
              title: r.title,
              url: r.url,
              snippet: r.snippet,
              source: r.provider,
              score: r.score,
              domain: r.domain,
            }));
            if (multiSourceResults.length > 0) {
              aggregatedSources = multiSourceResults.map((hit, idx) =>
                mapMultiSourceResultToSource(hit, idx)
              );
              aggregatedProviderNames = Array.from(
                new Set(
                  multiSourceResults.map(hit =>
                    typeof hit.source === 'string' ? hit.source.toLowerCase() : 'web'
                  )
                )
              );
              context.multi_source_results = multiSourceResults.slice(0, 8).map(hit => ({
                title: hit.title,
                url: hit.url,
                snippet: hit.snippet.slice(0, 300),
                provider: hit.source,
                score: hit.score,
              }));

              const urlsToScrape = aggregatedSources
                .filter(source => Boolean(source.url))
                .slice(0, 4)
                .map(source => source.url as string);
              if (urlsToScrape.length > 0) {
                scrapedSnapshots = await scrapeResearchSources(urlsToScrape, {
                  max_chars: 12000,
                  allow_render: true,
                });
                if (scrapedSnapshots.length > 0) {
                  aggregatedSources = mergeScrapedSnapshots(aggregatedSources, scrapedSnapshots);
                  context.scraped_sources = scrapedSnapshots.slice(0, 3).map(snapshot => ({
                    url: snapshot.finalUrl ?? snapshot.url,
                    title: snapshot.title,
                    excerpt: snapshot.excerpt?.slice(0, 400),
                    word_count: snapshot.wordCount,
                    rendered: snapshot.rendered,
                  }));
                }
              }
            }
          } catch (multiSourceError) {
            console.warn('[Research] Multi-source search failed:', multiSourceError);
            // Don't give up - try next fallback
            if (aggregatedSources.length === 0) {
              toast.info('Primary search failed, trying alternative engines...', {
                duration: 2000,
              });
            }
          }
        }

        // Final fallback to live web search if all else fails
        if (aggregatedSources.length === 0) {
          console.log('[Research] No results from optimizedSearch, trying live web search...');
          toast.info('Using alternative search engine...', { duration: 2000 });
          try {
            const liveResults = await performLiveWebSearch(searchQuery, {
              count: 15,
              language: language !== 'auto' ? language : undefined,
            });

            if (liveResults.length > 0) {
              aggregatedSources = liveResults.map((hit, idx) => ({
                id: `live-${hit.provider}-${idx}`,
                title: hit.title,
                url: hit.url,
                domain: hit.domain,
                snippet: hit.snippet,
                text: hit.snippet,
                type: inferSourceType(hit.domain),
                sourceType: inferSourceType(hit.domain),
                relevanceScore: Math.round(hit.score * 100),
                timestamp: Date.now(),
                metadata: {
                  provider: hit.provider,
                },
              }));
              aggregatedProviderNames = Array.from(new Set(liveResults.map(r => r.provider)));

              console.log(
                `[Research] Live web search returned ${liveResults.length} results from ${aggregatedProviderNames.join(', ')}`
              );
            }
          } catch (liveSearchError) {
            console.warn('[Research] Live web search failed:', liveSearchError);
          }
        }

        // If we got a backend result with summary, use it directly
        if (
          backendResult &&
          (backendResult.summary || backendResult.answer) &&
          aggregatedSources.length > 0
        ) {
          const dedupedSources = dedupeResearchSources(aggregatedSources);

          // Map backend metrics to verification
          const citations = backendResult.citations || aggregatedSources.length || 0;
          const hallucination = backendResult.hallucination || 'medium';
          const hallucinationRisk =
            hallucination === 'low' ? 0.2 : hallucination === 'medium' ? 0.5 : 0.8;
          const citationCoverage = Math.min(
            (citations / Math.max(aggregatedSources.length, 1)) * 100,
            100
          );

          // TELEMETRY FIX: Track successful search latency
          const searchLatency = performance.now() - searchStartTime;
          import('../../services/telemetryMetrics')
            .then(({ telemetryMetrics }) => {
              telemetryMetrics.trackPerformance('search_latency', searchLatency, 'ms', {
                provider: 'backend',
                resultCount: dedupedSources.length,
              });
            })
            .catch(() => {
              // Telemetry not available
            });

          setResult({
            query: searchQuery,
            summary: backendResult.summary || backendResult.answer || '',
            sources: dedupedSources.slice(0, 16),
            citations: backendResult.citations || [],
            inlineEvidence: [],
            contradictions: backendResult.contradictions || [],
            verification: {
              verified: hallucination === 'low',
              claimDensity: aggregatedSources.length,
              citationCoverage: citationCoverage,
              ungroundedClaims: [],
              hallucinationRisk: hallucinationRisk,
              suggestions:
                hallucination === 'high' ? ['Consider verifying with additional sources'] : [],
            },
            confidence: backendResult.confidence || (hallucination === 'low' ? 0.8 : 0.6),
            language: backendResult.language || language,
            languageLabel: backendResult.languageLabel || getLanguageMeta(language).nativeName,
            languageConfidence: backendResult.languageConfidence || 0.9,
          });
          setLoading(false);
          setLoadingMessage(null);
          toast.dismiss();
          return;
        }

        // Try Tauri streaming if available and no result yet
        // Reuse isTauri from above (line 835) - no need to redeclare
        if (isTauri && ipc && aggregatedSources.length === 0) {
          try {
            // Set up streaming listeners
            let streamedText = '';
            let streamCitations = 0;
            let streamHallucination = 'medium';

            const handleToken = (e: CustomEvent) => {
              if (typeof e.detail === 'string') {
                streamedText += e.detail;
                // Update result in real-time
                setResult(prev => ({
                  ...prev,
                  query: searchQuery,
                  summary: streamedText,
                  sources: prev?.sources || [],
                  citations: prev?.citations || [],
                  inlineEvidence: [],
                  contradictions: [],
                  verification: {
                    verified: streamHallucination === 'low',
                    claimDensity: aggregatedSources.length,
                    citationCoverage:
                      streamCitations > 0
                        ? Math.min(
                            (streamCitations / Math.max(aggregatedSources.length, 1)) * 100,
                            100
                          )
                        : 0,
                    ungroundedClaims: [],
                    hallucinationRisk:
                      streamHallucination === 'low'
                        ? 0.2
                        : streamHallucination === 'medium'
                          ? 0.5
                          : 0.8,
                    suggestions:
                      streamHallucination === 'high'
                        ? ['Consider verifying with additional sources']
                        : [],
                  },
                  confidence: streamHallucination === 'low' ? 0.8 : 0.6,
                  language: language,
                  languageLabel: getLanguageMeta(language).nativeName,
                  languageConfidence: 0.9,
                }));
              }
            };

            const handleMetrics = (e: CustomEvent) => {
              if (e.detail) {
                streamCitations = e.detail.citations || 0;
                streamHallucination = e.detail.hallucination || 'medium';
              }
            };

            const handleEnd = (e: CustomEvent) => {
              if (e.detail) {
                streamedText = e.detail.response || streamedText;
                streamCitations = e.detail.citations || streamCitations;
                streamHallucination = e.detail.hallucination || streamHallucination;
              }
              // Remove listeners
              window.removeEventListener('research-token', handleToken as EventListener);
              window.removeEventListener('research-metrics', handleMetrics as EventListener);
              window.removeEventListener('research-end', handleEnd as EventListener);
              setLoading(false);
              setLoadingMessage(null);
              toast.dismiss();
            };

            // Add listeners
            window.addEventListener('research-token', handleToken as EventListener);
            window.addEventListener('research-metrics', handleMetrics as EventListener);
            window.addEventListener('research-end', handleEnd as EventListener);

            // Start streaming (Tauri command expects query as first parameter, window is auto-injected)
            await (ipc as any).invoke('research_stream', { query: searchQuery });

            // Set initial result
            setResult({
              query: searchQuery,
              summary: '',
              sources: [],
              citations: [],
              inlineEvidence: [],
              contradictions: [],
              verification: {
                verified: false,
                claimDensity: 0,
                citationCoverage: 0,
                ungroundedClaims: [],
                hallucinationRisk: 0.5,
                suggestions: [],
              },
              confidence: 0.5,
              language: language,
              languageLabel: getLanguageMeta(language).nativeName,
              languageConfidence: 0.9,
            });

            return; // Exit early, streaming will update result
          } catch (streamError) {
            console.warn('[Research] Tauri streaming failed:', streamError);
            // Continue to fallback
          }
        }
      }

      // Use unified AI engine for research queries
      try {
        let streamedText = '';
        let streamedResult: AITaskResult | null = null;

        // Build a comprehensive prompt that includes sources if available
        let researchPrompt = searchQuery;
        if (aggregatedSources.length > 0) {
          // Include top sources in the prompt for better context
          const topSources = aggregatedSources
            .slice(0, 8)
            .map((source, idx) => {
              return `[${idx + 1}] ${source.title}\n${source.snippet || source.text || ''}\nURL: ${source.url || 'N/A'}`;
            })
            .join('\n\n');

          researchPrompt = `Research Question: ${searchQuery}\n\nBased on the following sources, provide a comprehensive answer:\n\n${topSources}\n\nAnswer:`;
        } else if (scrapedSnapshots.length > 0) {
          // Use scraped content if available
          const scrapedContent = scrapedSnapshots
            .slice(0, 3)
            .map((snapshot, idx) => {
              return `[${idx + 1}] ${snapshot.title}\n${snapshot.excerpt || ''}`;
            })
            .join('\n\n');

          researchPrompt = `Research Question: ${searchQuery}\n\nBased on the following content:\n\n${scrapedContent}\n\nAnswer:`;
        }

        const aiResult = await aiEngine.runTask(
          {
            kind: 'search',
            prompt: researchPrompt,
            context: {
              ...context,
              sources: aggregatedSources.slice(0, 10).map(s => ({
                title: s.title,
                url: s.url,
                snippet: s.snippet || s.text,
              })),
              query: searchQuery,
            },
            mode: 'research',
            metadata: {
              includeCounterpoints,
              region: region !== 'global' ? region : undefined,
              recencyWeight,
              authorityWeight,
              language: language !== 'auto' ? language : undefined,
              sourceCount: aggregatedSources.length,
            },
            llm: {
              temperature: 0.2,
              maxTokens: 1500, // Increased for better answers
              systemPrompt:
                "You are ReGen's research copilot. Provide comprehensive, well-structured answers based on the provided sources. Cite sources as [n] when referencing them. If sources are provided, use them to answer the question. If no sources are provided, provide a general answer based on your knowledge.",
            },
          },
          event => {
            if (event.type === 'token' && typeof event.data === 'string') {
              streamedText += event.data;
              // Update result with streaming text in real-time
              if (streamedText.length > 50) {
                setResult(prev => ({
                  ...prev,
                  query: searchQuery,
                  summary: streamedText,
                  sources: prev?.sources || aggregatedSources.slice(0, 16),
                  citations: prev?.citations || [],
                  inlineEvidence: [],
                  contradictions: [],
                  verification: prev?.verification || {
                    score: 0.7,
                    confidence: 'medium',
                    suggestions: [],
                  },
                  confidence: 0.75,
                }));
              }
            } else if (event.type === 'done' && typeof event.data !== 'string') {
              streamedResult = event.data as AITaskResult;
            } else if (event.type === 'error') {
              console.error('[Research] AI engine error:', event.data);
              throw new Error(typeof event.data === 'string' ? event.data : 'AI engine error');
            }
          }
        );

        const finalResult = streamedResult ?? aiResult;
        aiMetaRef.current = {
          provider: finalResult?.provider || 'ai',
          model: finalResult?.model,
        };
        const finalAnswer = streamedText || finalResult?.text || '';

        // Auto-generate graph from AI response if available
        if (finalAnswer && typeof window !== 'undefined' && window.graph) {
          try {
            // Extract key concepts from AI response
            const concepts = finalAnswer.split(/[.,;]/).slice(0, 5);
            for (const concept of concepts) {
              const trimmed = concept.trim();
              if (trimmed.length > 3 && trimmed.length < 50) {
                await window.graph.add({
                  id: `research-${Date.now()}-${Math.random()}`,
                  label: trimmed,
                  type: 'research-concept',
                });
              }
            }
            await refreshGraph();
          } catch (graphError) {
            console.debug('[Research] Auto-graph generation failed:', graphError);
          }
        }

        // Convert AI result to ResearchResult format
        const sources: ResearchSource[] = [...aggregatedSources];

        // Add citations from AI response as sources
        if (finalResult?.citations && finalResult.citations.length > 0) {
          sources.push(
            ...finalResult.citations.map((cite, idx) => {
              let domain = cite.source || '';
              try {
                if (cite.url) {
                  domain = new URL(cite.url).hostname;
                }
              } catch {
                // Invalid URL, use source or empty
                domain = cite.source || '';
              }
              const citationType: ResearchSourceType = inferSourceType(domain);
              return {
                id: `ai-citation-${idx}`,
                title: cite.title || cite.url || `Source ${idx + 1}`,
                url: cite.url || '',
                domain,
                snippet: cite.snippet || '',
                text: cite.snippet || '',
                type: citationType,
                sourceType: citationType,
                relevanceScore: 95 - idx * 3,
                timestamp: Date.now(),
                metadata: {
                  provider: 'ai-citation',
                },
              };
            })
          );
        }

        // Add uploaded documents as sources
        if (uploadedDocuments.length > 0) {
          sources.push(
            ...uploadedDocuments.map((doc, idx) => ({
              id: doc.id,
              title: doc.name,
              url: '',
              domain: 'uploaded',
              snippet: doc.text.slice(0, 200) + (doc.text.length > 200 ? '...' : ''),
              text: doc.text,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 98 - idx, // High relevance for uploaded documents
              timestamp: Date.now(),
              metadata: {
                provider: 'uploaded-doc',
              },
            }))
          );
        }

        // Add local search results (legacy lunr index)
        try {
          const localResults = await searchLocal(searchQuery);
          sources.push(
            ...localResults.map((lr, idx) => ({
              id: `local-${lr.id}`,
              title: lr.title,
              url: '',
              domain: 'local',
              snippet: lr.snippet,
              text: lr.snippet,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 85 - idx * 3,
              timestamp: Date.now(),
              metadata: {
                provider: 'local-index',
              },
            }))
          );
        } catch (localError) {
          console.debug('[Research] Local search failed:', localError);
        }

        // Search offline RAG documents
        try {
          const offlineRAGResults = await searchOfflineDocuments(searchQuery, { limit: 5 });
          if (offlineRAGResults && offlineRAGResults.documents.length > 0) {
            sources.push(
              ...offlineRAGResults.documents.map((ragDoc, idx) => ({
                id: `offline-rag-${ragDoc.document.id}`,
                title: ragDoc.document.title,
                url: ragDoc.document.url || '',
                domain: ragDoc.document.url ? new URL(ragDoc.document.url).hostname : 'offline',
                snippet: ragDoc.document.excerpt || ragDoc.document.content.slice(0, 200),
                text: ragDoc.document.content.slice(0, 500),
                type: 'documentation' as ResearchSourceType,
                sourceType: 'documentation' as ResearchSourceType,
                relevanceScore: Math.round(ragDoc.relevance * 100) - idx,
                timestamp: ragDoc.document.indexedAt,
                metadata: {
                  provider: 'offline-rag',
                  documentId: ragDoc.document.id,
                  accessCount: ragDoc.document.accessCount,
                  ...ragDoc.document.metadata,
                },
              }))
            );
          }
        } catch (offlineError) {
          console.debug('[Research] Offline RAG search failed:', offlineError);
        }

        // Build inline citations from AI response
        const inlineCitations =
          finalResult?.citations?.map((cite, idx) => ({
            id: `citation-${idx}`,
            text: cite.title || cite.url || `Source ${idx + 1}`,
            url: cite.url || '',
            position:
              finalAnswer.indexOf(cite.title || '') >= 0
                ? finalAnswer.indexOf(cite.title || '')
                : idx * 50, // Approximate position
          })) || [];

        const dedupedSources = dedupeResearchSources(sources);

        // Ensure we have a valid answer
        const finalSummary = finalAnswer.trim() || streamedText.trim();
        if (!finalSummary || finalSummary === 'No answer generated') {
          // If no answer was generated, create one from sources
          if (dedupedSources.length > 0) {
            const sourceSummary = dedupedSources
              .slice(0, 3)
              .map(
                (s, idx) =>
                  `${idx + 1}. ${s.title}: ${(s.snippet || s.text || '').slice(0, 150)}...`
              )
              .join('\n\n');
            setResult({
              query: searchQuery,
              summary: `Based on ${dedupedSources.length} source(s):\n\n${sourceSummary}`,
              sources: dedupedSources.slice(0, 16),
              citations: inlineCitations,
              inlineEvidence: [],
              contradictions: [],
              verification: {
                score: 0.7,
                confidence: 'medium',
                suggestions: ['AI answer generation failed, showing source summaries instead'],
              },
              confidence: 0.65,
            });
          } else {
            setError(
              'Unable to generate answer. Please try a different query or check your connection.'
            );
            setLoading(false);
            setLoadingMessage(null);
            toast.dismiss();
            toast.error('Research failed - no sources found');
            return;
          }
        } else {
          setResult({
            query: searchQuery,
            summary: finalSummary,
            sources: dedupedSources.slice(0, 16),
            citations: inlineCitations,
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.8,
              confidence: 'high',
              suggestions: [
                `AI-generated response using ${finalResult?.provider || 'unknown'} (${finalResult?.model || 'unknown'})`,
                ...(finalResult?.citations?.length
                  ? [`${finalResult.citations.length} citation(s) included`]
                  : []),
                ...(dedupedSources.length > 0
                  ? [`Based on ${dedupedSources.length} source(s)`]
                  : []),
              ],
            },
            confidence: Math.min(0.95, Math.max(0.45, finalResult?.confidence ?? 0.82)),
          });
        }
        setLoading(false);
        setLoadingMessage(null);
        toast.dismiss();
        toast.success('Research complete');
        return;
      } catch (aiError) {
        console.error('[Research] AI engine failed:', aiError);
        const errorMessage = aiError instanceof Error ? aiError.message : String(aiError);
        console.warn('[Research] Falling back to legacy search:', errorMessage);

        if (aggregatedSources.length > 0) {
          const providerLabel =
            aggregatedProviderNames.length > 0
              ? aggregatedProviderNames.map(provider => formatProviderName(provider)).join(', ')
              : 'multi-source web';
          const dedupedAggregated = dedupeResearchSources(aggregatedSources);
          const topTitles = dedupedAggregated
            .slice(0, 3)
            .map(source => source.title)
            .join('; ');
          const scrapedSummary = scrapedSnapshots.find(snapshot => snapshot.excerpt)?.excerpt;
          aiMetaRef.current = {
            provider: 'multi-source',
            model: 'aggregate',
          };

          setResult({
            query: searchQuery,
            summary: scrapedSummary?.length
              ? scrapedSummary
              : topTitles.length > 0
                ? `Multi-source (${providerLabel}) search returned ${dedupedAggregated.length} results. Top hits: ${topTitles}.`
                : `Multi-source (${providerLabel}) search returned ${dedupedAggregated.length} results.`,
            sources: dedupedAggregated.slice(0, 16),
            citations: [],
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.65,
              confidence: 'medium',
              suggestions: [`Review ${providerLabel} sources manually.`],
            },
            confidence: 0.62,
          });
          return;
        }

        // OPTIMIZED SEARCH: Try optimized search as primary fallback
        const optimizedResults = await optimizedSearch(searchQuery, {
          count: 10,
          language,
          timeout: 6000,
        });

        if (optimizedResults.length > 0) {
          const sources: ResearchSource[] = optimizedResults.map((r, idx) => ({
            id: `opt-fallback-${idx}`,
            title: r.title,
            url: r.url,
            domain: r.domain,
            snippet: r.snippet,
            text: r.snippet,
            type: inferSourceType(r.domain),
            sourceType: inferSourceType(r.domain),
            relevanceScore: r.score * 100,
            timestamp: r.timestamp,
            metadata: {
              provider: r.provider,
            },
          }));

          setResult({
            query: searchQuery,
            summary: `Found ${sources.length} result${sources.length === 1 ? '' : 's'} for "${searchQuery}"`,
            sources: dedupeResearchSources(sources).slice(0, 16),
            citations: [],
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.65,
              confidence: 'medium',
              suggestions: [`Results from ${optimizedResults[0]?.provider || 'optimized'} search`],
            },
            confidence: 0.6,
          });
          return;
        }

        // Final fallback to DuckDuckGo Instant Answer API
        const duckResult = await fetchDuckDuckGoInstant(searchQuery, language);
        if (duckResult) {
          aiMetaRef.current = {
            provider: 'duckduckgo',
            model: 'instant-answer',
          };
          const formatted = formatDuckDuckGoResults(duckResult);

          // Also try local search
          const localResults = await searchLocal(searchQuery).catch(() => []);

          // Convert to ResearchResult format
          const sources: ResearchSource[] = [
            // DuckDuckGo instant answer
            ...(duckResult.Heading && duckResult.AbstractText
              ? [
                  {
                    id: 'duck-instant',
                    title: duckResult.Heading,
                    url: duckResult.AbstractURL || '',
                    domain: duckResult.AbstractURL
                      ? extractDomain(duckResult.AbstractURL)
                      : 'duckduckgo.com',
                    snippet: duckResult.AbstractText,
                    text: duckResult.AbstractText,
                    type: 'news' as ResearchSourceType,
                    sourceType: 'news' as ResearchSourceType,
                    relevanceScore: 100,
                    timestamp: Date.now(),
                  },
                ]
              : []),
            // DuckDuckGo web results
            ...formatted
              .filter(f => f.type === 'result' && f.url)
              .map((f, idx) => {
                const domain = f.url ? extractDomain(f.url) : '';
                const sourceType = inferSourceType(domain);
                return {
                  id: `duck-result-${idx}`,
                  title: f.title,
                  url: f.url || '',
                  domain,
                  snippet: f.snippet,
                  text: f.snippet,
                  type: sourceType,
                  sourceType,
                  relevanceScore: 85 - idx * 5,
                  timestamp: Date.now(),
                };
              }),
            // Local docs results
            ...localResults.map((lr, idx) => ({
              id: `local-${lr.id}`,
              title: lr.title,
              url: '',
              domain: 'local',
              snippet: lr.snippet,
              text: lr.snippet,
              type: 'documentation' as ResearchSourceType,
              sourceType: 'documentation' as ResearchSourceType,
              relevanceScore: 90 - idx * 3,
              timestamp: Date.now(),
              metadata: {
                provider: 'local-index',
              },
            })),
          ];

          setResult({
            query: searchQuery,
            summary:
              duckResult.AbstractText ||
              duckResult.Answer ||
              duckResult.Definition ||
              `Found ${sources.length} result${sources.length === 1 ? '' : 's'} for "${searchQuery}"`,
            sources: dedupeResearchSources(sources).slice(0, 16),
            citations: [],
            inlineEvidence: [],
            contradictions: [],
            verification: {
              score: 0.7,
              confidence: 'medium',
              suggestions: ['Results from DuckDuckGo Instant Answer API'],
            },
            confidence: 0.58,
          });
        } else {
          // Final fallback: try local search only
          const localResults = await searchLocal(searchQuery).catch(() => []);
          if (localResults.length > 0) {
            aiMetaRef.current = {
              provider: 'local-index',
              model: 'documents',
            };
            setResult({
              query: searchQuery,
              summary: `Found ${localResults.length} local result${localResults.length === 1 ? '' : 's'}`,
              sources: localResults.map((lr, idx) => ({
                id: `local-${lr.id}`,
                title: lr.title,
                url: '',
                domain: 'local',
                snippet: lr.snippet,
                text: lr.snippet,
                type: 'documentation' as ResearchSourceType,
                sourceType: 'documentation' as ResearchSourceType,
                relevanceScore: 90 - idx * 3,
                timestamp: Date.now(),
                metadata: {
                  provider: 'local-index',
                },
              })),
              citations: [],
              inlineEvidence: [],
              contradictions: [],
              verification: {
                score: 0.6,
                confidence: 'low',
                suggestions: ['Results from local index only'],
              },
              confidence: 0.52,
            });
          } else {
            throw new Error(
              'No search results available. Please check your connection or try a different query.'
            );
          }
        }
      }
    } catch (err) {
      console.error('Research query failed:', err);

      // SEARCH SYSTEM VERIFICATION: Enhanced error handling with offline fallback
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unable to complete the research request. Please try again.';

      // Try offline fallback if MeiliSearch is down
      const searchHealth = getSearchHealth();
      if (searchHealth && !searchHealth.meiliSearch && searchHealth.localSearch) {
        try {
          console.log('[Research] Attempting offline search fallback...');
          const localResults = await searchLocal(searchQuery, { limit: 10 });
          if (localResults && localResults.length > 0) {
            // Convert local results to ResearchSource format
            const localSources = localResults.map((result: any, idx: number) => ({
              id: `local-${idx}`,
              url: result.url || '',
              title: result.title || 'Local Result',
              snippet: result.snippet || '',
              sourceType: 'local' as ResearchSourceType,
              relevanceScore: result.score || 50,
            }));

            // Create a basic result from local search
            setResult({
              query: searchQuery,
              summary: `Found ${localResults.length} local result(s) for "${searchQuery}"`,
              sources: localSources,
              citations: localSources.length,
              confidence: 0.6,
              processingTimeMs: 100,
            });

            toast.success(`Found ${localResults.length} local result(s)`);
            setError(null);
            return;
          }
        } catch (fallbackError) {
          console.warn('[Research] Offline fallback also failed:', fallbackError);
          const fallbackErrorMsg =
            fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          setError(
            `All search methods failed. ${fallbackErrorMsg}. ${searchHealth?.error ? `(${searchHealth.error})` : 'Backend is offline and fallback engines are not responding. Please check your internet connection or start the backend server with: npm run dev:server'}`
          );
          toast.error('Search failed: All engines offline. Check connection or start backend.');
        }
      }

      // Only set error if we haven't set it in the catch block above and errorMessage is defined
      if (typeof errorMessage !== 'undefined' && !error) {
        setError(
          `Search failed: ${errorMessage}. ${searchHealth?.error ? `(${searchHealth.error})` : ''}`
        );
        toast.error(`Search failed: ${errorMessage}`);
      }

      // TELEMETRY FIX: Track failed search latency
      const searchLatency = performance.now() - searchStartTime;
      import('../../services/telemetryMetrics')
        .then(({ telemetryMetrics }) => {
          telemetryMetrics.trackPerformance('search_latency', searchLatency, 'ms', {
            provider: 'failed',
            error: errorMessage,
          });
        })
        .catch(() => {
          // Telemetry not available
        });
    } finally {
      setLoading(false);
      setLoadingMessage(null);
      toast.dismiss();
    }
  };

  useEffect(() => {
    const handleQuickstart = (event: Event) => {
      const detail = (event as CustomEvent<{ query?: string }>).detail;
      if (!detail?.query) return;
      setQuery(detail.query);
      setTimeout(() => {
        void handleSearch(detail.query);
      }, 100);
    };

    window.addEventListener('research:quickstart', handleQuickstart as EventListener);
    return () => {
      window.removeEventListener('research:quickstart', handleQuickstart as EventListener);
    };
  }, []);

  useEffect(() => {
    void refreshGraph();
  }, [refreshGraph]);

  useEffect(() => {
    if (!result || typeof window === 'undefined' || !window.graph?.add) return;

    const signature = JSON.stringify({
      query: result.query,
      sources: result.sources.map(source => source.url || source.title),
      citations: result.citations?.length ?? 0,
      evidence: (result.inlineEvidence ?? []).length,
    });

    if (graphSignatureRef.current === signature) {
      void refreshGraph();
      return;
    }

    graphSignatureRef.current = signature;
    const currentQueryKey = buildQueryKey(result.query);

    const queryEdges = result.sources.map((source, idx) => ({
      src: currentQueryKey,
      dst: buildSourceKey(source, idx),
      rel: 'supports',
      weight: Math.round(source.relevanceScore || 40),
    }));

    window.graph.add(
      {
        key: currentQueryKey,
        type: 'research-query',
        title: result.query.slice(0, 160),
        meta: {
          query: result.query,
          createdAt: Date.now(),
        },
      },
      queryEdges
    );

    result.sources.forEach((source, idx) => {
      const sourceKey = buildSourceKey(source, idx);
      const relatedEvidence = (result.inlineEvidence ?? [])
        .filter(item => item.sourceIndex === idx)
        .slice(0, 6);

      const evidenceEdges = relatedEvidence.map(item => ({
        src: sourceKey,
        dst: buildEvidenceKey(sourceKey, item.citationIndex ?? item.from ?? idx),
        rel: 'evidence',
        weight: 1,
      }));

      window.graph.add(
        {
          key: sourceKey,
          type: 'research-source',
          title: source.title,
          meta: {
            url: source.url,
            domain: source.domain,
            snippet: source.snippet || source.text?.slice(0, 140),
            relevance: source.relevanceScore,
          },
        },
        evidenceEdges
      );

      relatedEvidence.forEach(item => {
        const evidenceKey = buildEvidenceKey(sourceKey, item.citationIndex ?? item.from ?? idx);
        const citation = result.citations?.find(entry => entry.index === item.citationIndex);
        window.graph.add({
          key: evidenceKey,
          type: 'research-evidence',
          title: citation?.quote || item.quote || 'Highlighted evidence',
          meta: {
            sourceKey,
            snippet: citation?.quote || item.quote,
            fragmentUrl: (item as any)?.quoteUrl || source.url,
          },
        });
      });
    });

    (result.contradictions ?? []).forEach(contradiction => {
      if (!Array.isArray(contradiction.sources) || contradiction.sources.length < 2) return;
      const [first, ...rest] = contradiction.sources;
      const baseSource = result.sources[first];
      if (!baseSource) return;
      const baseKey = buildSourceKey(baseSource, first);
      rest.forEach(targetIdx => {
        const targetSource = result.sources[targetIdx];
        if (!targetSource) return;
        const targetKey = buildSourceKey(targetSource, targetIdx);
        window.graph.add({ key: baseKey, type: 'research-source' }, [
          {
            src: baseKey,
            dst: targetKey,
            rel: 'contradicts',
            weight: contradiction.severityScore ?? (contradiction.disagreement === 'major' ? 2 : 1),
          },
        ]);
      });
    });

    void refreshGraph();
  }, [result, refreshGraph]);

  const handleOpenUrl = async (url: string) => {
    try {
      // In Research mode, show the page in split view instead of opening in tab
      if (url && url.startsWith('http')) {
        setViewingSourceUrl(url);
        return;
      }
      // Fallback to tab for non-http URLs
      if (activeId) {
        await ipc.tabs.navigate(activeId, url);
      } else {
        await ipc.tabs.create(url);
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const handleRunExample = (example: string) => {
    setQuery(example);
    void handleSearch(example);
  };

  // Autocomplete suggestions
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    setAutocompleteLoading(true);

    const fetchSuggestions = async () => {
      const suggestions: Array<{ title: string; subtitle?: string; action?: () => void }> = [];

      // Try Redix streaming for live suggestions (if online)
      if (!isOffline) {
        try {
          let hasResults = false;
          await ipc.redix.stream(trimmed, {
            onChunk: (chunk: string) => {
              // Parse Redix suggestions from streaming response
              // For now, show a simple suggestion
              if (!hasResults && chunk.trim()) {
                hasResults = true;
                suggestions.push({
                  title: `Ask Redix: ${trimmed}`,
                  subtitle: 'Get AI-powered research suggestions',
                  action: () => {
                    setQuery(trimmed);
                    setShowAutocomplete(false);
                    void handleSearch(trimmed);
                  },
                });
              }
            },
            onError: () => {
              // Fall through to DuckDuckGo fallback
            },
          });
        } catch {
          // Fall through to DuckDuckGo fallback
        }
      }

      // DuckDuckGo instant answer as fallback suggestion
      if (suggestions.length === 0 && !isOffline) {
        try {
          const duckResult = await fetchDuckDuckGoInstant(trimmed);
          if (duckResult?.Heading) {
            suggestions.push({
              title: duckResult.Heading,
              subtitle: duckResult.AbstractText?.slice(0, 100) || 'Instant answer from DuckDuckGo',
              action: () => {
                setQuery(trimmed);
                setShowAutocomplete(false);
                void handleSearch(trimmed);
              },
            });
          }
        } catch {
          // Silent fail - continue with other suggestions
        }
      }

      // Fallback: Recent history
      try {
        const history = await ipc.history.search(trimmed);
        if (Array.isArray(history) && history.length > 0) {
          history.slice(0, 5).forEach((item: any) => {
            if (!suggestions.find(s => s.title === item.title)) {
              suggestions.push({
                title: item.title || item.url || 'Untitled',
                subtitle: item.url,
                action: () => {
                  setQuery(item.title || item.url);
                  setShowAutocomplete(false);
                  void handleSearch(item.title || item.url);
                },
              });
            }
          });
        }
      } catch {
        // Silent fail
      }

      // Tab matches
      tabs.forEach(tab => {
        const title = tab.title || 'Untitled';
        const tabUrl = tab.url || '';
        if (
          (title.toLowerCase().includes(trimmed.toLowerCase()) ||
            tabUrl.toLowerCase().includes(trimmed.toLowerCase())) &&
          !suggestions.find(s => s.title === title)
        ) {
          suggestions.push({
            title,
            subtitle: tabUrl,
            action: () => {
              setQuery(title);
              setShowAutocomplete(false);
              void handleSearch(title);
            },
          });
        }
      });

      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
      setAutocompleteLoading(false);
    };

    void fetchSuggestions();
  }, [debouncedQuery, tabs]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <ResearchStagehandIntegration />
      <LayoutEngine
        sidebarWidth={0}
        navHeight={0}
        className="mode-theme mode-theme--research bg-[#0f111a] text-gray-100"
      >
        <LayoutHeader sticky={false} className="border-b border-white/5 bg-black/20 backdrop-blur">
          <div className="flex items-center justify-between px-6 pb-3 pt-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-white">Research Mode</h1>
              <p className="text-sm text-gray-400">
                Aggregate evidence, generate traceable answers, and surface counterpoints without
                leaving the browser.
              </p>
            </div>
            <div className="ml-4 flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setUseEnhancedView(prev => !prev)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  useEnhancedView
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/20 bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
                title={
                  useEnhancedView
                    ? 'Switch to Standard View'
                    : 'Switch to Enhanced Multilingual View'
                }
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} />
                  {useEnhancedView ? 'Enhanced' : 'Standard'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCursorPanelOpen(prev => !prev)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  cursorPanelOpen
                    ? 'border-blue-500/60 bg-blue-500/10 text-blue-200'
                    : 'border-white/20 bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
                title="Toggle Cursor AI Assistant"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Cursor AI
                </span>
              </button>
              <ActiveContainerBadge containers={containers} activeContainerId={activeContainerId} />
            </div>
          </div>

          {/* v0.4: Zero-prompt suggestions */}
          <div className="flex-shrink-0 px-6 pt-4">
            <ZeroPromptSuggestions maxSuggestions={3} autoRefresh={true} />
          </div>

          <div className="flex-shrink-0 px-6 pb-5">
            <div className="relative max-w-4xl" ref={autocompleteRef}>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  setShowAutocomplete(false);
                  await handleSearch();
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/40 transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20"
              >
                <Search size={18} className="flex-shrink-0 text-gray-500" />
                <input
                  id="research-query-input"
                  name="research-query"
                  className="flex-1 bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none"
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value);
                    setShowAutocomplete(true);
                    // Auto-detect language as user types
                    if (e.target.value.length > 3) {
                      detectLanguage(e.target.value)
                        .then(result => {
                          setDetectedLang(result.language);
                        })
                        .catch(() => {});
                    }
                  }}
                  onFocus={() => {
                    if (autocompleteSuggestions.length > 0) {
                      setShowAutocomplete(true);
                    }
                  }}
                  placeholder={(() => {
                    const effectiveLang = language === 'auto' ? detectedLang : language;
                    if (effectiveLang === 'hi')
                      return 'हिंदी में पूछें: iPhone vs Samsung की तुलना करें';
                    if (effectiveLang === 'ta')
                      return 'தமிழில் கேளுங்கள்: iPhone vs Samsung ஒப்பிடுக';
                    return 'Ask in Hindi: Compare iPhone vs Samsung';
                  })()}
                  disabled={loading}
                />
                <div className="flex items-center gap-2">
                  {autocompleteLoading && (
                    <Skeleton variant="text" width={80} height={16} className="text-xs" />
                  )}
                  <input
                    id="research-file-input"
                    name="research-file"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md"
                    onChange={e => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Upload documents (PDF, DOCX, TXT, MD)"
                  >
                    <Upload size={14} />
                    {uploading ? 'Processing…' : 'Upload'}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {loading ? 'Researching…' : 'Run research'}
                  </button>
                  <VoiceButton
                    editBeforeExecute={useSettingsStore(
                      state => state.general.voiceEditBeforeExecute ?? true
                    )}
                    onResult={async text => {
                      // v0.4: Agentic action executor - chains voice → scrape/trade/research
                      const { executeAgenticAction } =
                        await import('../../services/agenticActionExecutor');
                      const { trackUserAction } =
                        await import('../../services/zeroPromptPrediction');

                      const parsed = parseResearchVoiceCommand(text);

                      // If actionable intent detected, execute agentic chain
                      if (parsed.action) {
                        trackUserAction(text);
                        const result = await executeAgenticAction(text, {
                          mode: 'research',
                          activeTabUrl: tabs.find(t => t.id === activeId)?.url,
                        });

                        if (result.success && result.results) {
                          // Handle research results
                          if (parsed.action.type === 'research' && result.results.aiSummary) {
                            setResult({
                              query: parsed.query,
                              answer: result.results.aiSummary,
                              sources:
                                result.results.scraped?.map((s, i) => ({
                                  id: `agentic-${i}`,
                                  url: s.url,
                                  title: s.title || s.url,
                                  snippet: s.excerpt || s.content?.substring(0, 200) || '',
                                  type: 'web' as ResearchSourceType,
                                  credibility: 'high',
                                  timestamp: Date.now(),
                                })) || [],
                              confidence: 0.9,
                              timestamp: Date.now(),
                            });
                            toast.success('Agentic research complete');
                            return;
                          }
                        }
                      }

                      // Fallback to original behavior for non-actionable or failed actions
                      if (parsed.isResearchCommand) {
                        // Update language if detected in voice command
                        if (parsed.language) {
                          const settingsStore = useSettingsStore.getState();
                          if (settingsStore.language !== parsed.language) {
                            settingsStore.setLanguage(parsed.language);
                            toast.success(`Language set to ${parsed.language.toUpperCase()}`);
                          }
                        }

                        // Set query and trigger search
                        setQuery(parsed.query);
                        setTimeout(() => handleSearch(parsed.query), 120);
                      } else {
                        // Regular voice input - just set query and search
                        setQuery(text);
                        setTimeout(() => handleSearch(text), 120);
                      }
                    }}
                    small
                  />
                </div>
              </form>
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[400px] min-h-[120px] overflow-y-auto rounded-xl border border-white/10 bg-[#111422] shadow-xl shadow-black/50">
                  <div className="space-y-1 p-2">
                    {autocompleteSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          suggestion.action?.();
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <div className="line-clamp-1 text-sm font-medium text-white">
                          {suggestion.title}
                        </div>
                        {suggestion.subtitle && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-gray-400">
                            {suggestion.subtitle}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded documents display */}
          {uploadedDocuments.length > 0 && (
            <div className="flex-shrink-0 px-6 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Uploaded documents:</span>
                {uploadedDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300"
                  >
                    <FileText size={12} className="text-gray-400" />
                    <span className="max-w-[200px] truncate">{doc.name}</span>
                    <span className="text-gray-500">({(doc.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(doc.id)}
                      className="ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
                      title="Remove document"
                    >
                      <X size={12} className="text-gray-400 hover:text-gray-200" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </LayoutHeader>

        <LayoutBody className="flex min-h-0 flex-1 gap-6 overflow-hidden px-6 pb-6">
          {useEnhancedView ? (
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#111422] shadow-xl shadow-black/30">
              {/* Use new streaming Perplexity-style UI */}
              <RegenResearchPanel />
            </div>
          ) : viewingSourceUrl ? (
            // Split view: Real web page + AI panel
            <>
              <div className="flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#111422] shadow-xl shadow-black/30">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingSourceUrl(null)}
                        className="rounded-lg px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
                      >
                        ← Back to Results
                      </button>
                      <span className="text-xs text-gray-500">|</span>
                      <span className="truncate text-sm text-gray-300">{viewingSourceUrl}</span>
                    </div>
                  </div>
                  <BrowserView url={viewingSourceUrl} mode="research" className="flex-1" />
                </div>
              </div>
              <InsightsSidebar
                result={result}
                loading={loading}
                onOpenSource={handleOpenUrl}
                activeSourceId={activeSourceId}
                onSelectSource={setActiveSourceId}
              />
            </>
          ) : (
            <>
              <section className="relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#111422] shadow-xl shadow-black/30">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
                <div className="flex h-full flex-col space-y-4 p-5">
                  <ResearchControls
                    authorityBias={authorityBias}
                    includeCounterpoints={includeCounterpoints}
                    region={region}
                    loading={loading}
                    onAuthorityBiasChange={setAuthorityBias}
                    onIncludeCounterpointsChange={setIncludeCounterpoints}
                    onRegionChange={value => setRegion(value)}
                    deepScanEnabled={deepScanEnabled}
                    onDeepScanToggle={value => setDeepScanEnabled(value)}
                  />

                  {deepScanEnabled && (
                    <DeepScanStatus
                      loading={deepScanLoading}
                      steps={deepScanSteps}
                      error={deepScanError}
                    />
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur">
                      {error}
                    </div>
                  )}

                  {loading && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-blue-200">
                        <Sparkles size={14} className="animate-pulse" />
                        Gathering sources and evaluating evidence…
                      </div>
                      <div className="w-full max-w-2xl space-y-4">
                        <LoadingSkeleton variant="card" />
                        <LoadingSkeleton variant="list" lines={3} />
                        <LoadingSkeleton variant="text" lines={4} />
                      </div>
                      <p className="text-xs text-gray-500">
                        Cross-checking accuracy, bias, and contradictions before presenting the
                        answer.
                      </p>
                    </div>
                  )}

                  {!loading && result && (
                    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                      <EvidenceOverlay
                        evidence={result.evidence || []}
                        sources={result.sources}
                        activeEvidenceId={activeEvidenceId}
                        onEvidenceClick={setActiveEvidenceId}
                      />
                      <ResearchResultView
                        result={result}
                        onOpenSource={handleOpenUrl}
                        activeSourceId={activeSourceId}
                        onActiveSourceChange={setActiveSourceId}
                        onSaveForCompare={handleSaveForCompare}
                        onShowCompare={() => setComparePanelOpen(true)}
                        compareCount={compareEntries.length}
                      />
                      <ResearchGraphSection
                        showGraph={showGraph}
                        onToggleGraph={() => setShowGraph(prev => !prev)}
                        query={result.query}
                        queryKey={queryKey}
                        graphData={graphData}
                        activeSourceId={activeSourceId}
                        onSelectSource={setActiveSourceId}
                        onOpenSource={handleOpenUrl}
                      />
                    </div>
                  )}

                  {!loading && !result && !error && <EmptyState onRunExample={handleRunExample} />}
                </div>
              </section>

              <InsightsSidebar
                result={result}
                loading={loading}
                onOpenSource={handleOpenUrl}
                activeSourceId={activeSourceId}
                onSelectSource={setActiveSourceId}
              />
            </>
          )}
        </LayoutBody>
        <CompareAnswersPanel
          open={comparePanelOpen}
          answers={compareEntries}
          selectedIds={compareSelection}
          onToggleSelect={handleToggleCompareSelection}
          onClose={() => setComparePanelOpen(false)}
          onRemove={handleRemoveCompare}
        />
        {cursorPanelOpen && (
          <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-slate-700/70 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
            <CursorChat
              pageSnapshot={
                activeId && tabs.find(t => t.id === activeId)
                  ? {
                      url: tabs.find(t => t.id === activeId)?.url || '',
                      title: tabs.find(t => t.id === activeId)?.title || '',
                      html: undefined, // Could be enhanced to capture page HTML
                    }
                  : undefined
              }
              onClose={() => setCursorPanelOpen(false)}
            />
          </div>
        )}
      </LayoutEngine>
    </>
  );
}

type RegionOption = 'global' | 'us' | 'uk' | 'eu' | 'asia' | 'custom';

const REGION_OPTIONS: Array<{ value: RegionOption; label: string }> = [
  { value: 'global', label: 'Global' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'eu', label: 'Europe' },
  { value: 'asia', label: 'Asia Pacific' },
];

interface ResearchControlsProps {
  authorityBias: number;
  includeCounterpoints: boolean;
  region: RegionOption;
  loading: boolean;
  onAuthorityBiasChange(value: number): void;
  onIncludeCounterpointsChange(value: boolean): void;
  onRegionChange(value: RegionOption): void;
  deepScanEnabled: boolean;
  onDeepScanToggle(value: boolean): void;
}

function ResearchControls({
  authorityBias,
  includeCounterpoints,
  region,
  loading,
  onAuthorityBiasChange,
  onIncludeCounterpointsChange,
  onRegionChange,
  deepScanEnabled,
  onDeepScanToggle,
}: ResearchControlsProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs text-gray-200 shadow-inner shadow-black/30 sm:grid-cols-[minmax(0,_1fr)_auto_auto]">
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Recency vs authority
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500">Recency</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={authorityBias}
              disabled={loading}
              onChange={e => onAuthorityBiasChange(Number(e.target.value))}
              className="h-1 w-full cursor-pointer accent-blue-500 disabled:opacity-40"
            />
          </div>
          <span className="text-[11px] text-gray-500">Authority</span>
          <span className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
            {authorityBias}%
          </span>
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px]">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-white/20 bg-transparent text-blue-500 focus:ring-blue-500 disabled:opacity-40"
          checked={includeCounterpoints}
          disabled={loading}
          onChange={e => onIncludeCounterpointsChange(e.target.checked)}
        />
        Include counterpoints
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px]">
        Region
        <select
          value={region}
          disabled={loading}
          onChange={e => onRegionChange(e.target.value as RegionOption)}
          className="rounded border border-white/10 bg-[#0c0e18] px-2 py-1 text-[11px] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-0 disabled:opacity-40"
        >
          {REGION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-[11px] text-indigo-100 sm:col-span-3">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-indigo-400/60 bg-transparent text-indigo-300 focus:ring-indigo-400 disabled:opacity-40"
          checked={deepScanEnabled}
          disabled={loading}
          onChange={e => onDeepScanToggle(e.target.checked)}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide">Deep scan</span>
          <span className="text-[11px] text-indigo-200/80">
            Analyze multiple pages with scraper context ({deepScanEnabled ? 'on' : 'off'})
          </span>
        </div>
      </label>
    </div>
  );
}

function DeepScanStatus({
  loading,
  steps,
  error,
}: {
  loading: boolean;
  steps: DeepScanStep[];
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 text-xs text-indigo-100">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-indigo-200">Deep scan progress</p>
          <p className="text-[11px] text-indigo-200/70">
            {steps.length > 0
              ? `${steps.length} checkpoints recorded`
              : 'Preparing sources via scraper'}
          </p>
        </div>
        {loading && (
          <Skeleton variant="circular" width={16} height={16} className="animate-pulse" />
        )}
      </div>
      {error && (
        <p className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1 text-red-200">
          {error}
        </p>
      )}
      <ol className="space-y-1 text-[11px] text-indigo-100/90">
        {(steps.length > 0
          ? steps
          : [
              {
                label: 'Gathering sources…',
                status: loading ? 'running' : 'complete',
                started_at: '',
                completed_at: '',
              },
            ]
        ).map((step, idx) => (
          <li
            key={`${step.label}-${idx}`}
            className="rounded border border-indigo-500/20 px-3 py-1"
          >
            <span className="font-semibold">{step.label}</span>
            <span className="ml-2 text-indigo-200/70">{step.status}</span>
            {step.detail && <span className="ml-2 text-indigo-200/70">{step.detail}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

interface ResearchResultViewProps {
  result: ResearchResult;
  activeSourceId: string | null;
  onActiveSourceChange(sourceKey: string): void;
  onOpenSource(url: string): void;
  onSaveForCompare(): void;
  onShowCompare(): void;
  compareCount: number;
}

function ResearchResultView({
  result,
  activeSourceId,
  onActiveSourceChange,
  onOpenSource,
  onSaveForCompare,
  onShowCompare,
  compareCount,
}: ResearchResultViewProps) {
  const confidencePercent = Math.round(result.confidence * 100);
  const verification = result.verification;
  const getSourceKey = (sourceIndex: number) => {
    const source = result.sources[sourceIndex];
    return source?.url ?? `source-${sourceIndex}`;
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/5 bg-white/5 px-6 py-5 shadow-inner shadow-black/30">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">AI answer with citations</h2>
            <p className="text-xs text-gray-400">
              {result.sources.length} sources considered • Confidence {confidencePercent}%
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {verification && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  verification.verified
                    ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                    : 'border border-amber-500/50 bg-amber-500/10 text-amber-200'
                }`}
              >
                {verification.verified ? 'Verified' : 'Needs review'}
              </span>
            )}
            <button
              type="button"
              onClick={onSaveForCompare}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200 hover:border-white/40"
            >
              Save for compare
            </button>
            <button
              type="button"
              onClick={onShowCompare}
              className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-100 hover:border-sky-400/70"
            >
              Open compare ({compareCount})
            </button>
          </div>
        </header>
        <AnswerWithCitations
          summary={result.summary}
          citations={result.citations}
          inlineEvidence={result.inlineEvidence}
          sources={result.sources}
          activeSourceId={activeSourceId}
          onActivate={sourceKey => {
            onActiveSourceChange(sourceKey);
            // Find evidence for this source
            const sourceIndex = result.sources.findIndex(
              s => (s.url ?? `source-${result.sources.indexOf(s)}`) === sourceKey
            );
            if (sourceIndex !== -1) {
              const evidence = result.evidence?.find(e => e.sourceIndex === sourceIndex);
              if (evidence) {
                setActiveEvidenceId(evidence.id);
              }
            }
          }}
          onOpenSource={onOpenSource}
          onExport={async format => {
            try {
              if (format === 'markdown') {
                let markdown = `# Research: ${result.query}\n\n`;
                markdown += `## Summary\n\n${result.summary}\n\n`;
                markdown += `## Citations\n\n`;
                result.citations.forEach(c => {
                  const source = result.sources[c.sourceIndex];
                  markdown += `[${c.index}] **${source?.title || 'Unknown'}**\n`;
                  markdown += `  - URL: ${source?.url || ''}\n`;
                  markdown += `  - Domain: ${source?.domain || ''}\n`;
                  markdown += `  - Confidence: ${(c.confidence * 100).toFixed(0)}%\n`;
                  if (c.quote) {
                    markdown += `  - Quote: "${c.quote}"\n`;
                  }
                  markdown += `\n`;
                });
                markdown += `## Sources\n\n`;
                result.sources.forEach((s, idx) => {
                  markdown += `${idx + 1}. **[${s.title}](${s.url})** - ${s.domain}\n`;
                  if (s.snippet) {
                    markdown += `   ${s.snippet}\n`;
                  }
                  markdown += `\n`;
                });
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `research-${Date.now()}.md`;
                a.click();
                URL.revokeObjectURL(url);
              } else {
                // PDF export via IPC
                await ipc.research.export({
                  format: 'markdown', // PDF would require backend support
                  sources: result.sources.map(s => s.url),
                  includeNotes: true,
                });
              }
            } catch (error) {
              console.error('Export failed:', error);
            }
          }}
        />

        {result.citations.length > 0 && (
          <div className="mt-5 rounded-xl border border-white/5 bg-[#1a1d2a] px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Citations ({result.citations.length})
              </h3>
              {/* Phase 1, Day 6: Export buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const {
                      downloadResearchExport,
                    } = require('../../core/research/researchExport');
                    downloadResearchExport(result, 'markdown');
                  }}
                  className="rounded px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
                  title="Export as Markdown"
                >
                  MD
                </button>
                <button
                  onClick={() => {
                    const {
                      downloadResearchExport,
                    } = require('../../core/research/researchExport');
                    downloadResearchExport(result, 'json');
                  }}
                  className="rounded px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-300"
                  title="Export as JSON"
                >
                  JSON
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {result.citations.map(citation => {
                const source = result.sources[citation.sourceIndex];
                const sourceKey = getSourceKey(citation.sourceIndex);
                const isActive = activeSourceId === sourceKey;
                if (!source) return null;

                // Phase 1, Day 6: Calculate credibility
                const {
                  calculateCredibility,
                  getCredibilityColor,
                  getCredibilityLabel,
                } = require('../../core/research/sourceCredibility');
                const credibility = calculateCredibility(source);
                const credibilityColor = getCredibilityColor(credibility.level);
                const credibilityLabel = getCredibilityLabel(credibility.level);

                return (
                  <li
                    key={citation.index}
                    className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-100'
                        : 'border-white/5 bg-white/[0.02] text-gray-300 hover:border-blue-400/40 hover:bg-blue-400/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <button
                          className="text-left font-semibold text-indigo-300 hover:text-indigo-200"
                          onClick={() => {
                            onActiveSourceChange(sourceKey);
                            onOpenSource(source.url);
                          }}
                        >
                          [{citation.index}] {source.title}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-gray-500">
                            Confidence {(citation.confidence * 100).toFixed(0)}% • {source.domain}
                          </span>
                          {/* Phase 1, Day 6: Credibility badge */}
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${credibilityColor}`}
                          >
                            {credibilityLabel} ({credibility.score}/100)
                          </span>
                        </div>
                        {citation.quote && (
                          <div className="mt-1 text-[11px] italic text-gray-400">
                            "{citation.quote.substring(0, 100)}
                            {citation.quote.length > 100 ? '...' : ''}"
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {verification && <VerificationSummary verification={verification} />}

      <SourcesList
        sources={result.sources}
        activeSourceId={activeSourceId}
        onActivate={onActiveSourceChange}
        onOpenSource={onOpenSource}
      />
    </div>
  );
}

const importanceLabel = {
  high: 'Critical evidence',
  medium: 'Supporting evidence',
  low: 'Context',
} as const;

function InsightsSidebar({
  result,
  loading,
  onOpenSource,
  activeSourceId,
  onSelectSource,
}: {
  result: ResearchResult | null;
  loading: boolean;
  onOpenSource(url: string): void;
  activeSourceId: string | null;
  onSelectSource(sourceKey: string): void;
}) {
  if (loading) {
    return (
      <aside className="w-[310px] shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-4 shadow-inner shadow-black/50">
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="w-[310px] shrink-0 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-5 shadow-inner shadow-black/50">
        <div className="space-y-4 text-sm text-gray-400">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
            <p className="flex items-center gap-2 text-gray-200">
              <Sparkles size={14} className="text-blue-300" />
              Try questions that need multiple independent sources.
            </p>
          </div>
          <EmptyState
            onRunExample={onSelectSource as unknown as (example: string) => void}
            minimal
          />
        </div>
      </aside>
    );
  }

  const topEvidence = (result.evidence ?? []).slice(0, 3);
  const contradictions = (result.contradictions ?? []).slice(0, 2);
  const activeEvidenceKey = activeSourceId;

  return (
    <aside className="w-[310px] shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-5 shadow-inner shadow-black/50">
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Confidence</span>
          <span className="text-sm font-semibold text-blue-200">
            {(result.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div
            className="h-full rounded bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
            style={{ width: `${Math.min(100, Math.max(0, result.confidence * 100))}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500">
          {result.sources.length} vetted sources • {result.citations.length} inline citations
        </p>
        <button
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-300 hover:border-blue-400/40 hover:text-blue-200"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <RefreshCcw size={12} />
          Adjust research settings
        </button>
      </div>

      {topEvidence.length > 0 && (
        <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-xs text-blue-100">
            <span className="font-semibold uppercase tracking-wide">Key evidence</span>
            <span>
              {topEvidence.length} of {(result.evidence ?? []).length}
            </span>
          </div>
          <div className="space-y-2 text-xs text-blue-100/90">
            {topEvidence.map(item => {
              const source = result.sources[item.sourceIndex];
              if (!source) return null;
              const sourceKey = source.url ?? `source-${item.sourceIndex}`;
              const isActive = activeEvidenceKey === sourceKey;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSource(sourceKey);
                    onOpenSource(item.fragmentUrl || source.url);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-blue-300 bg-blue-400/20'
                      : 'border-blue-400/30 hover:bg-blue-400/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-blue-200/80">
                    <span>{importanceLabel[item.importance]}</span>
                    <span>{source.domain}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-[11px] text-blue-50/90">{item.quote}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {contradictions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
          <div className="flex items-center justify-between text-xs text-amber-100">
            <span className="font-semibold uppercase tracking-wide">Contradictions</span>
            <span>{contradictions.length}</span>
          </div>
          <ul className="space-y-2 text-[11px] text-amber-50/90">
            {contradictions.map((item, index) => {
              const severity = item.disagreement === 'major' ? 'Major' : 'Minor';
              return (
                <li
                  key={`${item.claim}-${index}`}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-100">{item.claim}</span>
                    <span className="text-amber-200">{severity}</span>
                  </div>
                  <p className="mt-1 text-amber-100/70">
                    {item.summary || 'Investigate differing positions.'}
                  </p>
                  <button
                    onClick={() => {
                      const firstSource = item.sources[0];
                      if (typeof firstSource === 'number') {
                        const source = result.sources[firstSource];
                        if (source) {
                          onSelectSource(source.url ?? `source-${firstSource}`);
                          onOpenSource(source.url);
                        }
                      }
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-amber-100"
                  >
                    View sources
                    <ChevronRight size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result.biasProfile && (
        <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3 text-xs text-sky-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wide">Bias snapshot</span>
            <span>{result.biasProfile.authorityBias}% authority</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-sky-500/20">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-purple-500"
              style={{ width: `${result.biasProfile.authorityBias}%` }}
            />
          </div>
          <div className="space-y-1 pt-2">
            {result.biasProfile.domainMix.slice(0, 3).map(entry => (
              <div key={entry.type} className="flex items-center justify-between text-[11px]">
                <span>{capitalize(entry.type)}</span>
                <span>{entry.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.taskChains && result.taskChains.length > 0 && (
        <div className="space-y-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.07] px-4 py-3">
          <div className="flex items-center justify-between text-xs text-purple-100">
            <span className="font-semibold uppercase tracking-wide">Next checks</span>
            <span>{result.taskChains.length}</span>
          </div>
          <ol className="space-y-2 text-[11px] text-purple-50/80">
            {result.taskChains
              .flatMap(chain => chain.steps)
              .filter(step => step.status !== 'done')
              .slice(0, 3)
              .map(step => (
                <li
                  key={step.id}
                  className="rounded-lg border border-purple-400/30 bg-purple-400/10 px-3 py-2"
                >
                  <span className="font-semibold text-purple-100">{step.title}</span>
                  <p className="text-purple-100/70">{step.description}</p>
                </li>
              ))}
          </ol>
        </div>
      )}

      {/* Tier 2: OmniAgent Input */}
      <OmniAgentInput
        currentUrl={
          activeId && tabs.find(t => t.id === activeId)
            ? tabs.find(t => t.id === activeId)?.url
            : undefined
        }
        onResult={result => {
          // Display result in a toast or add to research results
          console.log('OmniAgent result:', result);
        }}
      />
    </aside>
  );
}

function ActiveContainerBadge({
  containers,
  activeContainerId,
}: {
  containers: ContainerInfo[];
  activeContainerId: string;
}) {
  const activeContainer =
    containers.find(container => container.id === activeContainerId) ??
    containers.find(container => container.id === 'default');

  if (!activeContainer) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200 shadow-inner shadow-black/20">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: activeContainer.color ?? '#6366f1' }}
      />
      <span className="font-medium">{activeContainer.name}</span>
      <span className="text-[10px] uppercase tracking-wide text-gray-400">
        {capitalize(activeContainer.scope ?? 'session')}
      </span>
    </div>
  );
}

function EmptyState({
  onRunExample,
  minimal = false,
}: {
  onRunExample: (example: string) => void;
  minimal?: boolean;
}) {
  const [detectedLang, setDetectedLang] = useState<string>('en');
  const [langConfidence, setLangConfidence] = useState<number>(0);

  useEffect(() => {
    // Auto-detect language from browser/system
    const detectUserLanguage = async () => {
      try {
        const result = await detectLanguage(navigator.language || 'en');
        setDetectedLang(result.language);
        setLangConfidence(result.confidence);
      } catch {
        // Fallback to English
        setDetectedLang('en');
      }
    };
    void detectUserLanguage();
  }, []);

  // Multilingual examples based on detected language
  const examples = useMemo(() => {
    if (detectedLang === 'hi') {
      return [
        'Nifty vs BankNifty की तुलना करें',
        'iPhone vs Samsung की तुलना करें',
        'भारत में AI नियमों का सारांश',
      ];
    } else if (detectedLang === 'ta') {
      return [
        'Nifty vs BankNifty ஒப்பிடுக',
        'iPhone vs Samsung ஒப்பிடுக',
        'இந்தியாவில் AI விதிகளின் சுருக்கம்',
      ];
    }
    return [
      'Compare Nifty vs BankNifty',
      'Compare iPhone vs Samsung',
      'Summarize AI regulations in India',
    ];
  }, [detectedLang]);

  const welcomeText = useMemo(() => {
    if (detectedLang === 'hi') {
      return {
        title: 'Research Mode में आपका स्वागत है',
        subtitle: 'हिंदी/तमिल/अंग्रेजी में पूछें: "Nifty vs BankNifty की तुलना करें"',
        button: 'उदाहरण आज़माएं',
      };
    } else if (detectedLang === 'ta') {
      return {
        title: 'Research Modeக்கு வரவேற்கிறோம்',
        subtitle: 'தமிழ்/ஹிந்தி/ஆங்கிலத்தில் கேளுங்கள்: "Nifty vs BankNifty ஒப்பிடுக"',
        button: 'எடுத்துக்காட்டு முயற்சிக்கவும்',
      };
    }
    return {
      title: 'Welcome to Research Mode',
      subtitle: 'Ask in Hindi/Tamil/English: "Compare Nifty vs BankNifty"',
      button: 'Try Example',
    };
  }, [detectedLang]);

  if (minimal) {
    return (
      <ul className="space-y-2 text-xs text-gray-400">
        {examples.slice(0, 2).map(example => (
          <li key={example}>
            <button
              className="text-left text-gray-300 hover:text-blue-200"
              onClick={() => onRunExample(example)}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-purple-900/40 px-10 py-16 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-blue-300 shadow-lg"
      >
        <Sparkles size={32} />
      </motion.div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="space-y-3"
      >
        <h1 className="text-3xl font-bold text-white">{welcomeText.title}</h1>
        <p className="max-w-md text-base text-gray-300">{welcomeText.subtitle}</p>
      </motion.div>
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex w-full max-w-md flex-col gap-3"
      >
        {examples.map((example, idx) => (
          <button
            key={example}
            onClick={() => onRunExample(example)}
            className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-left text-gray-200 transition-all hover:border-blue-400/60 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="relative z-10 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                {idx + 1}
              </div>
              <span className="font-medium">{example}</span>
            </div>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
              initial={{ x: '-100%' }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
          </button>
        ))}
        <button
          onClick={() => onRunExample(examples[0])}
          className="mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
        >
          {welcomeText.button}
        </button>
      </motion.div>
      {langConfidence > 0.5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-gray-400"
        >
          Detected: {detectedLang.toUpperCase()} ({(langConfidence * 100).toFixed(0)}% confidence)
        </motion.div>
      )}
    </div>
  );
}

function SourcesList({
  sources,
  activeSourceId,
  onActivate,
  onOpenSource,
}: {
  sources: ResearchSource[];
  activeSourceId: string | null;
  onActivate(sourceKey: string): void;
  onOpenSource(url: string): void;
}) {
  if (!sources || sources.length === 0) return null;

  // Phase 1, Day 6: Calculate credibility for all sources
  // Note: These are used in the SourceCard component (lines 2793-2795), not here
  const {
    calculateCredibility: _calculateCredibility,
    getCredibilityColor: _getCredibilityColor,
    getCredibilityLabel: _getCredibilityLabel,
  } = require('../../core/research/sourceCredibility');

  const providerCounts = sources.reduce<Record<string, number>>((acc, source) => {
    const provider =
      typeof source.metadata?.provider === 'string' ? source.metadata.provider.toLowerCase() : '';
    if (!provider) return acc;
    acc[provider] = (acc[provider] ?? 0) + 1;
    return acc;
  }, {});

  const providerSummary =
    Object.entries(providerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([provider, count]) => `${formatProviderName(provider)} (${count})`)
      .join(' • ') || 'Ranked by relevance & consensus';

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Sources ({sources.length})</h3>
          <p className="text-xs text-gray-500">{providerSummary}</p>
        </div>
      </header>
      <div className="flex flex-col gap-3">
        {sources.map((source, idx) => {
          const sourceKey = source.url ?? `source-${idx}`;
          return (
            <SourceCard
              key={source.url || idx}
              source={source}
              index={idx}
              isActive={activeSourceId === sourceKey}
              onActivate={onActivate}
              onOpen={onOpenSource}
            />
          );
        })}
      </div>
    </section>
  );
}

const NEWS_DOMAIN_HINTS = [
  'nytimes',
  'cnn',
  'bbc',
  'guardian',
  'reuters',
  'bloomberg',
  'apnews',
  'wsj',
  'cnbc',
  'financialtimes',
  'washingtonpost',
];

const FORUM_DOMAIN_HINTS = [
  'reddit',
  'stack',
  'stackoverflow',
  'stackexchange',
  'discord',
  'forum',
  'forums',
  'quora',
  'medium',
];

const DOCUMENTATION_DOMAIN_HINTS = [
  'docs',
  'developer',
  'dev.',
  'api.',
  'learn.',
  'support.',
  'help.',
  'manual',
  'reference',
  'wikipedia',
  'wiki',
  'kubernetes',
  'cloud.google',
  'learn.microsoft',
];

function mapMultiSourceResultToSource(hit: MultiSourceSearchResult, idx: number): ResearchSource {
  const domain = hit.domain || extractDomain(hit.url);
  const provider = typeof hit.source === 'string' ? hit.source : 'web';
  const sourceType = inferSourceType(domain, provider);
  const baseScore = Number.isFinite(hit.score) ? hit.score : 0.62;
  const extendedMeta = (hit.metadata || {}) as { timestamp?: number; dateLastCrawled?: string };
  const parsedTimestamp =
    typeof extendedMeta.timestamp === 'number'
      ? extendedMeta.timestamp
      : typeof extendedMeta.dateLastCrawled === 'string'
        ? Date.parse(extendedMeta.dateLastCrawled)
        : undefined;

  return {
    id: `multi-${idx}-${provider}`,
    title: hit.title,
    url: hit.url,
    domain,
    snippet: hit.snippet || '',
    text: hit.snippet || hit.title,
    type: sourceType,
    sourceType,
    relevanceScore: Math.round(Math.max(0.45, baseScore) * 100),
    timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : Date.now(),
    metadata: {
      provider,
      rawScore: hit.score,
      ...hit.metadata,
    },
  };
}

function mapDeepScanSourceToResearchSource(source: DeepScanSource, idx: number): ResearchSource {
  const domain = source.domain || extractDomain(source.url);
  const sourceType = inferSourceType(domain);
  return {
    id: source.id || `deep-${idx}`,
    title: source.title || source.url || `Deep scan source ${idx + 1}`,
    url: source.url || '',
    domain: domain || 'deep-scan',
    snippet: source.snippet || '',
    text: source.text || source.snippet || '',
    type: sourceType,
    sourceType,
    relevanceScore: source.relevanceScore ?? 80 - idx * 2,
    metadata: {
      ...(source.metadata || {}),
      provider: 'deep-scan',
    },
    image: source.image,
    wordCount: source.wordCount,
    lang: source.lang,
    contentHash: source.contentHash,
    fromCache: source.fromCache,
    rendered: source.rendered,
    fetchedAt: source.fetchedAt,
  };
}

function inferSourceType(domain: string, provider?: string): ResearchSourceType {
  const value = (domain || '').toLowerCase();
  if (
    value.endsWith('.edu') ||
    value.includes('.ac.') ||
    value.includes('arxiv') ||
    value.includes('researchgate')
  ) {
    return 'academic';
  }
  if (value.endsWith('.gov') || value.includes('.gov.')) {
    return 'documentation';
  }
  if (value && NEWS_DOMAIN_HINTS.some(hint => value.includes(hint))) {
    return 'news';
  }
  if (value && FORUM_DOMAIN_HINTS.some(hint => value.includes(hint))) {
    return 'forum';
  }
  if (value && DOCUMENTATION_DOMAIN_HINTS.some(hint => value.includes(hint))) {
    return 'documentation';
  }
  if (!value && provider && provider.toLowerCase().includes('bing')) {
    return 'news';
  }
  return 'other';
}

function dedupeResearchSources(sources: ResearchSource[]): ResearchSource[] {
  const seen = new Set<string>();
  return sources.filter(source => {
    const key = source.url || `${source.domain}|${source.title}`;
    if (!key) {
      return true;
    }
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeSourceUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace(/\/+$/, '').toLowerCase();
}

function mergeScrapedSnapshots(
  sources: ResearchSource[],
  snapshots: ScrapedSourceResult[]
): ResearchSource[] {
  if (!snapshots || snapshots.length === 0) {
    return sources;
  }

  const snapshotMap = new Map<string, ScrapedSourceResult>();
  snapshots.forEach(snapshot => {
    const candidates = [snapshot.finalUrl, snapshot.url].filter(Boolean) as string[];
    candidates.forEach(candidate => {
      snapshotMap.set(normalizeSourceUrl(candidate), snapshot);
    });
  });

  return sources.map(source => {
    const match =
      snapshotMap.get(normalizeSourceUrl(source.url)) ||
      snapshotMap.get(normalizeSourceUrl(source.metadata?.canonicalUrl as string));
    if (!match) {
      return source;
    }
    return {
      ...source,
      snippet: match.excerpt || source.snippet,
      text: match.content || source.text || match.excerpt || source.snippet,
      excerpt: match.excerpt || source.excerpt,
      image: match.image || source.image,
      contentHash: match.contentHash || source.contentHash,
      wordCount: match.wordCount ?? source.wordCount,
      lang: match.lang || source.lang,
      fromCache: match.fromCache ?? source.fromCache,
      rendered: match.rendered ?? source.rendered,
      fetchedAt: match.fetchedAt || source.fetchedAt,
      metadata: {
        ...(source.metadata || {}),
        ...(match.metadata || {}),
      },
    };
  });
}

function extractDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function formatProviderName(provider: string): string {
  if (!provider) return 'web';
  const normalized = provider.replace(/[-_]/g, ' ').trim();
  if (!normalized) return 'web';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function ResearchGraphSection({
  showGraph,
  onToggleGraph,
  query,
  queryKey,
  graphData,
  activeSourceId,
  onSelectSource,
  onOpenSource,
}: {
  showGraph: boolean;
  onToggleGraph(): void;
  query: string;
  queryKey: string | null;
  graphData: any;
  activeSourceId: string | null;
  onSelectSource(sourceKey: string): void;
  onOpenSource(url: string): void;
}) {
  const hasGraphData =
    graphData &&
    Array.isArray(graphData.nodes) &&
    graphData.nodes.some(
      (node: any) => typeof node?.type === 'string' && node.type.startsWith('research-')
    );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner shadow-black/20">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Knowledge graph</h3>
          <p className="text-xs text-gray-400">
            Connections for “{query.slice(0, 60)}
            {query.length > 60 ? '…' : ''}” across sources and evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleGraph}
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-blue-400/40 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        >
          {showGraph ? 'Hide graph' : 'Show graph'}
        </button>
      </header>
      {showGraph ? (
        <ResearchGraphView
          query={query}
          queryKey={queryKey}
          graphData={graphData}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
          onOpenSource={onOpenSource}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-xs text-gray-400">
          Graph hidden. Toggle “Show graph” to explore relationships again.
        </div>
      )}

      {!hasGraphData && showGraph && (
        <div className="mt-3 rounded-lg border border-white/10 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-200">
          First research run captured. Subsequent questions will layer onto this graph for deeper
          context.
        </div>
      )}
    </section>
  );
}

interface VerificationSummaryProps {
  verification: VerificationResult;
}

function VerificationSummary({ verification }: VerificationSummaryProps) {
  if (!verification) return null;
  return (
    <section className="space-y-3 rounded border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-200">Verification summary</h3>
        <span
          className={`rounded border px-2 py-1 text-xs font-medium ${
            verification.verified
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        >
          {verification.verified ? 'Pass' : 'Review suggested'}
        </span>
      </div>

      <div className="grid gap-3 text-xs text-gray-300 sm:grid-cols-4">
        <Metric
          label="Claim density"
          value={`${verification.claimDensity.toFixed(1)} / 100 words`}
        />
        <Metric label="Citation coverage" value={`${verification.citationCoverage.toFixed(0)}%`} />
        <Metric
          label="Hallucination risk"
          value={`${(verification.hallucinationRisk * 100).toFixed(0)}%`}
        />
        <Metric label="Ungrounded claims" value={`${verification.ungroundedClaims.length}`} />
      </div>

      {verification.ungroundedClaims.length > 0 && (
        <details className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <summary className="cursor-pointer font-semibold text-amber-300">
            Ungrounded claims ({verification.ungroundedClaims.length})
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-amber-100">
            {verification.ungroundedClaims.map((claim, idx) => (
              <li key={`${claim.position}-${idx}`}>
                <span className="font-medium capitalize">{claim.severity}</span>: {claim.text}
              </li>
            ))}
          </ul>
        </details>
      )}

      {verification.suggestions.length > 0 && (
        <div className="space-y-1 text-xs text-gray-300">
          <h4 className="font-semibold text-gray-200">Suggestions</h4>
          <ul className="list-inside list-disc space-y-1 text-gray-400">
            {verification.suggestions.map((suggestion, idx) => (
              <li key={`${suggestion}-${idx}`}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-neutral-800 bg-neutral-950/60 p-3">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-200">{value}</span>
    </div>
  );
}

function normaliseMockSnippet(snippet: string): string {
  if (!snippet) return '';
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function composeMockSummary(
  segments: Array<{ text: string; sourceIndex: number; quote: string }>,
  sources: ResearchSource[]
) {
  let summaryBuilder = '';
  const inlineEvidence: ResearchInlineEvidence[] = [];
  const citations: ResearchResult['citations'] = [];
  let cursor = 0;

  segments.forEach((segment, idx) => {
    const isNewParagraph = idx > 0 && idx % 2 === 0;
    if (idx > 0) {
      const separator = isNewParagraph ? '\n\n' : ' ';
      summaryBuilder += separator;
      cursor += separator.length;
    }

    const from = cursor;
    summaryBuilder += segment.text;
    const to = cursor + segment.text.length;
    const citationIndex = idx + 1;

    inlineEvidence.push({
      from,
      to,
      citationIndex,
      sourceIndex: segment.sourceIndex,
      quote: segment.quote,
    });

    const source = sources[segment.sourceIndex];
    const confidence = source
      ? Math.min(1, Math.max(0.2, (source.relevanceScore || 40) / 80))
      : 0.5;
    citations.push({
      index: citationIndex,
      sourceIndex: segment.sourceIndex,
      quote: segment.quote.slice(0, 140),
      confidence,
    });

    cursor = to;
  });

  const summary = summaryBuilder.trim();
  const uniqueSources = Array.from(new Set(segments.map(segment => segment.sourceIndex)));
  const avgRelevance =
    uniqueSources.reduce((acc, idx) => acc + (sources[idx]?.relevanceScore ?? 50), 0) /
    Math.max(1, uniqueSources.length);
  const confidence = Math.max(
    0.35,
    Math.min(1, (avgRelevance / 60) * Math.min(1, uniqueSources.length / 3))
  );

  return { summary, inlineEvidence, citations, confidence };
}

function generateMockResult(query: string): ResearchResult {
  const mockSources: ResearchSource[] = [
    {
      url: 'https://example.com/research',
      title: `Overview of ${query}`,
      text: `Mock content discussing ${query}.`,
      snippet: `A concise overview of ${query} with supporting context.`,
      domain: 'example.com',
      relevanceScore: 68,
      sourceType: 'documentation',
      type: 'documentation',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
      url: 'https://knowledge.example.org/article',
      title: `In-depth analysis of ${query}`,
      text: `Extended mock analysis for ${query}.`,
      snippet: `Detailed analysis exploring key aspects of ${query}.`,
      domain: 'knowledge.example.org',
      relevanceScore: 72,
      sourceType: 'academic',
      type: 'academic',
      timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    },
  ];

  const segments = mockSources.map((source, idx) => ({
    text: normaliseMockSnippet(source.snippet || source.text),
    sourceIndex: idx,
    quote: source.snippet || source.text.slice(0, 140),
  }));

  const { summary, inlineEvidence, citations, confidence } = composeMockSummary(
    segments,
    mockSources
  );

  const mockVerification: VerificationResult = {
    verified: true,
    claimDensity: 8.5,
    citationCoverage: 92,
    ungroundedClaims: [],
    hallucinationRisk: 0.1,
    suggestions: ['Mock verification successful.'],
  };

  return {
    query,
    sources: mockSources,
    summary,
    citations,
    confidence,
    verification: mockVerification,
    inlineEvidence,
  };
}

function simpleHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildQueryKey(query: string) {
  return `research-query:${simpleHash(query.slice(0, 256))}`;
}

function buildSourceKey(source: ResearchSource, index: number) {
  if (source?.url) return source.url;
  return `research-source:${index}:${simpleHash(source?.title || String(index))}`;
}

function buildEvidenceKey(sourceKey: string, id: number) {
  return `${sourceKey}#evidence:${id}`;
}

function capitalize(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
