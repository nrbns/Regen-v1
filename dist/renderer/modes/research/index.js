import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResearchStagehandIntegration } from './stagehand-integration';
import { Sparkles, RefreshCcw, ChevronRight, Search, Upload, FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../state/settingsStore';
import VoiceButton from '../../components/VoiceButton';
import { ipc } from '../../lib/ipc-typed';
// Toast imported but not used in standard view - used in enhanced view
import { useTabsStore } from '../../state/tabsStore';
import { useDebounce } from '../../utils/useDebounce';
import { fetchDuckDuckGoInstant, formatDuckDuckGoResults } from '../../services/duckDuckGoSearch';
import { performLiveWebSearch } from '../../services/liveWebSearch';
import { optimizedSearch } from '../../services/optimizedSearch';
import { scrapeResearchSources } from '../../services/researchScraper';
import { searchLocal } from '../../utils/lunrIndex';
import { aiEngine } from '../../core/ai';
import { semanticSearchMemories } from '../../core/supermemory/search';
import { parsePdfFile } from '../docs/parsers/pdf';
import { parseDocxFile } from '../docs/parsers/docx';
import { LoadingSkeleton } from '../../components/common/LoadingSkeleton';
import { parseResearchVoiceCommand } from '../../utils/voiceCommandParser';
import { detectLanguage } from '../../services/languageDetection';
import { summarizeOffline } from '../../services/offlineSummarizer';
import { useContainerStore } from '../../state/containerStore';
import { ResearchGraphView } from '../../components/research/ResearchGraphView';
import { isWebMode } from '../../lib/env';
import { SourceCard } from '../../components/research/SourceCard';
import { AnswerWithCitations } from '../../components/research/AnswerWithCitations';
import { EvidenceOverlay } from '../../components/research/EvidenceOverlay';
import { CompareAnswersPanel } from '../../components/research/CompareAnswers';
import { LayoutEngine, LayoutHeader, LayoutBody } from '../../ui/layout-engine';
import { useResearchCompareStore } from '../../state/researchCompareStore';
import { toast } from '../../utils/toast';
import { runDeepScan } from '../../services/deepScan';
import { CursorChat } from '../../components/cursor/CursorChat';
import { OmniAgentInput } from '../../components/OmniAgentInput';
// import ResearchModePanel from '../../components/research/ResearchModePanel'; // Reserved for future use
import { RegenResearchPanel } from '../../components/research/RegenResearchPanel';
import { researchApi } from '../../lib/api-client';
import { getLanguageMeta } from '../../constants/languageMeta';
import { getSearchHealth } from '../../services/searchHealth';
import { multiLanguageAI } from '../../core/language/multiLanguageAI';
export default function ResearchPanel() {
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [_loadingMessage, setLoadingMessage] = useState(null);
    const [detectedLang, setDetectedLang] = useState('en');
    const language = useSettingsStore(s => s.language || 'auto');
    const [activeSourceId, setActiveSourceId] = useState(null);
    const [includeCounterpoints, setIncludeCounterpoints] = useState(false);
    const [authorityBias, setAuthorityBias] = useState(50); // 0 = recency, 100 = authority
    const [region, setRegion] = useState('global');
    const [graphData, setGraphData] = useState(null);
    const [showGraph, setShowGraph] = useState(true);
    const [activeEvidenceId, setActiveEvidenceId] = useState(null);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [uploadedDocuments, setUploadedDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const { activeId, tabs } = useTabsStore();
    const useHybridSearch = useSettingsStore(s => s.searchEngine !== 'mock');
    const { containers, activeContainerId, setContainers } = useContainerStore();
    const graphSignatureRef = useRef('');
    const debouncedQuery = useDebounce(query, 300);
    const { entries: compareEntries, addEntry: addCompareEntry, removeEntry: removeCompareEntry, } = useResearchCompareStore();
    const [comparePanelOpen, setComparePanelOpen] = useState(false);
    const [compareSelection, setCompareSelection] = useState([]);
    const [cursorPanelOpen, setCursorPanelOpen] = useState(false);
    const aiMetaRef = useRef({});
    const [deepScanEnabled, setDeepScanEnabled] = useState(false);
    const [deepScanLoading, setDeepScanLoading] = useState(false);
    const [deepScanSteps, setDeepScanSteps] = useState([]);
    const [deepScanError, setDeepScanError] = useState(null);
    const [useEnhancedView, setUseEnhancedView] = useState(true); // Default to enhanced multilingual view
    useEffect(() => {
        if (containers.length === 0) {
            ipc.containers
                .list()
                .then(list => {
                if (Array.isArray(list)) {
                    setContainers(list);
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
        const handleWisprResearch = (event) => {
            const { query: researchQuery } = event.detail;
            if (researchQuery) {
                setQuery(researchQuery);
                toast.success(`Researching: ${researchQuery}`, { duration: 3000 });
                // Trigger search after a short delay - handleSearch will be called via query change
                setTimeout(() => {
                    // Dispatch a custom event that will trigger search
                    window.dispatchEvent(new CustomEvent('research:trigger', { detail: { query: researchQuery } }));
                }, 500);
            }
        };
        window.addEventListener('wispr:research', handleWisprResearch);
        return () => window.removeEventListener('wispr:research', handleWisprResearch);
    }, []);
    useEffect(() => {
        const handleHandoff = (event) => {
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
            }
            else if (symbol) {
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
        window.addEventListener('handoff:research', handleHandoff);
        return () => {
            window.removeEventListener('handoff:research', handleHandoff);
        };
    }, []);
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
        if (typeof window === 'undefined' || !window.graph?.all)
            return;
        try {
            const snapshot = await window.graph.all();
            if (snapshot && Array.isArray(snapshot.nodes)) {
                setGraphData(snapshot);
            }
        }
        catch (err) {
            console.warn('[Research] Failed to load graph snapshot', err);
        }
    }, []);
    const _runResearchAnswer = useCallback(async ({ searchQuery, context, aggregatedSources, aggregatedProviderNames, scrapedSnapshots = [], }) => {
        try {
            let streamedText = '';
            let streamedResult = null;
            const aiResult = await aiEngine.runTask({
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
            }, event => {
                if (event.type === 'token' && typeof event.data === 'string') {
                    streamedText += event.data;
                }
                else if (event.type === 'done' && typeof event.data !== 'string') {
                    streamedResult = event.data;
                }
            });
            const finalResult = streamedResult ?? aiResult;
            aiMetaRef.current = {
                provider: finalResult?.provider || 'ai',
                model: finalResult?.model,
            };
            let finalAnswer = streamedText || finalResult?.text || '';
            // If offline and no answer, try offline mBART summarization
            if (!finalAnswer && typeof navigator !== 'undefined' && !navigator.onLine) {
                try {
                    // Collect all source text for summarization
                    const sourceTexts = [];
                    if (scrapedSnapshots.length > 0) {
                        scrapedSnapshots.forEach(snapshot => {
                            if (snapshot.excerpt)
                                sourceTexts.push(snapshot.excerpt);
                            if (snapshot.text)
                                sourceTexts.push(snapshot.text);
                        });
                    }
                    if (aggregatedSources.length > 0) {
                        aggregatedSources.forEach(source => {
                            if (source.snippet)
                                sourceTexts.push(source.snippet);
                            if (source.title)
                                sourceTexts.push(source.title);
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
                }
                catch (error) {
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
                }
                catch (graphError) {
                    console.debug('[Research] Auto-graph generation failed:', graphError);
                }
            }
            const sources = [...aggregatedSources];
            if (finalResult?.citations && finalResult.citations.length > 0) {
                sources.push(...finalResult.citations.map((cite, idx) => {
                    let domain = cite.source || '';
                    try {
                        if (cite.url) {
                            domain = new URL(cite.url).hostname;
                        }
                    }
                    catch {
                        domain = cite.source || '';
                    }
                    const citationType = inferSourceType(domain);
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
                }));
            }
            if (uploadedDocuments.length > 0) {
                sources.push(...uploadedDocuments.map((doc, idx) => ({
                    id: doc.id,
                    title: doc.name,
                    url: '',
                    domain: 'uploaded',
                    snippet: doc.text.slice(0, 200) + (doc.text.length > 200 ? '...' : ''),
                    text: doc.text,
                    type: 'documentation',
                    sourceType: 'documentation',
                    relevanceScore: 98 - idx,
                    timestamp: Date.now(),
                    metadata: {
                        provider: 'uploaded-doc',
                    },
                })));
            }
            try {
                const localResults = await searchLocal(searchQuery);
                sources.push(...localResults.map((lr, idx) => ({
                    id: `local-${lr.id}`,
                    title: lr.title,
                    url: '',
                    domain: 'local',
                    snippet: lr.snippet,
                    text: lr.snippet,
                    type: 'documentation',
                    sourceType: 'documentation',
                    relevanceScore: 85 - idx * 3,
                    timestamp: Date.now(),
                    metadata: {
                        provider: 'local-index',
                    },
                })));
            }
            catch (localError) {
                console.debug('[Research] Local search failed:', localError);
            }
            const inlineCitations = finalResult?.citations?.map((cite, idx) => ({
                id: `citation-${idx}`,
                text: cite.title || cite.url || `Source ${idx + 1}`,
                url: cite.url || '',
                position: finalAnswer.indexOf(cite.title || '') >= 0
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
        }
        catch (aiError) {
            console.warn('[Research] AI engine failed, falling back to legacy search:', aiError);
            if (aggregatedSources.length > 0) {
                const providerLabel = aggregatedProviderNames.length > 0
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
                const sources = [
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
                                type: 'news',
                                sourceType: 'news',
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
                        type: 'documentation',
                        sourceType: 'documentation',
                        relevanceScore: 90 - idx * 3,
                        timestamp: Date.now(),
                        metadata: {
                            provider: 'local-index',
                        },
                    })),
                ];
                setResult({
                    query: searchQuery,
                    summary: duckResult.AbstractText ||
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
                        type: 'documentation',
                        sourceType: 'documentation',
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
    }, [authorityWeight, includeCounterpoints, region, recencyWeight, refreshGraph, uploadedDocuments]);
    const handleToggleCompareSelection = useCallback((id) => {
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
    const handleRemoveCompare = useCallback((id) => {
        removeCompareEntry(id);
        setCompareSelection(prev => prev.filter(entryId => entryId !== id));
        toast.info('Removed saved answer.');
    }, [removeCompareEntry]);
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
    const runDeepScanFlow = useCallback(async (searchQuery) => {
        setDeepScanLoading(true);
        setDeepScanError(null);
        setDeepScanSteps([]);
        try {
            const response = await runDeepScan(searchQuery, { maxPages: 5 });
            setDeepScanSteps(response.steps);
            return response;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Deep scan failed.';
            setDeepScanError(message);
            toast.error(message);
            throw error;
        }
        finally {
            setDeepScanLoading(false);
        }
    }, []);
    const buildSearchContext = useCallback(async (searchQuery) => {
        const context = {
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
        }
        catch (error) {
            console.warn('[Research] Failed to fetch memory context:', error);
        }
        return context;
    }, [
        activeId,
        tabs,
        includeCounterpoints,
        region,
        recencyWeight,
        authorityWeight,
        uploadedDocuments,
    ]);
    const queryKey = useMemo(() => (result?.query ? buildQueryKey(result.query) : null), [result?.query]);
    // File upload handlers
    const handleFileUpload = async (files) => {
        if (!files || files.length === 0)
            return;
        setUploading(true);
        const newDocuments = [];
        for (const file of Array.from(files)) {
            try {
                const fileType = file.type.toLowerCase();
                const fileName = file.name.toLowerCase();
                let extractedText = '';
                // Extract text based on file type
                if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
                    extractedText = await parsePdfFile(file);
                }
                else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    fileName.endsWith('.docx')) {
                    extractedText = await parseDocxFile(file);
                }
                else if (fileType === 'text/plain' ||
                    fileType === 'text/markdown' ||
                    fileName.endsWith('.txt') ||
                    fileName.endsWith('.md')) {
                    // Plain text files
                    extractedText = await file.text();
                }
                else {
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
            }
            catch (err) {
                console.error(`[Research] Failed to parse file ${file.name}:`, err);
            }
        }
        setUploadedDocuments(prev => [...prev, ...newDocuments]);
        setUploading(false);
    };
    const handleRemoveDocument = (id) => {
        setUploadedDocuments(prev => prev.filter(doc => doc.id !== id));
    };
    const handleSearch = async (input) => {
        const searchQuery = typeof input === 'string' ? input : query;
        if (!searchQuery.trim())
            return;
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
            }
            catch {
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
                }
                catch (fallbackError) {
                    console.warn('[Research] Language auto-detection failed:', fallbackError);
                }
            }
        }
        // Phase 2: Translate query if needed (for multi-language search)
        const currentLang = language !== 'auto' ? language : detectedLang;
        if (currentLang && currentLang !== 'en') {
            try {
                // Search in original language, but also prepare English version for backend
                const englishQuery = await multiLanguageAI.translate(searchQuery, 'en', currentLang);
                // Use both queries for better results
                console.log('[Research] Original query:', searchQuery, 'English:', englishQuery);
            }
            catch (error) {
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
        let aggregatedSources = [];
        let aggregatedProviderNames = [];
        let scrapedSnapshots = [];
        try {
            if (!useHybridSearch) {
                aiMetaRef.current = {
                    provider: 'mock',
                    model: 'offline',
                };
                setResult(generateMockResult(searchQuery));
                return;
            }
            const context = await buildSearchContext(searchQuery);
            if (deepScanEnabled) {
                const deepScanResult = await runDeepScanFlow(searchQuery);
                aggregatedSources = deepScanResult.sources.map((source, idx) => mapDeepScanSourceToResearchSource(source, idx));
                aggregatedProviderNames = ['deep-scan'];
                context.deep_scan = {
                    created_at: deepScanResult.created_at,
                    steps: deepScanResult.steps,
                };
            }
            else {
                // Try Tauri IPC first if available (real-time, streaming support)
                let backendResult = null;
                const isTauri = typeof window !== 'undefined' && !!window.__TAURI__;
                if (isTauri && ipc) {
                    try {
                        // Try research_api command (combines search + Ollama)
                        const tauriResult = await ipc.invoke('research_api', { query: searchQuery });
                        if (tauriResult) {
                            backendResult = {
                                summary: tauriResult.summary || tauriResult.answer || '',
                                sources: (tauriResult.sources || []).map((s, idx) => ({
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
                    }
                    catch (tauriError) {
                        console.warn('[Research] Tauri IPC failed, trying HTTP API:', tauriError);
                    }
                }
                // Fallback to HTTP API if Tauri IPC not available or failed
                // Skip in web mode - no backend available
                if (!backendResult) {
                    // Check web mode before attempting API call
                    if (!isWebMode()) {
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
                            console.log('[Research] Backend API returned result:', backendResult ? 'success' : 'empty');
                        }
                        catch (apiError) {
                            // Log the error for debugging
                            console.error('[Research] Backend API call failed:', apiError);
                            console.error('[Research] Error details:', {
                                message: apiError instanceof Error ? apiError.message : String(apiError),
                                stack: apiError instanceof Error ? apiError.stack : undefined,
                            });
                            // Continue with fallback - backend is optional
                        }
                    }
                    else {
                        // In web mode, backendResult remains null and code continues with fallback
                        console.log('[Research] Web mode detected - skipping backend API call');
                        backendResult = null;
                    }
                }
                if (backendResult) {
                    // Map sources
                    if (backendResult.sources && backendResult.sources.length > 0) {
                        aggregatedSources = backendResult.sources.map((source, idx) => ({
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
                    console.log(`[Research] Backend API returned ${aggregatedSources.length} results with summary and metrics`);
                }
                // Fallback to multi-source search if backend API failed or returned no results
                if (aggregatedSources.length === 0) {
                    try {
                        // OPTIMIZED SEARCH: Use optimized search service for better reliability
                        const optimizedResults = await optimizedSearch(searchQuery, {
                            count: 20,
                            language,
                            timeout: 10000,
                        });
                        // Convert optimized results to multi-source format
                        const multiSourceResults = optimizedResults.map(r => ({
                            title: r.title,
                            url: r.url,
                            snippet: r.snippet,
                            source: r.provider,
                            score: r.score,
                            domain: r.domain,
                        }));
                        if (multiSourceResults.length > 0) {
                            aggregatedSources = multiSourceResults.map((hit, idx) => mapMultiSourceResultToSource(hit, idx));
                            aggregatedProviderNames = Array.from(new Set(multiSourceResults.map(hit => typeof hit.source === 'string' ? hit.source.toLowerCase() : 'web')));
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
                                .map(source => source.url);
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
                    }
                    catch (multiSourceError) {
                        console.warn('[Research] Multi-source search failed:', multiSourceError);
                    }
                }
                // Final fallback to live web search if all else fails
                if (aggregatedSources.length === 0) {
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
                            console.log(`[Research] Live web search returned ${liveResults.length} results from ${aggregatedProviderNames.join(', ')}`);
                        }
                    }
                    catch (liveSearchError) {
                        console.warn('[Research] Live web search failed:', liveSearchError);
                    }
                }
                // If we got a backend result with summary, use it directly
                if (backendResult &&
                    (backendResult.summary || backendResult.answer) &&
                    aggregatedSources.length > 0) {
                    const dedupedSources = dedupeResearchSources(aggregatedSources);
                    // Map backend metrics to verification
                    const citations = backendResult.citations || aggregatedSources.length || 0;
                    const hallucination = backendResult.hallucination || 'medium';
                    const hallucinationRisk = hallucination === 'low' ? 0.2 : hallucination === 'medium' ? 0.5 : 0.8;
                    const citationCoverage = Math.min((citations / Math.max(aggregatedSources.length, 1)) * 100, 100);
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
                            suggestions: hallucination === 'high' ? ['Consider verifying with additional sources'] : [],
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
                        const handleToken = (e) => {
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
                                        citationCoverage: streamCitations > 0
                                            ? Math.min((streamCitations / Math.max(aggregatedSources.length, 1)) * 100, 100)
                                            : 0,
                                        ungroundedClaims: [],
                                        hallucinationRisk: streamHallucination === 'low'
                                            ? 0.2
                                            : streamHallucination === 'medium'
                                                ? 0.5
                                                : 0.8,
                                        suggestions: streamHallucination === 'high'
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
                        const handleMetrics = (e) => {
                            if (e.detail) {
                                streamCitations = e.detail.citations || 0;
                                streamHallucination = e.detail.hallucination || 'medium';
                            }
                        };
                        const handleEnd = (e) => {
                            if (e.detail) {
                                streamedText = e.detail.response || streamedText;
                                streamCitations = e.detail.citations || streamCitations;
                                streamHallucination = e.detail.hallucination || streamHallucination;
                            }
                            // Remove listeners
                            window.removeEventListener('research-token', handleToken);
                            window.removeEventListener('research-metrics', handleMetrics);
                            window.removeEventListener('research-end', handleEnd);
                            setLoading(false);
                            setLoadingMessage(null);
                            toast.dismiss();
                        };
                        // Add listeners
                        window.addEventListener('research-token', handleToken);
                        window.addEventListener('research-metrics', handleMetrics);
                        window.addEventListener('research-end', handleEnd);
                        // Start streaming (Tauri command expects query as first parameter, window is auto-injected)
                        await ipc.invoke('research_stream', { query: searchQuery });
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
                    }
                    catch (streamError) {
                        console.warn('[Research] Tauri streaming failed:', streamError);
                        // Continue to fallback
                    }
                }
            }
            // Use unified AI engine for research queries
            try {
                let streamedText = '';
                let streamedResult = null;
                const aiResult = await aiEngine.runTask({
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
                }, event => {
                    if (event.type === 'token' && typeof event.data === 'string') {
                        streamedText += event.data;
                        // Update result with streaming text if needed
                    }
                    else if (event.type === 'done' && typeof event.data !== 'string') {
                        streamedResult = event.data;
                    }
                });
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
                    }
                    catch (graphError) {
                        console.debug('[Research] Auto-graph generation failed:', graphError);
                    }
                }
                // Convert AI result to ResearchResult format
                const sources = [...aggregatedSources];
                // Add citations from AI response as sources
                if (finalResult?.citations && finalResult.citations.length > 0) {
                    sources.push(...finalResult.citations.map((cite, idx) => {
                        let domain = cite.source || '';
                        try {
                            if (cite.url) {
                                domain = new URL(cite.url).hostname;
                            }
                        }
                        catch {
                            // Invalid URL, use source or empty
                            domain = cite.source || '';
                        }
                        const citationType = inferSourceType(domain);
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
                    }));
                }
                // Add uploaded documents as sources
                if (uploadedDocuments.length > 0) {
                    sources.push(...uploadedDocuments.map((doc, idx) => ({
                        id: doc.id,
                        title: doc.name,
                        url: '',
                        domain: 'uploaded',
                        snippet: doc.text.slice(0, 200) + (doc.text.length > 200 ? '...' : ''),
                        text: doc.text,
                        type: 'documentation',
                        sourceType: 'documentation',
                        relevanceScore: 98 - idx, // High relevance for uploaded documents
                        timestamp: Date.now(),
                        metadata: {
                            provider: 'uploaded-doc',
                        },
                    })));
                }
                // Add local search results
                try {
                    const localResults = await searchLocal(searchQuery);
                    sources.push(...localResults.map((lr, idx) => ({
                        id: `local-${lr.id}`,
                        title: lr.title,
                        url: '',
                        domain: 'local',
                        snippet: lr.snippet,
                        text: lr.snippet,
                        type: 'documentation',
                        sourceType: 'documentation',
                        relevanceScore: 85 - idx * 3,
                        timestamp: Date.now(),
                        metadata: {
                            provider: 'local-index',
                        },
                    })));
                }
                catch (localError) {
                    console.debug('[Research] Local search failed:', localError);
                }
                // Build inline citations from AI response
                const inlineCitations = finalResult?.citations?.map((cite, idx) => ({
                    id: `citation-${idx}`,
                    text: cite.title || cite.url || `Source ${idx + 1}`,
                    url: cite.url || '',
                    position: finalAnswer.indexOf(cite.title || '') >= 0
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
            }
            catch (aiError) {
                console.warn('[Research] AI engine failed, falling back to legacy search:', aiError);
                if (aggregatedSources.length > 0) {
                    const providerLabel = aggregatedProviderNames.length > 0
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
                    const sources = optimizedResults.map((r, idx) => ({
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
                    const sources = [
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
                                    type: 'news',
                                    sourceType: 'news',
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
                            type: 'documentation',
                            sourceType: 'documentation',
                            relevanceScore: 90 - idx * 3,
                            timestamp: Date.now(),
                            metadata: {
                                provider: 'local-index',
                            },
                        })),
                    ];
                    setResult({
                        query: searchQuery,
                        summary: duckResult.AbstractText ||
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
                }
                else {
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
                                type: 'documentation',
                                sourceType: 'documentation',
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
                    }
                    else {
                        throw new Error('No search results available. Please check your connection or try a different query.');
                    }
                }
            }
        }
        catch (err) {
            console.error('Research query failed:', err);
            // SEARCH SYSTEM VERIFICATION: Enhanced error handling with offline fallback
            const errorMessage = err instanceof Error
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
                        const localSources = localResults.map((result, idx) => ({
                            id: `local-${idx}`,
                            url: result.url || '',
                            title: result.title || 'Local Result',
                            snippet: result.snippet || '',
                            sourceType: 'local',
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
                }
                catch (fallbackError) {
                    console.warn('[Research] Offline fallback also failed:', fallbackError);
                }
            }
            setError(`Search failed: ${errorMessage}. ${searchHealth?.error ? `(${searchHealth.error})` : ''}`);
            toast.error(`Search failed: ${errorMessage}`);
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
        }
        finally {
            setLoading(false);
            setLoadingMessage(null);
            toast.dismiss();
        }
    };
    useEffect(() => {
        const handleQuickstart = (event) => {
            const detail = event.detail;
            if (!detail?.query)
                return;
            setQuery(detail.query);
            setTimeout(() => {
                void handleSearch(detail.query);
            }, 100);
        };
        window.addEventListener('research:quickstart', handleQuickstart);
        return () => {
            window.removeEventListener('research:quickstart', handleQuickstart);
        };
    }, []);
    useEffect(() => {
        void refreshGraph();
    }, [refreshGraph]);
    useEffect(() => {
        if (!result || typeof window === 'undefined' || !window.graph?.add)
            return;
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
        window.graph.add({
            key: currentQueryKey,
            type: 'research-query',
            title: result.query.slice(0, 160),
            meta: {
                query: result.query,
                createdAt: Date.now(),
            },
        }, queryEdges);
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
            window.graph.add({
                key: sourceKey,
                type: 'research-source',
                title: source.title,
                meta: {
                    url: source.url,
                    domain: source.domain,
                    snippet: source.snippet || source.text?.slice(0, 140),
                    relevance: source.relevanceScore,
                },
            }, evidenceEdges);
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
                        fragmentUrl: item?.quoteUrl || source.url,
                    },
                });
            });
        });
        (result.contradictions ?? []).forEach(contradiction => {
            if (!Array.isArray(contradiction.sources) || contradiction.sources.length < 2)
                return;
            const [first, ...rest] = contradiction.sources;
            const baseSource = result.sources[first];
            if (!baseSource)
                return;
            const baseKey = buildSourceKey(baseSource, first);
            rest.forEach(targetIdx => {
                const targetSource = result.sources[targetIdx];
                if (!targetSource)
                    return;
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
    const handleOpenUrl = async (url) => {
        try {
            if (activeId) {
                await ipc.tabs.navigate(activeId, url);
            }
            else {
                await ipc.tabs.create(url);
            }
        }
        catch (error) {
            console.error('Failed to open URL:', error);
        }
    };
    const handleRunExample = (example) => {
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
            const suggestions = [];
            // Try Redix streaming for live suggestions (if online)
            if (!isOffline) {
                try {
                    let hasResults = false;
                    await ipc.redix.stream(trimmed, {
                        onChunk: (chunk) => {
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
                }
                catch {
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
                }
                catch {
                    // Silent fail - continue with other suggestions
                }
            }
            // Fallback: Recent history
            try {
                const history = await ipc.history.search(trimmed);
                if (Array.isArray(history) && history.length > 0) {
                    history.slice(0, 5).forEach((item) => {
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
            }
            catch {
                // Silent fail
            }
            // Tab matches
            tabs.forEach(tab => {
                const title = tab.title || 'Untitled';
                const tabUrl = tab.url || '';
                if ((title.toLowerCase().includes(trimmed.toLowerCase()) ||
                    tabUrl.toLowerCase().includes(trimmed.toLowerCase())) &&
                    !suggestions.find(s => s.title === title)) {
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
        const handleClickOutside = (event) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
                setShowAutocomplete(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(ResearchStagehandIntegration, {}), _jsxs(LayoutEngine, { sidebarWidth: 0, navHeight: 0, className: "mode-theme mode-theme--research bg-[#0f111a] text-gray-100", children: [_jsxs(LayoutHeader, { sticky: false, className: "border-b border-white/5 bg-black/20 backdrop-blur", children: [_jsxs("div", { className: "flex items-center justify-between px-6 pb-3 pt-6", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("h1", { className: "text-xl font-semibold text-white", children: "Research Mode" }), _jsx("p", { className: "text-sm text-gray-400", children: "Aggregate evidence, generate traceable answers, and surface counterpoints without leaving the browser." })] }), _jsxs("div", { className: "ml-4 flex flex-shrink-0 items-center gap-2", children: [_jsx("button", { type: "button", onClick: () => setUseEnhancedView(prev => !prev), className: `rounded-lg border px-3 py-1.5 text-sm transition ${useEnhancedView
                                                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200'
                                                    : 'border-white/20 bg-white/10 text-gray-300 hover:bg-white/20'}`, title: useEnhancedView ? 'Switch to Standard View' : 'Switch to Enhanced Multilingual View', children: _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Sparkles, { size: 14 }), useEnhancedView ? 'Enhanced' : 'Standard'] }) }), _jsx("button", { type: "button", onClick: () => setCursorPanelOpen(prev => !prev), className: `rounded-lg border px-3 py-1.5 text-sm transition ${cursorPanelOpen
                                                    ? 'border-blue-500/60 bg-blue-500/10 text-blue-200'
                                                    : 'border-white/20 bg-white/10 text-gray-300 hover:bg-white/20'}`, title: "Toggle Cursor AI Assistant", children: _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(Sparkles, { size: 14 }), "Cursor AI"] }) }), _jsx(ActiveContainerBadge, { containers: containers, activeContainerId: activeContainerId })] })] }), _jsx("div", { className: "flex-shrink-0 px-6 pb-5", children: _jsxs("div", { className: "relative max-w-4xl", ref: autocompleteRef, children: [_jsxs("form", { onSubmit: async (e) => {
                                                e.preventDefault();
                                                setShowAutocomplete(false);
                                                await handleSearch();
                                            }, className: "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/40 transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20", children: [_jsx(Search, { size: 18, className: "flex-shrink-0 text-gray-500" }), _jsx("input", { id: "research-query-input", name: "research-query", className: "flex-1 bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none", value: query, onChange: e => {
                                                        setQuery(e.target.value);
                                                        setShowAutocomplete(true);
                                                        // Auto-detect language as user types
                                                        if (e.target.value.length > 3) {
                                                            detectLanguage(e.target.value)
                                                                .then(result => {
                                                                setDetectedLang(result.language);
                                                            })
                                                                .catch(() => { });
                                                        }
                                                    }, onFocus: () => {
                                                        if (autocompleteSuggestions.length > 0) {
                                                            setShowAutocomplete(true);
                                                        }
                                                    }, placeholder: (() => {
                                                        const effectiveLang = language === 'auto' ? detectedLang : language;
                                                        if (effectiveLang === 'hi')
                                                            return 'हिंदी में पूछें: iPhone vs Samsung की तुलना करें';
                                                        if (effectiveLang === 'ta')
                                                            return 'தமிழில் கேளுங்கள்: iPhone vs Samsung ஒப்பிடுக';
                                                        return 'Ask in Hindi: Compare iPhone vs Samsung';
                                                    })(), disabled: loading }), _jsxs("div", { className: "flex items-center gap-2", children: [autocompleteLoading && (_jsx(Skeleton, { variant: "text", width: 80, height: 16, className: "text-xs" })), _jsx("input", { id: "research-file-input", name: "research-file", ref: fileInputRef, type: "file", multiple: true, accept: ".pdf,.docx,.txt,.md", onChange: e => handleFileUpload(e.target.files), className: "hidden" }), _jsxs("button", { type: "button", onClick: () => fileInputRef.current?.click(), disabled: uploading, className: "flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40", title: "Upload documents (PDF, DOCX, TXT, MD)", children: [_jsx(Upload, { size: 14 }), uploading ? 'Processing…' : 'Upload'] }), _jsx("button", { type: "submit", disabled: loading || !query.trim(), className: "rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40", children: loading ? 'Researching…' : 'Run research' }), _jsx(VoiceButton, { onResult: text => {
                                                                // Parse voice command for research triggers and language
                                                                const parsed = parseResearchVoiceCommand(text);
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
                                                                }
                                                                else {
                                                                    // Regular voice input - just set query and search
                                                                    setQuery(text);
                                                                    setTimeout(() => handleSearch(text), 120);
                                                                }
                                                            }, small: true })] })] }), showAutocomplete && autocompleteSuggestions.length > 0 && (_jsx("div", { className: "absolute left-0 right-0 top-full z-[100] mt-2 max-h-[400px] min-h-[120px] overflow-y-auto rounded-xl border border-white/10 bg-[#111422] shadow-xl shadow-black/50", children: _jsx("div", { className: "space-y-1 p-2", children: autocompleteSuggestions.map((suggestion, idx) => (_jsxs("button", { type: "button", onClick: () => {
                                                        suggestion.action?.();
                                                    }, className: "w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500/50", children: [_jsx("div", { className: "line-clamp-1 text-sm font-medium text-white", children: suggestion.title }), suggestion.subtitle && (_jsx("div", { className: "mt-0.5 line-clamp-1 text-xs text-gray-400", children: suggestion.subtitle }))] }, idx))) }) }))] }) }), uploadedDocuments.length > 0 && (_jsx("div", { className: "flex-shrink-0 px-6 pb-3", children: _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("span", { className: "text-xs font-medium text-gray-400", children: "Uploaded documents:" }), uploadedDocuments.map(doc => (_jsxs("div", { className: "group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300", children: [_jsx(FileText, { size: 12, className: "text-gray-400" }), _jsx("span", { className: "max-w-[200px] truncate", children: doc.name }), _jsxs("span", { className: "text-gray-500", children: ["(", (doc.size / 1024).toFixed(1), " KB)"] }), _jsx("button", { type: "button", onClick: () => handleRemoveDocument(doc.id), className: "ml-1 rounded p-0.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100", title: "Remove document", children: _jsx(X, { size: 12, className: "text-gray-400 hover:text-gray-200" }) })] }, doc.id)))] }) }))] }), _jsx(LayoutBody, { className: "flex min-h-0 flex-1 gap-6 overflow-hidden px-6 pb-6", children: useEnhancedView ? (_jsx("div", { className: "flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#111422] shadow-xl shadow-black/30", children: _jsx(RegenResearchPanel, {}) })) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: "relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#111422] shadow-xl shadow-black/30", children: [_jsx("div", { className: "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" }), _jsxs("div", { className: "flex h-full flex-col space-y-4 p-5", children: [_jsx(ResearchControls, { authorityBias: authorityBias, includeCounterpoints: includeCounterpoints, region: region, loading: loading, onAuthorityBiasChange: setAuthorityBias, onIncludeCounterpointsChange: setIncludeCounterpoints, onRegionChange: value => setRegion(value), deepScanEnabled: deepScanEnabled, onDeepScanToggle: value => setDeepScanEnabled(value) }), deepScanEnabled && (_jsx(DeepScanStatus, { loading: deepScanLoading, steps: deepScanSteps, error: deepScanError })), error && (_jsx("div", { className: "rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur", children: error })), loading && (_jsxs("div", { className: "flex flex-1 flex-col items-center justify-center gap-4", children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-blue-200", children: [_jsx(Sparkles, { size: 14, className: "animate-pulse" }), "Gathering sources and evaluating evidence\u2026"] }), _jsxs("div", { className: "w-full max-w-2xl space-y-4", children: [_jsx(LoadingSkeleton, { variant: "card" }), _jsx(LoadingSkeleton, { variant: "list", lines: 3 }), _jsx(LoadingSkeleton, { variant: "text", lines: 4 })] }), _jsx("p", { className: "text-xs text-gray-500", children: "Cross-checking accuracy, bias, and contradictions before presenting the answer." })] })), !loading && result && (_jsxs("div", { className: "flex-1 space-y-4 overflow-y-auto pr-1", children: [_jsx(EvidenceOverlay, { evidence: result.evidence || [], sources: result.sources, activeEvidenceId: activeEvidenceId, onEvidenceClick: setActiveEvidenceId }), _jsx(ResearchResultView, { result: result, onOpenSource: handleOpenUrl, activeSourceId: activeSourceId, onActiveSourceChange: setActiveSourceId, onSaveForCompare: handleSaveForCompare, onShowCompare: () => setComparePanelOpen(true), compareCount: compareEntries.length }), _jsx(ResearchGraphSection, { showGraph: showGraph, onToggleGraph: () => setShowGraph(prev => !prev), query: result.query, queryKey: queryKey, graphData: graphData, activeSourceId: activeSourceId, onSelectSource: setActiveSourceId, onOpenSource: handleOpenUrl })] })), !loading && !result && !error && _jsx(EmptyState, { onRunExample: handleRunExample })] })] }), _jsx(InsightsSidebar, { result: result, loading: loading, onOpenSource: handleOpenUrl, activeSourceId: activeSourceId, onSelectSource: setActiveSourceId })] })) }), _jsx(CompareAnswersPanel, { open: comparePanelOpen, answers: compareEntries, selectedIds: compareSelection, onToggleSelect: handleToggleCompareSelection, onClose: () => setComparePanelOpen(false), onRemove: handleRemoveCompare }), cursorPanelOpen && (_jsx("div", { className: "fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-slate-700/70 bg-slate-900/95 shadow-2xl backdrop-blur-xl", children: _jsx(CursorChat, { pageSnapshot: activeId && tabs.find(t => t.id === activeId)
                                ? {
                                    url: tabs.find(t => t.id === activeId)?.url || '',
                                    title: tabs.find(t => t.id === activeId)?.title || '',
                                    html: undefined, // Could be enhanced to capture page HTML
                                }
                                : undefined, onClose: () => setCursorPanelOpen(false) }) }))] })] }));
}
const REGION_OPTIONS = [
    { value: 'global', label: 'Global' },
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'eu', label: 'Europe' },
    { value: 'asia', label: 'Asia Pacific' },
];
function ResearchControls({ authorityBias, includeCounterpoints, region, loading, onAuthorityBiasChange, onIncludeCounterpointsChange, onRegionChange, deepScanEnabled, onDeepScanToggle, }) {
    return (_jsxs("div", { className: "grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs text-gray-200 shadow-inner shadow-black/30 sm:grid-cols-[minmax(0,_1fr)_auto_auto]", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide text-gray-400", children: "Recency vs authority" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-[11px] text-gray-500", children: "Recency" }), _jsx("div", { className: "relative flex-1", children: _jsx("input", { type: "range", min: 0, max: 100, value: authorityBias, disabled: loading, onChange: e => onAuthorityBiasChange(Number(e.target.value)), className: "h-1 w-full cursor-pointer accent-blue-500 disabled:opacity-40" }) }), _jsx("span", { className: "text-[11px] text-gray-500", children: "Authority" }), _jsxs("span", { className: "rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200", children: [authorityBias, "%"] })] })] }), _jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px]", children: [_jsx("input", { type: "checkbox", className: "h-3.5 w-3.5 rounded border-white/20 bg-transparent text-blue-500 focus:ring-blue-500 disabled:opacity-40", checked: includeCounterpoints, disabled: loading, onChange: e => onIncludeCounterpointsChange(e.target.checked) }), "Include counterpoints"] }), _jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px]", children: ["Region", _jsx("select", { value: region, disabled: loading, onChange: e => onRegionChange(e.target.value), className: "rounded border border-white/10 bg-[#0c0e18] px-2 py-1 text-[11px] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-0 disabled:opacity-40", children: REGION_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-[11px] text-indigo-100 sm:col-span-3", children: [_jsx("input", { type: "checkbox", className: "h-3.5 w-3.5 rounded border-indigo-400/60 bg-transparent text-indigo-300 focus:ring-indigo-400 disabled:opacity-40", checked: deepScanEnabled, disabled: loading, onChange: e => onDeepScanToggle(e.target.checked) }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-[11px] font-semibold uppercase tracking-wide", children: "Deep scan" }), _jsxs("span", { className: "text-[11px] text-indigo-200/80", children: ["Analyze multiple pages with scraper context (", deepScanEnabled ? 'on' : 'off', ")"] })] })] })] }));
}
function DeepScanStatus({ loading, steps, error, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3 text-xs text-indigo-100", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[11px] uppercase tracking-wide text-indigo-200", children: "Deep scan progress" }), _jsx("p", { className: "text-[11px] text-indigo-200/70", children: steps.length > 0
                                    ? `${steps.length} checkpoints recorded`
                                    : 'Preparing sources via scraper' })] }), loading && (_jsx(Skeleton, { variant: "circular", width: 16, height: 16, className: "animate-pulse" }))] }), error && (_jsx("p", { className: "mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1 text-red-200", children: error })), _jsx("ol", { className: "space-y-1 text-[11px] text-indigo-100/90", children: (steps.length > 0
                    ? steps
                    : [
                        {
                            label: 'Gathering sources…',
                            status: loading ? 'running' : 'complete',
                            started_at: '',
                            completed_at: '',
                        },
                    ]).map((step, idx) => (_jsxs("li", { className: "rounded border border-indigo-500/20 px-3 py-1", children: [_jsx("span", { className: "font-semibold", children: step.label }), _jsx("span", { className: "ml-2 text-indigo-200/70", children: step.status }), step.detail && _jsx("span", { className: "ml-2 text-indigo-200/70", children: step.detail })] }, `${step.label}-${idx}`))) })] }));
}
function ResearchResultView({ result, activeSourceId, onActiveSourceChange, onOpenSource, onSaveForCompare, onShowCompare, compareCount, }) {
    const confidencePercent = Math.round(result.confidence * 100);
    const verification = result.verification;
    const getSourceKey = (sourceIndex) => {
        const source = result.sources[sourceIndex];
        return source?.url ?? `source-${sourceIndex}`;
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("section", { className: "rounded-2xl border border-white/5 bg-white/5 px-6 py-5 shadow-inner shadow-black/30", children: [_jsxs("header", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-base font-semibold text-white", children: "AI answer with citations" }), _jsxs("p", { className: "text-xs text-gray-400", children: [result.sources.length, " sources considered \u2022 Confidence ", confidencePercent, "%"] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [verification && (_jsx("span", { className: `rounded-full px-3 py-1 text-xs font-medium ${verification.verified
                                            ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                                            : 'border border-amber-500/50 bg-amber-500/10 text-amber-200'}`, children: verification.verified ? 'Verified' : 'Needs review' })), _jsx("button", { type: "button", onClick: onSaveForCompare, className: "inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs text-gray-200 hover:border-white/40", children: "Save for compare" }), _jsxs("button", { type: "button", onClick: onShowCompare, className: "inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs text-sky-100 hover:border-sky-400/70", children: ["Open compare (", compareCount, ")"] })] })] }), _jsx(AnswerWithCitations, { summary: result.summary, citations: result.citations, inlineEvidence: result.inlineEvidence, sources: result.sources, activeSourceId: activeSourceId, onActivate: sourceKey => {
                            onActiveSourceChange(sourceKey);
                            // Find evidence for this source
                            const sourceIndex = result.sources.findIndex(s => (s.url ?? `source-${result.sources.indexOf(s)}`) === sourceKey);
                            if (sourceIndex !== -1) {
                                const evidence = result.evidence?.find(e => e.sourceIndex === sourceIndex);
                                if (evidence) {
                                    setActiveEvidenceId(evidence.id);
                                }
                            }
                        }, onOpenSource: onOpenSource, onExport: async (format) => {
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
                                }
                                else {
                                    // PDF export via IPC
                                    await ipc.research.export({
                                        format: 'markdown', // PDF would require backend support
                                        sources: result.sources.map(s => s.url),
                                        includeNotes: true,
                                    });
                                }
                            }
                            catch (error) {
                                console.error('Export failed:', error);
                            }
                        } }), result.citations.length > 0 && (_jsxs("div", { className: "mt-5 rounded-xl border border-white/5 bg-[#1a1d2a] px-4 py-3", children: [_jsx("h3", { className: "mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400", children: "Citations" }), _jsx("ul", { className: "space-y-2", children: result.citations.map(citation => {
                                    const source = result.sources[citation.sourceIndex];
                                    const sourceKey = getSourceKey(citation.sourceIndex);
                                    const isActive = activeSourceId === sourceKey;
                                    if (!source)
                                        return null;
                                    return (_jsxs("li", { className: `rounded-lg border px-3 py-2 text-xs transition-colors ${isActive
                                            ? 'border-blue-500/40 bg-blue-500/10 text-blue-100'
                                            : 'border-white/5 bg-white/[0.02] text-gray-300 hover:border-blue-400/40 hover:bg-blue-400/5'}`, children: [_jsxs("button", { className: "font-semibold text-indigo-300 hover:text-indigo-200", onClick: () => {
                                                    onActiveSourceChange(sourceKey);
                                                    onOpenSource(source.url);
                                                }, children: ["[", citation.index, "] ", source.title] }), _jsxs("div", { className: "text-[11px] text-gray-500", children: ["Confidence ", (citation.confidence * 100).toFixed(0), "% \u2022 ", source.domain] })] }, citation.index));
                                }) })] }))] }), verification && _jsx(VerificationSummary, { verification: verification }), _jsx(SourcesList, { sources: result.sources, activeSourceId: activeSourceId, onActivate: onActiveSourceChange, onOpenSource: onOpenSource })] }));
}
const importanceLabel = {
    high: 'Critical evidence',
    medium: 'Supporting evidence',
    low: 'Context',
};
function InsightsSidebar({ result, loading, onOpenSource, activeSourceId, onSelectSource, }) {
    if (loading) {
        return (_jsxs("aside", { className: "w-[310px] shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-4 shadow-inner shadow-black/50", children: [_jsx("div", { className: "h-20 animate-pulse rounded-xl bg-white/5" }), _jsx("div", { className: "h-32 animate-pulse rounded-xl bg-white/5" }), _jsx("div", { className: "h-32 animate-pulse rounded-xl bg-white/5" })] }));
    }
    if (!result) {
        return (_jsx("aside", { className: "w-[310px] shrink-0 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-5 shadow-inner shadow-black/50", children: _jsxs("div", { className: "space-y-4 text-sm text-gray-400", children: [_jsx("div", { className: "rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300", children: _jsxs("p", { className: "flex items-center gap-2 text-gray-200", children: [_jsx(Sparkles, { size: 14, className: "text-blue-300" }), "Try questions that need multiple independent sources."] }) }), _jsx(EmptyState, { onRunExample: onSelectSource, minimal: true })] }) }));
    }
    const topEvidence = (result.evidence ?? []).slice(0, 3);
    const contradictions = (result.contradictions ?? []).slice(0, 2);
    const activeEvidenceKey = activeSourceId;
    return (_jsxs("aside", { className: "w-[310px] shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-5 shadow-inner shadow-black/50", children: [_jsxs("div", { className: "space-y-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-gray-400", children: [_jsx("span", { children: "Confidence" }), _jsxs("span", { className: "text-sm font-semibold text-blue-200", children: [(result.confidence * 100).toFixed(0), "%"] })] }), _jsx("div", { className: "h-1.5 w-full overflow-hidden rounded bg-white/10", children: _jsx("div", { className: "h-full rounded bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500", style: { width: `${Math.min(100, Math.max(0, result.confidence * 100))}%` } }) }), _jsxs("p", { className: "text-[11px] text-gray-500", children: [result.sources.length, " vetted sources \u2022 ", result.citations.length, " inline citations"] }), _jsxs("button", { className: "inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-300 hover:border-blue-400/40 hover:text-blue-200", onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), children: [_jsx(RefreshCcw, { size: 12 }), "Adjust research settings"] })] }), topEvidence.length > 0 && (_jsxs("div", { className: "space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-xs text-blue-100", children: [_jsx("span", { className: "font-semibold uppercase tracking-wide", children: "Key evidence" }), _jsxs("span", { children: [topEvidence.length, " of ", (result.evidence ?? []).length] })] }), _jsx("div", { className: "space-y-2 text-xs text-blue-100/90", children: topEvidence.map(item => {
                            const source = result.sources[item.sourceIndex];
                            if (!source)
                                return null;
                            const sourceKey = source.url ?? `source-${item.sourceIndex}`;
                            const isActive = activeEvidenceKey === sourceKey;
                            return (_jsxs("button", { onClick: () => {
                                    onSelectSource(sourceKey);
                                    onOpenSource(item.fragmentUrl || source.url);
                                }, className: `w-full rounded-lg border px-3 py-2 text-left transition-colors ${isActive
                                    ? 'border-blue-300 bg-blue-400/20'
                                    : 'border-blue-400/30 hover:bg-blue-400/15'}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-blue-200/80", children: [_jsx("span", { children: importanceLabel[item.importance] }), _jsx("span", { children: source.domain })] }), _jsx("p", { className: "mt-1 line-clamp-3 text-[11px] text-blue-50/90", children: item.quote })] }, item.id));
                        }) })] })), contradictions.length > 0 && (_jsxs("div", { className: "space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-amber-100", children: [_jsx("span", { className: "font-semibold uppercase tracking-wide", children: "Contradictions" }), _jsx("span", { children: contradictions.length })] }), _jsx("ul", { className: "space-y-2 text-[11px] text-amber-50/90", children: contradictions.map((item, index) => {
                            const severity = item.disagreement === 'major' ? 'Major' : 'Minor';
                            return (_jsxs("li", { className: "rounded-lg border border-amber-400/30 bg-amber-500/10 p-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-semibold text-amber-100", children: item.claim }), _jsx("span", { className: "text-amber-200", children: severity })] }), _jsx("p", { className: "mt-1 text-amber-100/70", children: item.summary || 'Investigate differing positions.' }), _jsxs("button", { onClick: () => {
                                            const firstSource = item.sources[0];
                                            if (typeof firstSource === 'number') {
                                                const source = result.sources[firstSource];
                                                if (source) {
                                                    onSelectSource(source.url ?? `source-${firstSource}`);
                                                    onOpenSource(source.url);
                                                }
                                            }
                                        }, className: "mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-amber-100", children: ["View sources", _jsx(ChevronRight, { size: 12 })] })] }, `${item.claim}-${index}`));
                        }) })] })), result.biasProfile && (_jsxs("div", { className: "space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3 text-xs text-sky-100", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "font-semibold uppercase tracking-wide", children: "Bias snapshot" }), _jsxs("span", { children: [result.biasProfile.authorityBias, "% authority"] })] }), _jsx("div", { className: "h-1.5 w-full overflow-hidden rounded bg-sky-500/20", children: _jsx("div", { className: "h-full bg-gradient-to-r from-sky-500 via-blue-500 to-purple-500", style: { width: `${result.biasProfile.authorityBias}%` } }) }), _jsx("div", { className: "space-y-1 pt-2", children: result.biasProfile.domainMix.slice(0, 3).map(entry => (_jsxs("div", { className: "flex items-center justify-between text-[11px]", children: [_jsx("span", { children: capitalize(entry.type) }), _jsxs("span", { children: [entry.percentage, "%"] })] }, entry.type))) })] })), result.taskChains && result.taskChains.length > 0 && (_jsxs("div", { className: "space-y-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.07] px-4 py-3", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-purple-100", children: [_jsx("span", { className: "font-semibold uppercase tracking-wide", children: "Next checks" }), _jsx("span", { children: result.taskChains.length })] }), _jsx("ol", { className: "space-y-2 text-[11px] text-purple-50/80", children: result.taskChains
                            .flatMap(chain => chain.steps)
                            .filter(step => step.status !== 'done')
                            .slice(0, 3)
                            .map(step => (_jsxs("li", { className: "rounded-lg border border-purple-400/30 bg-purple-400/10 px-3 py-2", children: [_jsx("span", { className: "font-semibold text-purple-100", children: step.title }), _jsx("p", { className: "text-purple-100/70", children: step.description })] }, step.id))) })] })), _jsx(OmniAgentInput, { currentUrl: activeId && tabs.find(t => t.id === activeId)
                    ? tabs.find(t => t.id === activeId)?.url
                    : undefined, onResult: result => {
                    // Display result in a toast or add to research results
                    console.log('OmniAgent result:', result);
                } })] }));
}
function ActiveContainerBadge({ containers, activeContainerId, }) {
    const activeContainer = containers.find(container => container.id === activeContainerId) ??
        containers.find(container => container.id === 'default');
    if (!activeContainer) {
        return null;
    }
    return (_jsxs("div", { className: "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200 shadow-inner shadow-black/20", children: [_jsx("span", { className: "h-2.5 w-2.5 rounded-full", style: { backgroundColor: activeContainer.color ?? '#6366f1' } }), _jsx("span", { className: "font-medium", children: activeContainer.name }), _jsx("span", { className: "text-[10px] uppercase tracking-wide text-gray-400", children: capitalize(activeContainer.scope ?? 'session') })] }));
}
function EmptyState({ onRunExample, minimal = false, }) {
    const [detectedLang, setDetectedLang] = useState('en');
    const [langConfidence, setLangConfidence] = useState(0);
    useEffect(() => {
        // Auto-detect language from browser/system
        const detectUserLanguage = async () => {
            try {
                const result = await detectLanguage(navigator.language || 'en');
                setDetectedLang(result.language);
                setLangConfidence(result.confidence);
            }
            catch {
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
        }
        else if (detectedLang === 'ta') {
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
        }
        else if (detectedLang === 'ta') {
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
        return (_jsx("ul", { className: "space-y-2 text-xs text-gray-400", children: examples.slice(0, 2).map(example => (_jsx("li", { children: _jsx("button", { className: "text-left text-gray-300 hover:text-blue-200", onClick: () => onRunExample(example), children: example }) }, example))) }));
    }
    return (_jsxs("div", { className: "flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl bg-gradient-to-br from-purple-900/40 via-blue-900/40 to-purple-900/40 px-10 py-16 text-center", children: [_jsx(motion.div, { initial: { scale: 0.9, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.3 }, className: "flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-blue-300 shadow-lg", children: _jsx(Sparkles, { size: 32 }) }), _jsxs(motion.div, { initial: { y: 10, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay: 0.1, duration: 0.3 }, className: "space-y-3", children: [_jsx("h1", { className: "text-3xl font-bold text-white", children: welcomeText.title }), _jsx("p", { className: "max-w-md text-base text-gray-300", children: welcomeText.subtitle })] }), _jsxs(motion.div, { initial: { y: 10, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay: 0.2, duration: 0.3 }, className: "flex w-full max-w-md flex-col gap-3", children: [examples.map((example, idx) => (_jsxs("button", { onClick: () => onRunExample(example), className: "group relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-left text-gray-200 transition-all hover:border-blue-400/60 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/20", children: [_jsxs("div", { className: "relative z-10 flex items-center gap-3", children: [_jsx("div", { className: "flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-300", children: idx + 1 }), _jsx("span", { className: "font-medium", children: example })] }), _jsx(motion.div, { className: "absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10", initial: { x: '-100%' }, whileHover: { x: 0 }, transition: { duration: 0.3 } })] }, example))), _jsx("button", { onClick: () => onRunExample(examples[0]), className: "mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-purple-700 hover:shadow-xl", children: welcomeText.button })] }), langConfidence > 0.5 && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.4 }, className: "text-xs text-gray-400", children: ["Detected: ", detectedLang.toUpperCase(), " (", (langConfidence * 100).toFixed(0), "% confidence)"] }))] }));
}
function SourcesList({ sources, activeSourceId, onActivate, onOpenSource, }) {
    if (!sources || sources.length === 0)
        return null;
    const providerCounts = sources.reduce((acc, source) => {
        const provider = typeof source.metadata?.provider === 'string' ? source.metadata.provider.toLowerCase() : '';
        if (!provider)
            return acc;
        acc[provider] = (acc[provider] ?? 0) + 1;
        return acc;
    }, {});
    const providerSummary = Object.entries(providerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([provider, count]) => `${formatProviderName(provider)} (${count})`)
        .join(' • ') || 'Ranked by relevance & consensus';
    return (_jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/[0.03] p-4", children: [_jsx("header", { className: "mb-4 flex flex-wrap items-center justify-between gap-2", children: _jsxs("div", { children: [_jsxs("h3", { className: "text-sm font-semibold text-white", children: ["Sources (", sources.length, ")"] }), _jsx("p", { className: "text-xs text-gray-500", children: providerSummary })] }) }), _jsx("div", { className: "flex flex-col gap-3", children: sources.map((source, idx) => {
                    const sourceKey = source.url ?? `source-${idx}`;
                    return (_jsx(SourceCard, { source: source, index: idx, isActive: activeSourceId === sourceKey, onActivate: onActivate, onOpen: onOpenSource }, source.url || idx));
                }) })] }));
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
function mapMultiSourceResultToSource(hit, idx) {
    const domain = hit.domain || extractDomain(hit.url);
    const provider = typeof hit.source === 'string' ? hit.source : 'web';
    const sourceType = inferSourceType(domain, provider);
    const baseScore = Number.isFinite(hit.score) ? hit.score : 0.62;
    const extendedMeta = (hit.metadata || {});
    const parsedTimestamp = typeof extendedMeta.timestamp === 'number'
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
function mapDeepScanSourceToResearchSource(source, idx) {
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
function inferSourceType(domain, provider) {
    const value = (domain || '').toLowerCase();
    if (value.endsWith('.edu') ||
        value.includes('.ac.') ||
        value.includes('arxiv') ||
        value.includes('researchgate')) {
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
function dedupeResearchSources(sources) {
    const seen = new Set();
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
function normalizeSourceUrl(url) {
    if (!url)
        return '';
    return url.replace(/\/+$/, '').toLowerCase();
}
function mergeScrapedSnapshots(sources, snapshots) {
    if (!snapshots || snapshots.length === 0) {
        return sources;
    }
    const snapshotMap = new Map();
    snapshots.forEach(snapshot => {
        const candidates = [snapshot.finalUrl, snapshot.url].filter(Boolean);
        candidates.forEach(candidate => {
            snapshotMap.set(normalizeSourceUrl(candidate), snapshot);
        });
    });
    return sources.map(source => {
        const match = snapshotMap.get(normalizeSourceUrl(source.url)) ||
            snapshotMap.get(normalizeSourceUrl(source.metadata?.canonicalUrl));
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
function extractDomain(url) {
    if (!url)
        return '';
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    }
    catch {
        return '';
    }
}
function formatProviderName(provider) {
    if (!provider)
        return 'web';
    const normalized = provider.replace(/[-_]/g, ' ').trim();
    if (!normalized)
        return 'web';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
function ResearchGraphSection({ showGraph, onToggleGraph, query, queryKey, graphData, activeSourceId, onSelectSource, onOpenSource, }) {
    const hasGraphData = graphData &&
        Array.isArray(graphData.nodes) &&
        graphData.nodes.some((node) => typeof node?.type === 'string' && node.type.startsWith('research-'));
    return (_jsxs("section", { className: "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner shadow-black/20", children: [_jsxs("header", { className: "mb-3 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-semibold text-white", children: "Knowledge graph" }), _jsxs("p", { className: "text-xs text-gray-400", children: ["Connections for \u201C", query.slice(0, 60), query.length > 60 ? '…' : '', "\u201D across sources and evidence."] })] }), _jsx("button", { type: "button", onClick: onToggleGraph, className: "rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-blue-400/40 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400/40", children: showGraph ? 'Hide graph' : 'Show graph' })] }), showGraph ? (_jsx(ResearchGraphView, { query: query, queryKey: queryKey, graphData: graphData, activeSourceId: activeSourceId, onSelectSource: onSelectSource, onOpenSource: onOpenSource })) : (_jsx("div", { className: "rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-xs text-gray-400", children: "Graph hidden. Toggle \u201CShow graph\u201D to explore relationships again." })), !hasGraphData && showGraph && (_jsx("div", { className: "mt-3 rounded-lg border border-white/10 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-200", children: "First research run captured. Subsequent questions will layer onto this graph for deeper context." }))] }));
}
function VerificationSummary({ verification }) {
    if (!verification)
        return null;
    return (_jsxs("section", { className: "space-y-3 rounded border border-neutral-800 bg-neutral-900/40 p-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-200", children: "Verification summary" }), _jsx("span", { className: `rounded border px-2 py-1 text-xs font-medium ${verification.verified
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`, children: verification.verified ? 'Pass' : 'Review suggested' })] }), _jsxs("div", { className: "grid gap-3 text-xs text-gray-300 sm:grid-cols-4", children: [_jsx(Metric, { label: "Claim density", value: `${verification.claimDensity.toFixed(1)} / 100 words` }), _jsx(Metric, { label: "Citation coverage", value: `${verification.citationCoverage.toFixed(0)}%` }), _jsx(Metric, { label: "Hallucination risk", value: `${(verification.hallucinationRisk * 100).toFixed(0)}%` }), _jsx(Metric, { label: "Ungrounded claims", value: `${verification.ungroundedClaims.length}` })] }), verification.ungroundedClaims.length > 0 && (_jsxs("details", { className: "rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200", children: [_jsxs("summary", { className: "cursor-pointer font-semibold text-amber-300", children: ["Ungrounded claims (", verification.ungroundedClaims.length, ")"] }), _jsx("ul", { className: "mt-2 space-y-1 text-[11px] text-amber-100", children: verification.ungroundedClaims.map((claim, idx) => (_jsxs("li", { children: [_jsx("span", { className: "font-medium capitalize", children: claim.severity }), ": ", claim.text] }, `${claim.position}-${idx}`))) })] })), verification.suggestions.length > 0 && (_jsxs("div", { className: "space-y-1 text-xs text-gray-300", children: [_jsx("h4", { className: "font-semibold text-gray-200", children: "Suggestions" }), _jsx("ul", { className: "list-inside list-disc space-y-1 text-gray-400", children: verification.suggestions.map((suggestion, idx) => (_jsx("li", { children: suggestion }, `${suggestion}-${idx}`))) })] }))] }));
}
function Metric({ label, value }) {
    return (_jsxs("div", { className: "flex flex-col gap-1 rounded border border-neutral-800 bg-neutral-950/60 p-3", children: [_jsx("span", { className: "text-[11px] uppercase tracking-wide text-gray-500", children: label }), _jsx("span", { className: "text-sm font-semibold text-gray-200", children: value })] }));
}
function normaliseMockSnippet(snippet) {
    if (!snippet)
        return '';
    const cleaned = snippet.replace(/\s+/g, ' ').trim();
    if (!cleaned)
        return '';
    const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
function composeMockSummary(segments, sources) {
    let summaryBuilder = '';
    const inlineEvidence = [];
    const citations = [];
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
    const avgRelevance = uniqueSources.reduce((acc, idx) => acc + (sources[idx]?.relevanceScore ?? 50), 0) /
        Math.max(1, uniqueSources.length);
    const confidence = Math.max(0.35, Math.min(1, (avgRelevance / 60) * Math.min(1, uniqueSources.length / 3)));
    return { summary, inlineEvidence, citations, confidence };
}
function generateMockResult(query) {
    const mockSources = [
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
    const { summary, inlineEvidence, citations, confidence } = composeMockSummary(segments, mockSources);
    const mockVerification = {
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
function simpleHash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}
function buildQueryKey(query) {
    return `research-query:${simpleHash(query.slice(0, 256))}`;
}
function buildSourceKey(source, index) {
    if (source?.url)
        return source.url;
    return `research-source:${index}:${simpleHash(source?.title || String(index))}`;
}
function buildEvidenceKey(sourceKey, id) {
    return `${sourceKey}#evidence:${id}`;
}
function capitalize(str) {
    if (!str || str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
