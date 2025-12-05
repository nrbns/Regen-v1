/**
 * Summarize Service - Tier 1
 * CATEGORY C FIX: Converted to SSE/WS subscription pattern instead of polling
 */
import { toast } from '../utils/toast';
import { log } from '../utils/logger';
import { track } from './analytics';
import { validateUrlForAgent } from '../core/security/urlSafety';
/**
 * Summarize URL or text using the unified API
 * Handles all polling internally - frontend just waits for result
 */
export async function summarize(options) {
    const { url, text, question, maxWaitSeconds = 30, onToken, onProgress } = options;
    if (!url && !text) {
        throw new Error('Either url or text must be provided');
    }
    // Tier 1: Security guardrails - validate URL before processing
    if (url) {
        const validation = validateUrlForAgent(url);
        if (!validation.safe) {
            const error = new Error(validation.reason || 'URL is not safe for scraping');
            log.warn('Summarize blocked by security check', { url, reason: validation.reason });
            track('error_shown', {
                context: 'summarize_security',
                error: validation.reason || 'Unsafe URL',
            });
            throw error;
        }
    }
    try {
        log.info('Summarize request', { url, hasText: !!text, question });
        // Tier 1: Track summarize request
        track('summary_requested', {
            hasUrl: !!url,
            hasText: !!text,
            hasQuestion: !!question,
        });
        // CATEGORY C FIX: Check if backend returns 202 (async job) - subscribe via SSE
        // Read API base URL from .env (Vite env variables)
        const apiBaseUrl = typeof window !== 'undefined'
            ? window.__API_BASE_URL ||
                import.meta.env.VITE_API_BASE_URL ||
                import.meta.env.VITE_APP_API_URL ||
                'http://127.0.0.1:4000'
            : import.meta.env.VITE_API_BASE_URL ||
                import.meta.env.VITE_APP_API_URL ||
                'http://127.0.0.1:4000';
        const response = await fetch(`${apiBaseUrl}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, text, question, waitFor: 2 }),
        });
        // If 202, job is enqueued - subscribe to SSE for results
        if (response.status === 202) {
            const { jobId, subscribeUrl } = await response.json();
            // Capture callbacks for use in Promise closure
            const progressCallback = onProgress;
            const tokenCallback = onToken;
            progressCallback?.('Job enqueued, waiting for results...');
            // Subscribe to /api/ask for streaming results
            return new Promise((resolve, reject) => {
                const eventSource = new EventSource(`${subscribeUrl || `/api/ask?q=${encodeURIComponent(url || text || '')}`}`);
                let fullSummary = '';
                let finalResult = null;
                eventSource.addEventListener('ack', () => {
                    progressCallback?.('Processing started...');
                });
                eventSource.addEventListener('token', e => {
                    const data = JSON.parse(e.data);
                    if (data.text) {
                        fullSummary += data.text;
                        tokenCallback?.(data.text);
                    }
                });
                eventSource.addEventListener('result', e => {
                    const data = JSON.parse(e.data);
                    finalResult = {
                        summary: fullSummary || data.summary || '',
                        answer: data.answer,
                        highlights: data.highlights || [],
                        model: data.model || 'unknown',
                        jobId: data.jobId || jobId,
                        sources: data.sources || [],
                        provenance: data.provenance || {},
                    };
                });
                eventSource.addEventListener('done', () => {
                    eventSource.close();
                    if (finalResult) {
                        log.info('Summarize success (SSE)', {
                            jobId: finalResult.jobId,
                            model: finalResult.model,
                        });
                        resolve(finalResult);
                    }
                    else {
                        reject(new Error('Summary completed but no result received'));
                    }
                });
                eventSource.addEventListener('error', () => {
                    eventSource.close();
                    const error = new Error('Failed to receive summary via SSE');
                    log.error('Summarize SSE error', error);
                    reject(error);
                });
                // Timeout fallback
                setTimeout(() => {
                    if (!finalResult) {
                        eventSource.close();
                        reject(new Error('Summary request timed out'));
                    }
                }, (maxWaitSeconds || 30) * 1000);
            });
        }
        // If 200, result is ready immediately
        const result = await response.json();
        log.info('Summarize success', { jobId: result.jobId, model: result.model });
        return result;
    }
    catch (error) {
        log.error('Summarize failed', error);
        // Tier 1: Track error
        track('error_shown', {
            context: 'summarize',
            error: error.message || 'Unknown error',
        });
        // Handle specific error codes
        if (error.message?.includes('scrape-timeout')) {
            throw new Error('The page took too long to load. Please try again or check the URL.');
        }
        if (error.message?.includes('scrape-failed') || error.message?.includes('502')) {
            throw new Error('Failed to load the page. The URL may be invalid or the site may be blocking requests.');
        }
        if (error.message?.includes('llm-circuit-open') || error.message?.includes('503')) {
            throw new Error('AI service is temporarily unavailable. Please try again in a moment.');
        }
        if (error.message?.includes('Backend offline')) {
            throw new Error('Backend service is offline. Please check your connection.');
        }
        // Generic error
        throw new Error(error.message || 'Failed to generate summary. Please try again.');
    }
}
/**
 * Summarize with toast notifications for user feedback
 */
export async function summarizeWithFeedback(options) {
    const loadingToast = toast.loading(options.url ? `Summarizing ${new URL(options.url).hostname}...` : 'Generating summary...');
    try {
        const result = await summarize(options);
        toast.dismiss(loadingToast);
        toast.success('Summary generated successfully');
        return result;
    }
    catch (error) {
        toast.dismiss(loadingToast);
        toast.error(error.message || 'Failed to generate summary');
        return null;
    }
}
