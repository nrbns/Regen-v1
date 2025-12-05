/**
 * Offline Summarization Service
 * Uses mBART model for multilingual summarization when offline
 * Falls back to simple extraction when model unavailable
 */
import { log } from '../utils/logger';
// Simple extraction-based summarization (fallback when mBART unavailable)
function extractSummary(text, options = {}) {
    const maxLength = options.maxLength || 200;
    const minLength = options.minLength || 50;
    // Remove extra whitespace and normalize
    const normalized = text.replace(/\s+/g, ' ').trim();
    // If text is already short enough, return as-is
    if (normalized.length <= maxLength) {
        return normalized;
    }
    // Try to find a good sentence boundary
    const sentences = normalized.split(/[.!?]\s+/);
    let summary = '';
    for (const sentence of sentences) {
        if ((summary + sentence).length <= maxLength) {
            summary += (summary ? '. ' : '') + sentence;
        }
        else {
            break;
        }
    }
    // If we have a summary, return it
    if (summary.length >= minLength) {
        return summary + (summary.endsWith('.') ? '' : '.');
    }
    // Fallback: truncate at word boundary
    const words = normalized.split(/\s+/);
    summary = '';
    for (const word of words) {
        if ((summary + word).length <= maxLength) {
            summary += (summary ? ' ' : '') + word;
        }
        else {
            break;
        }
    }
    return summary + (summary.endsWith('.') ? '' : '.');
}
/**
 * Summarize text using offline mBART model (if available) or extraction
 */
export async function summarizeOffline(text, options = {}) {
    if (!text || text.trim().length < 10) {
        return {
            summary: text.trim(),
            confidence: 1.0,
            method: 'fallback',
        };
    }
    const language = options.language || 'auto';
    const useOfflineModel = options.useOfflineModel !== false; // Default to true
    // Try to use mBART model if available (via local inference)
    if (useOfflineModel && typeof window !== 'undefined') {
        // Try to use local Transformers.js or similar if available
        if (typeof window.transformers !== 'undefined') {
            try {
                // Use Transformers.js for client-side mBART inference
                const { pipeline } = window.transformers;
                const summarizer = await pipeline('summarization', 'facebook/mbart-large-50-many-to-many-mmt', {
                    device: 'cpu', // Use CPU for offline
                });
                const result = await summarizer(text, {
                    max_length: options.maxLength || 200,
                    min_length: options.minLength || 50,
                    do_sample: false,
                });
                if (result && result[0] && result[0].summary_text) {
                    return {
                        summary: result[0].summary_text,
                        confidence: 0.9,
                        method: 'mbart',
                        language: language !== 'auto' ? language : 'en',
                    };
                }
            }
            catch (error) {
                log.warn('[OfflineSummarizer] Transformers.js mBART failed, using extraction:', error);
            }
        }
    }
    // Fallback to extraction-based summarization
    const extracted = extractSummary(text, options);
    return {
        summary: extracted,
        confidence: extracted.length >= (options.minLength || 50) ? 0.7 : 0.5,
        method: 'extraction',
        language: language !== 'auto' ? language : 'en',
    };
}
/**
 * Summarize multiple texts and combine
 */
export async function summarizeMultiple(texts, options = {}) {
    if (texts.length === 0) {
        return {
            summary: '',
            confidence: 0,
            method: 'fallback',
        };
    }
    if (texts.length === 1) {
        return summarizeOffline(texts[0], options);
    }
    // Summarize each text individually
    const summaries = await Promise.all(texts.map(text => summarizeOffline(text, options)));
    // Combine summaries
    const combined = summaries
        .map(s => s.summary)
        .filter(s => s.length > 0)
        .join(' ');
    // Re-summarize the combined text if it's too long
    if (combined.length > (options.maxLength || 200) * 2) {
        return summarizeOffline(combined, options);
    }
    return {
        summary: combined,
        confidence: summaries.reduce((acc, s) => acc + s.confidence, 0) / summaries.length,
        method: summaries.some(s => s.method === 'mbart') ? 'mbart' : 'extraction',
        language: options.language !== 'auto' ? options.language : 'en',
    };
}
