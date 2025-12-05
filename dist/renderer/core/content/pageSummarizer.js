/**
 * Page Summarizer - Real-time page content extraction and summarization
 */
import { SessionWorkspace } from '../workspace/SessionWorkspace';
export class PageSummarizer {
    /**
     * Extract page content from active tab
     */
    static async extractPageContent(tabId) {
        try {
            // Inject content script to extract page content
            const result = await window.__TAURI__?.invoke('extract_page_content', { tabId });
            if (result) {
                return result;
            }
            // Fallback: extract from current window
            return this.extractFromCurrentWindow();
        }
        catch (error) {
            console.error('[PageSummarizer] Extraction failed:', error);
            return this.extractFromCurrentWindow();
        }
    }
    /**
     * Extract content from current window (fallback)
     */
    static extractFromCurrentWindow() {
        const url = window.location.href;
        const title = document.title;
        // Remove script and style elements
        const clone = document.cloneNode(true);
        const scripts = clone.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());
        // Extract text content
        const text = clone.body?.innerText || clone.body?.textContent || '';
        // Extract images
        const images = Array.from(document.querySelectorAll('img'))
            .map(img => img.src)
            .filter(src => src && !src.startsWith('data:'));
        // Extract links
        const links = Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(href => href && !href.startsWith('javascript:'));
        return {
            url,
            title,
            text: text.slice(0, 50000), // Limit to 50KB
            html: clone.body?.innerHTML?.slice(0, 100000), // Limit HTML
            images: images.slice(0, 20), // Max 20 images
            links: links.slice(0, 50), // Max 50 links
        };
    }
    /**
     * Summarize page with real-time AI
     */
    static async summarizePage(content, length = 'medium') {
        try {
            const response = await fetch('http://localhost:4000/api/ai/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: content.url,
                    content: content.text,
                    length,
                }),
            });
            if (!response.ok) {
                throw new Error('Summarization failed');
            }
            const result = await response.json();
            // Save to current session
            const summary = SessionWorkspace.addSummary({
                url: content.url,
                summary: result.summary,
                keywords: result.keywords || [],
                length,
            });
            return {
                ...result,
                id: summary.id,
            };
        }
        catch (error) {
            console.error('[PageSummarizer] Summarization error:', error);
            throw error;
        }
    }
    /**
     * Stream summarization (real-time)
     */
    static async streamSummarization(content, length = 'medium', onChunk, onDone) {
        try {
            // Use research stream endpoint for real-time updates
            const response = await fetch('http://localhost:4000/api/ai/research/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `Summarize this page: ${content.title}`,
                    sources: [
                        {
                            title: content.title,
                            url: content.url,
                            snippet: content.text.slice(0, 2000),
                        },
                    ],
                }),
            });
            if (!response.ok) {
                throw new Error('Stream failed');
            }
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            if (!reader) {
                throw new Error('No reader available');
            }
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // Save to session
                    SessionWorkspace.addSummary({
                        url: content.url,
                        summary: fullText,
                        keywords: this.extractKeywords(fullText),
                        length,
                    });
                    onDone(fullText);
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') {
                                fullText += data.text;
                                onChunk(data.text, fullText);
                            }
                            else if (data.type === 'done') {
                                fullText = data.text;
                                SessionWorkspace.addSummary({
                                    url: content.url,
                                    summary: fullText,
                                    keywords: this.extractKeywords(fullText),
                                    length,
                                });
                                onDone(fullText);
                                return;
                            }
                        }
                        catch {
                            // Skip malformed JSON
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('[PageSummarizer] Stream error:', error);
            throw error;
        }
    }
    /**
     * Extract keywords from text (simple fallback)
     */
    static extractKeywords(text) {
        const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        const freq = {};
        words.forEach(w => {
            freq[w] = (freq[w] || 0) + 1;
        });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
}
