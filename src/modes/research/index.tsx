// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Info,
  RefreshCcw,
  ChevronRight,
  Search,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import VoiceButton from '../../components/VoiceButton';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { useDebounce } from '../../utils/useDebounce';
import { fetchDuckDuckGoInstant, formatDuckDuckGoResults } from '../../services/duckDuckGoSearch';
import { multiSourceSearch, type MultiSourceSearchResult } from '../../services/multiSourceSearch';
import { scrapeResearchSources, type ScrapedSourceResult } from '../../services/researchScraper';
import { searchLocal } from '../../utils/lunrIndex';
import { aiEngine, type AITaskResult } from '../../core/ai';
import { semanticSearchMemories } from '../../core/supermemory/search';
import { parsePdfFile } from '../docs/parsers/pdf';
import { parseDocxFile } from '../docs/parsers/docx';
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
import { SourceCard } from '../../components/research/SourceCard';
import { AnswerWithCitations } from '../../components/research/AnswerWithCitations';
import { EvidenceOverlay } from '../../components/research/EvidenceOverlay';
import { CompareAnswersPanel } from '../../components/research/CompareAnswers';
import { LayoutEngine, LayoutHeader, LayoutBody } from '../../ui/layout-engine';
import { useResearchCompareStore } from '../../state/researchCompareStore';
import { showToast } from '../../state/toastStore';
import { runDeepScan, type DeepScanStep, type DeepScanSource } from '../../services/deepScan';
import { CursorChat } from '../../components/cursor/CursorChat';
import { OmniAgentInput } from '../../components/OmniAgentInput';

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

        const aiResult = await aiEngine.runTask(
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
        );

        const finalResult = streamedResult ?? aiResult;
        aiMetaRef.current = {
          provider: finalResult?.provider || 'ai',
          model: finalResult?.model,
        };
        const finalAnswer = streamedText || finalResult?.text || '';

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
      showToast('info', 'Removed saved answer.');
    },
    [removeCompareEntry]
  );

  const handleSaveForCompare = useCallback(() => {
    if (!result) {
      showToast('info', 'Run a research query before saving.');
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
    showToast('success', 'Answer saved to compare drawer.');
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
      showToast('error', message);
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

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveSourceId(null);

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
        try {
          const multiSourceResults = await multiSourceSearch(searchQuery, { limit: 20 });
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
        }
      }

      // Use unified AI engine for research queries
      try {
        let streamedText = '';
        let streamedResult: AITaskResult | null = null;

        const aiResult = await aiEngine.runTask(
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
            },
            llm: {
              temperature: 0.2,
              maxTokens: 1000,
            },
          },
          event => {
            if (event.type === 'token' && typeof event.data === 'string') {
              streamedText += event.data;
              // Update result with streaming text if needed
            } else if (event.type === 'done' && typeof event.data !== 'string') {
              streamedResult = event.data as AITaskResult;
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

        // Add local search results
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

        // Fallback to DuckDuckGo Instant Answer API
        const duckResult = await fetchDuckDuckGoInstant(searchQuery);
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
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Unable to complete the research request. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
    <LayoutEngine
      sidebarWidth={0}
      navHeight={0}
      className="mode-theme mode-theme--research bg-[#0f111a] text-gray-100"
    >
      <LayoutHeader sticky={false} className="border-b border-white/5 bg-black/20 backdrop-blur">
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-white">Research Mode</h1>
            <p className="text-sm text-gray-400">
              Aggregate evidence, generate traceable answers, and surface counterpoints without
              leaving the browser.
            </p>
          </div>
          <div className="flex-shrink-0 ml-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursorPanelOpen(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition ${
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

        <div className="px-6 pb-5 flex-shrink-0">
          <div className="relative max-w-4xl" ref={autocompleteRef}>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setShowAutocomplete(false);
                await handleSearch();
              }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/40 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all w-full"
            >
              <Search size={18} className="text-gray-500 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => {
                  if (autocompleteSuggestions.length > 0) {
                    setShowAutocomplete(true);
                  }
                }}
                placeholder="Ask a question, compare claims, or request a briefing…"
                disabled={loading}
              />
              <div className="flex items-center gap-2">
                {autocompleteLoading && (
                  <Skeleton variant="text" width={80} height={16} className="text-xs" />
                )}
                <input
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
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40 flex items-center gap-1.5"
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
                  onResult={text => {
                    setQuery(text);
                    setTimeout(() => handleSearch(text), 120);
                  }}
                  small
                />
              </div>
            </form>
            {showAutocomplete && autocompleteSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#111422] shadow-xl shadow-black/50 max-h-[400px] min-h-[120px] overflow-y-auto z-[100]">
                <div className="p-2 space-y-1">
                  {autocompleteSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        suggestion.action?.();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <div className="text-sm text-white font-medium line-clamp-1">
                        {suggestion.title}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
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
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400 font-medium">Uploaded documents:</span>
              {uploadedDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-gray-300 group"
                >
                  <FileText size={12} className="text-gray-400" />
                  <span className="max-w-[200px] truncate">{doc.name}</span>
                  <span className="text-gray-500">({(doc.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/10 rounded"
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

      <LayoutBody className="flex flex-1 min-h-0 gap-6 overflow-hidden px-6 pb-6">
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
                  <SkeletonCard />
                  <SkeletonList items={3} />
                  <SkeletonText lines={4} />
                </div>
                <p className="text-xs text-gray-500">
                  Cross-checking accuracy, bias, and contradictions before presenting the answer.
                </p>
              </div>
            )}

            {!loading && result && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
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
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/70 shadow-2xl z-50 flex flex-col">
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
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Citations
            </h3>
            <ul className="space-y-2">
              {result.citations.map(citation => {
                const source = result.sources[citation.sourceIndex];
                const sourceKey = getSourceKey(citation.sourceIndex);
                const isActive = activeSourceId === sourceKey;
                if (!source) return null;
                return (
                  <li
                    key={citation.index}
                    className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-100'
                        : 'border-white/5 bg-white/[0.02] text-gray-300 hover:border-blue-400/40 hover:bg-blue-400/5'
                    }`}
                  >
                    <button
                      className="font-semibold text-indigo-300 hover:text-indigo-200"
                      onClick={() => {
                        onActiveSourceChange(sourceKey);
                        onOpenSource(source.url);
                      }}
                    >
                      [{citation.index}] {source.title}
                    </button>
                    <div className="text-[11px] text-gray-500">
                      Confidence {(citation.confidence * 100).toFixed(0)}% • {source.domain}
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
                  <p className="mt-1 text-[11px] text-blue-50/90 line-clamp-3">{item.quote}</p>
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
  const examples = [
    'Compare claims about Mediterranean diet heart benefits.',
    'Does remote work hurt productivity? Provide counterpoints.',
    'Summarize AI safety regulations as of 2025 with sources.',
  ];

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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-14 text-center text-sm text-gray-400">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-blue-300">
        <Info size={20} />
      </div>
      <div>
        <p className="font-medium text-gray-200">Ready when you are.</p>
        <p className="text-sm text-gray-400">
          Ask for a briefing, compare opposing claims, or verify a statement with live evidence.
        </p>
      </div>
      <div className="space-y-2 text-sm">
        {examples.map(example => (
          <button
            key={example}
            onClick={() => onRunExample(example)}
            className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gray-200 hover:border-blue-400/40 hover:bg-blue-400/10"
          >
            {example}
          </button>
        ))}
      </div>
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
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-200">Verification summary</h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded border ${
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
          <ul className="list-disc list-inside space-y-1 text-gray-400">
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
