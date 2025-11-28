/**
 * WISPR Screenshot Analyzer
 * Captures screenshots and analyzes them with GPT-4 Vision
 */

import { aiEngine } from '../ai/engine';
import { toast } from '../../utils/toast';

/**
 * Capture screenshot of current page or selected element
 */
export async function captureScreenshot(element?: HTMLElement): Promise<string | null> {
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
      } catch {
        console.debug('[WISPR] IPC screenshot not available, trying fallback');
      }
    }

    // Fallback: Use html2canvas if available, or canvas API
    if (element) {
      return await captureElementScreenshot(element);
    }

    // Capture visible viewport
    return await captureViewportScreenshot();
  } catch {
    console.error('[WISPR] Screenshot capture failed');
    toast.error('Failed to capture screenshot');
    return null;
  }
}

/**
 * Capture screenshot of a specific element
 */
async function captureElementScreenshot(element: HTMLElement): Promise<string | null> {
  try {
    // Use html2canvas if available
    const html2canvas = (window as any).html2canvas;
    if (html2canvas && typeof html2canvas === 'function') {
      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        scale: 1,
        useCORS: true,
      });
      return canvas.toDataURL('image/png');
    }

    // Fallback: Use canvas API
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

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
  } catch (error) {
    console.error('[WISPR] Element screenshot failed:', error);
    return null;
  }
}

/**
 * Capture screenshot of visible viewport
 */
async function captureViewportScreenshot(): Promise<string | null> {
  try {
    // Use html2canvas if available
    const html2canvas = (window as any).html2canvas;
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
    } catch {
      console.debug('[WISPR] IPC screenshot fallback failed');
    }

    return null;
  } catch (error) {
    console.error('[WISPR] Viewport screenshot failed:', error);
    return null;
  }
}

/**
 * Analyze screenshot with GPT-4 Vision
 */
export async function analyzeScreenshot(
  screenshotDataUrl: string,
  query?: string
): Promise<string | null> {
  try {
    toast.info('Analyzing screenshot with AI...');

    // Convert data URL to base64
    const base64Image = screenshotDataUrl.split(',')[1] || screenshotDataUrl;

    // Use AI engine with vision capability
    // Note: This requires backend support for GPT-4 Vision API
    const prompt = query
      ? `Analyze this screenshot and answer: ${query}. Describe what you see in detail.`
      : 'Analyze this screenshot. Describe what you see, identify any charts, text, or important information.';

    // Try backend API first (if it supports vision)
    const apiBase =
      import.meta.env.VITE_APP_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      (typeof window !== 'undefined' ? (window as any).__OB_API_BASE__ : '');

    if (apiBase) {
      try {
        const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/ai/vision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            prompt,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.analysis || data.text || null;
        }
      } catch {
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
  } catch (error) {
    console.error('[WISPR] Screenshot analysis failed:', error);
    toast.error('Failed to analyze screenshot');
    return null;
  }
}

/**
 * Extract visible text from current page
 */
function extractVisibleText(): string {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: node => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

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

  const texts: string[] = [];
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
export async function captureAndAnalyze(query?: string): Promise<string | null> {
  const screenshot = await captureScreenshot();
  if (!screenshot) {
    toast.error('Failed to capture screenshot');
    return null;
  }

  const analysis = await analyzeScreenshot(screenshot, query);
  return analysis;
}
