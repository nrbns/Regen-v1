/**
 * WISPR Screenshot Analyzer
 * Captures screenshots and analyzes them with GPT-4 Vision
 */
import { aiEngine } from '../ai/engine';
import { toast } from '../../utils/toast';
/**
 * Capture screenshot of current page or selected element
 */
export async function captureScreenshot(element) {
    try {
        // Try using IPC screenshot API if available (Electron/Tauri)
        if (typeof window !== 'undefined') {
            const { ipc } = await import('../../lib/ipc-typed');
            // Try to capture active tab screenshot
            try {
                const { useTabsStore } = await import('../../state/tabsStore');
                const tabsState = useTabsStore.getState();
                const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);
                if (activeTab) {
                    // Use capturePreview which returns dataUrl directly
                    const result = await ipc.tabs.capturePreview({ id: activeTab.id });
                    if (result?.success && result?.dataUrl) {
                        return result.dataUrl;
                    }
                }
            }
            catch {
                console.debug('[WISPR] IPC screenshot not available, trying fallback');
            }
        }
        // Fallback: Use html2canvas if available, or canvas API
        if (element) {
            return await captureElementScreenshot(element);
        }
        // Capture visible viewport
        return await captureViewportScreenshot();
    }
    catch {
        console.error('[WISPR] Screenshot capture failed');
        toast.error('Failed to capture screenshot');
        return null;
    }
}
/**
 * Capture screenshot of a specific element
 */
async function captureElementScreenshot(element) {
    try {
        // Use html2canvas if available
        const html2canvas = window.html2canvas;
        if (html2canvas && typeof html2canvas === 'function') {
            const canvas = await html2canvas(element, {
                backgroundColor: '#000000',
                scale: 2, // Higher scale for better quality
                useCORS: true,
                logging: false,
                allowTaint: true,
                // CRITICAL: Enhance contrast for dark charts
                onclone: (clonedDoc) => {
                    // Increase brightness/contrast for dark elements
                    const clonedElement = clonedDoc.querySelector(element.tagName.toLowerCase());
                    if (clonedElement) {
                        clonedElement.style.filter = 'brightness(1.2) contrast(1.1)';
                    }
                },
            });
            // CRITICAL: Post-process for dark charts - enhance visibility
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                // Enhance dark areas (increase brightness for very dark pixels)
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const brightness = (r + g + b) / 3;
                    // If pixel is very dark, brighten it slightly
                    if (brightness < 30) {
                        data[i] = Math.min(255, r + 20); // Red
                        data[i + 1] = Math.min(255, g + 20); // Green
                        data[i + 2] = Math.min(255, b + 20); // Blue
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }
            // Convert to JPEG with quality for better compression and compatibility
            return canvas.toDataURL('image/jpeg', 0.95);
        }
        // Fallback: Use canvas API
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        const rect = element.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // This is a simplified version - html2canvas is better
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.font = '16px Arial';
        ctx.fillText('Screenshot capture requires html2canvas', 10, 30);
        return canvas.toDataURL('image/png');
    }
    catch (error) {
        console.error('[WISPR] Element screenshot failed:', error);
        return null;
    }
}
/**
 * Capture screenshot of visible viewport
 */
async function captureViewportScreenshot() {
    try {
        // Use html2canvas if available
        const html2canvas = window.html2canvas;
        if (html2canvas && typeof html2canvas === 'function') {
            const canvas = await html2canvas(document.body, {
                backgroundColor: '#000000',
                scale: 1,
                useCORS: true,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
            });
            return canvas.toDataURL('image/png');
        }
        // Fallback: Try to get active tab screenshot via IPC
        try {
            const { ipc } = await import('../../lib/ipc-typed');
            const { useTabsStore } = await import('../../state/tabsStore');
            const tabsState = useTabsStore.getState();
            const activeTab = tabsState.tabs.find(t => t.id === tabsState.activeId);
            if (activeTab) {
                // Use capturePreview which returns dataUrl directly
                const result = await ipc.tabs.capturePreview({ id: activeTab.id });
                if (result?.success && result?.dataUrl) {
                    return result.dataUrl;
                }
            }
        }
        catch {
            console.debug('[WISPR] IPC screenshot fallback failed');
        }
        return null;
    }
    catch (error) {
        console.error('[WISPR] Viewport screenshot failed:', error);
        return null;
    }
}
/**
 * Analyze screenshot with GPT-4 Vision
 */
export async function analyzeScreenshot(screenshotDataUrl, query) {
    try {
        toast.info('Analyzing screenshot with AI...');
        // CRITICAL: Convert data URL to base64 and ensure proper format for GPT-4o Vision
        let base64Image = screenshotDataUrl.split(',')[1] || screenshotDataUrl;
        // If it's a data URL, extract base64
        if (screenshotDataUrl.startsWith('data:image/')) {
            base64Image = screenshotDataUrl.split(',')[1];
        }
        // Ensure image is in correct format (JPEG or PNG base64)
        // GPT-4o Vision accepts: data:image/jpeg;base64,<data> or data:image/png;base64,<data>
        const imageFormat = screenshotDataUrl.includes('image/jpeg') ? 'jpeg' : 'png';
        const imageUrl = `data:image/${imageFormat};base64,${base64Image}`;
        // Use AI engine with vision capability
        // Note: This requires backend support for GPT-4 Vision API
        const prompt = query
            ? `Analyze this screenshot and answer: ${query}. Pay special attention to charts, graphs, and dark backgrounds. Describe what you see in detail, including any numbers, trends, or patterns visible.`
            : 'Analyze this screenshot. Describe what you see, identify any charts, graphs, text, or important information. Pay attention to dark backgrounds and ensure all visible elements are described.';
        // Try backend API first (if it supports vision)
        const apiBase = import.meta.env.VITE_APP_API_URL ||
            import.meta.env.VITE_API_BASE_URL ||
            (typeof window !== 'undefined' ? window.__OB_API_BASE__ : '');
        if (apiBase) {
            try {
                const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/ai/vision`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        image: imageUrl, // Send full data URL format for GPT-4o Vision
                        prompt,
                        model: 'gpt-4o', // Explicitly use GPT-4o for vision
                        max_tokens: 1000,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.analysis || data.text || null;
                }
            }
            catch {
                console.warn('[WISPR] Vision API not available, falling back to text description');
            }
        }
        // Fallback: Use regular AI with text description
        // Extract any visible text from the page
        const pageText = extractVisibleText();
        const analysisPrompt = query
            ? `${prompt}\n\nContext from page: ${pageText.substring(0, 1000)}`
            : `Describe what's on this page. Context: ${pageText.substring(0, 1000)}`;
        const result = await aiEngine.runTask({
            kind: 'chat',
            prompt: analysisPrompt,
            context: {
                hasScreenshot: true,
                pageText: pageText.substring(0, 2000),
            },
        });
        return result.text;
    }
    catch (error) {
        console.error('[WISPR] Screenshot analysis failed:', error);
        toast.error('Failed to analyze screenshot');
        return null;
    }
}
/**
 * Extract visible text from current page
 */
function extractVisibleText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: node => {
            const parent = node.parentElement;
            if (!parent)
                return NodeFilter.FILTER_REJECT;
            // Skip hidden elements
            const style = window.getComputedStyle(parent);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return NodeFilter.FILTER_REJECT;
            }
            // Skip script and style tags
            if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
    });
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
            texts.push(text);
        }
    }
    return texts.join(' ').substring(0, 5000); // Limit to 5000 chars
}
/**
 * Full screenshot capture and analysis workflow
 */
export async function captureAndAnalyze(query) {
    const screenshot = await captureScreenshot();
    if (!screenshot) {
        toast.error('Failed to capture screenshot');
        return null;
    }
    const analysis = await analyzeScreenshot(screenshot, query);
    return analysis;
}
