/**
 * Omni OS Layer
 * Auto PDF, Excel, Doc processing + Voice commands + Multi-agent workflows
 */
import { multiAgentSystem } from '../agents/multiAgentSystem';
import { safeActionExecutor } from '../actions/safeExecutor';
import { localCache } from '../cache/localCache';
class OmniOSLayer {
    /**
     * Auto-process PDF
     */
    async processPDF(path, options) {
        // Check cache
        const cacheKey = `pdf:${path}`;
        const cached = await localCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Use Tauri backend for PDF processing
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('process_pdf', {
                    path,
                    extractText: options?.extractText ?? true,
                    extractTables: options?.extractTables ?? true,
                    summarize: options?.summarize ?? true,
                });
                const processed = result;
                // Generate insights
                const insights = await this.generateInsights(processed, 'pdf');
                const fullResult = {
                    ...processed,
                    insights,
                };
                // Cache result
                await localCache.set(cacheKey, fullResult, {
                    ttl: 86400, // 24 hours
                    tags: ['pdf', 'document'],
                });
                return fullResult;
            }
            catch (error) {
                console.error('[OmniOSLayer] PDF processing failed:', error);
                throw error;
            }
        }
        throw new Error('PDF processing not available');
    }
    /**
     * Auto-process Excel
     */
    async processExcel(path, options) {
        // Check cache
        const cacheKey = `excel:${path}`;
        const cached = await localCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Use Tauri backend for Excel processing
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('process_excel', {
                    path,
                    extractData: options?.extractData ?? true,
                    analyze: options?.analyze ?? true,
                });
                const processed = result;
                // Generate insights
                const insights = await this.generateInsights(processed, 'excel');
                const fullResult = {
                    ...processed,
                    insights,
                };
                // Cache result
                await localCache.set(cacheKey, fullResult, {
                    ttl: 86400,
                    tags: ['excel', 'document'],
                });
                return fullResult;
            }
            catch (error) {
                console.error('[OmniOSLayer] Excel processing failed:', error);
                throw error;
            }
        }
        throw new Error('Excel processing not available');
    }
    /**
     * Auto-process Doc/Docx
     */
    async processDoc(path, options) {
        // Check cache
        const cacheKey = `doc:${path}`;
        const cached = await localCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        // Use Tauri backend for Doc processing
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('process_doc', {
                    path,
                    extractText: options?.extractText ?? true,
                    extractFormatting: options?.extractFormatting ?? false,
                    summarize: options?.summarize ?? true,
                });
                const processed = result;
                // Generate insights
                const insights = await this.generateInsights(processed, 'doc');
                const fullResult = {
                    ...processed,
                    insights,
                };
                // Cache result
                await localCache.set(cacheKey, fullResult, {
                    ttl: 86400,
                    tags: ['doc', 'document'],
                });
                return fullResult;
            }
            catch (error) {
                console.error('[OmniOSLayer] Doc processing failed:', error);
                throw error;
            }
        }
        throw new Error('Doc processing not available');
    }
    /**
     * Process voice command (Whisper)
     */
    async processVoiceCommand(audioData) {
        // Use Tauri backend for Whisper transcription
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('transcribe_voice', {
                    audioData: Array.from(new Uint8Array(audioData)),
                });
                const transcription = result;
                return {
                    text: transcription.text,
                    intent: transcription.intent,
                    confidence: transcription.confidence,
                    entities: transcription.entities,
                };
            }
            catch (error) {
                console.error('[OmniOSLayer] Voice transcription failed:', error);
                throw error;
            }
        }
        throw new Error('Voice transcription not available');
    }
    /**
     * Execute voice command
     */
    async executeVoiceCommand(command) {
        // Parse intent and execute
        const intent = command.intent.toLowerCase();
        // Route to appropriate agent
        let agentMode = 'research';
        if (intent.includes('trade') || intent.includes('buy') || intent.includes('sell')) {
            agentMode = 'trade';
        }
        else if (intent.includes('code') || intent.includes('debug')) {
            agentMode = 'dev';
        }
        else if (intent.includes('document') || intent.includes('pdf')) {
            agentMode = 'document';
        }
        else if (intent.includes('workflow') || intent.includes('automate')) {
            agentMode = 'workflow';
        }
        // Execute with multi-agent system
        const result = await multiAgentSystem.execute(agentMode, command.text, {
            mode: agentMode,
            metadata: {
                voiceCommand: true,
                intent: command.intent,
                entities: command.entities,
            },
        });
        // Execute actions if any
        if (result.actions && result.actions.length > 0) {
            const actionResults = await safeActionExecutor.executeBatch(result.actions, {
                stopOnError: false,
            });
            return {
                success: result.success,
                actions: result.actions,
                result: actionResults,
            };
        }
        return {
            success: result.success,
            result: result.data,
        };
    }
    /**
     * Multi-agent workflow execution
     */
    async executeWorkflow(workflow) {
        const results = [];
        for (const step of workflow) {
            try {
                const result = await multiAgentSystem.execute(step.agent, step.query, {
                    mode: step.agent,
                    metadata: step.context,
                });
                results.push({
                    agent: step.agent,
                    result: result.data,
                    success: result.success,
                });
                // Stop on error if needed
                if (!result.success) {
                    break;
                }
            }
            catch {
                results.push({
                    agent: step.agent,
                    result: null,
                    success: false,
                });
                break;
            }
        }
        return results;
    }
    /**
     * Generate insights from document
     */
    async generateInsights(document, _type) {
        const insights = [];
        // Generate summary insight
        if (document.summary) {
            insights.push({
                type: 'summary',
                content: document.summary,
                confidence: 0.9,
            });
        }
        // Generate key points
        if (document.text) {
            const keyPoints = await this.extractKeyPoints(document.text);
            insights.push({
                type: 'key-points',
                content: keyPoints,
                confidence: 0.8,
            });
        }
        // Extract tables
        if (document.tables && document.tables.length > 0) {
            insights.push({
                type: 'tables',
                content: JSON.stringify(document.tables),
                confidence: 1.0,
                metadata: { count: document.tables.length },
            });
        }
        // Extract action items
        if (document.text) {
            const actions = await this.extractActionItems(document.text);
            if (actions.length > 0) {
                insights.push({
                    type: 'actions',
                    content: actions.join('\n'),
                    confidence: 0.7,
                });
            }
        }
        return insights;
    }
    /**
     * Extract key points from text
     */
    async extractKeyPoints(text) {
        // Use Tauri backend for key point extraction
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('extract_key_points', { text });
                return result.keyPoints || '';
            }
            catch (error) {
                console.error('[OmniOSLayer] Key point extraction failed:', error);
            }
        }
        // Fallback: simple extraction
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
        return sentences.slice(0, 5).join('. ');
    }
    /**
     * Extract action items from text
     */
    async extractActionItems(text) {
        // Use Tauri backend for action extraction
        if (typeof window !== 'undefined' && window.__TAURI__) {
            try {
                const result = await window.__TAURI__.invoke('extract_action_items', { text });
                return result.actions || [];
            }
            catch (error) {
                console.error('[OmniOSLayer] Action extraction failed:', error);
            }
        }
        // Fallback: simple pattern matching
        const actionPattern = /(?:action|todo|task|do|complete|finish)[:\s]+([^.!?]+)/gi;
        const matches = text.matchAll(actionPattern);
        return Array.from(matches, m => m[1].trim()).slice(0, 10);
    }
}
// Singleton instance
export const omniOSLayer = new OmniOSLayer();
