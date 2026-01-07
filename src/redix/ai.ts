/**
 * RedixAI - AI Processing for Content
 * 
 * Processes web content using:
 * 1. WASM AI (offline, fast, universal) - preferred
 * 2. Redix backend (if available)
 * 3. Cloud LLM (if API key available)
 * 4. Simple keyword extraction (fallback)
 */

export interface RedixAIOptions {
  useWASM?: boolean;
  useCloud?: boolean;
  redixUrl?: string;
}

export interface ProcessedContent {
  title: string;
  url: string;
  domain: string;
  summary: string;
  body: string;
  date?: string;
  author?: string;
  sources: Array<{ url: string; title: string }>;
}

export class RedixAI {
  private wasmLoaded = false;
  private redixUrl: string;

  constructor(private options: RedixAIOptions = {}) {
    this.redixUrl = options.redixUrl || 'http://localhost:8001';
  }

  /**
   * Process content (extract, summarize, structure)
   * 
   * In Ghost Mode: Only uses WASM AI or simple extraction (no cloud APIs)
   */
  async processContent(extracted: {
    title: string;
    text: string;
    html: string;
  }): Promise<ProcessedContent> {
    try {
      // In Ghost Mode, only use local AI (WASM or simple)
      if (this.options.useWASM && await this.hasWASM()) {
        return await this.processWithWASM(extracted);
      }
      
      // Try Redix backend ONLY if cloud APIs are allowed (not in Ghost Mode)
      if (this.options.useCloud) {
        // Check if we're in Ghost Mode (would be passed from browser)
        // For now, respect the useCloud flag
        try {
          return await this.processWithRedix(extracted);
        } catch (error) {
          console.warn('[RedixAI] Redix backend failed, using fallback:', error);
        }
      }
      
      // Fallback: Simple extraction (always works, even in Ghost Mode)
      return this.processSimple(extracted);
    } catch (error) {
      console.error('[RedixAI] Processing failed:', error);
      // Always fallback to simple processing
      return this.processSimple(extracted);
    }
  }

  /**
   * Check if WASM is available
   */
  private async hasWASM(): Promise<boolean> {
    try {
      return typeof WebAssembly !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Process content with WASM AI
   */
  private async processWithWASM(extracted: {
    title: string;
    text: string;
    html: string;
  }): Promise<ProcessedContent> {
    // TODO: Load TinyLlama WASM model
    // For now, return simple processing
    // In production, this would:
    // 1. Load WASM model (cached)
    // 2. Run inference on extracted text
    // 3. Generate summary and structured content
    
    console.log('[RedixAI] WASM processing (placeholder)');
    return this.processSimple(extracted);
  }

  /**
   * Process content with Redix backend
   */
  private async processWithRedix(extracted: {
    title: string;
    text: string;
    html: string;
  }): Promise<ProcessedContent> {
    try {
      const response = await fetch(`${this.redixUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: extracted.title, // Pass title as URL hint
          content: extracted.text.substring(0, 5000), // Limit content size
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Redix backend failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        title: data.title || extracted.title,
        url: data.url || '',
        domain: this.extractDomain(data.url || ''),
        summary: data.summary || data.content?.substring(0, 200) || '',
        body: data.content || extracted.text,
        date: data.date,
        author: data.author,
        sources: data.sources || [],
      };
    } catch (error) {
      console.error('[RedixAI] Redix processing failed:', error);
      throw error;
    }
  }

  /**
   * Simple content processing (fallback)
   */
  private processSimple(extracted: {
    title: string;
    text: string;
    html: string;
  }): ProcessedContent {
    // Extract domain from title (if it's a URL)
    const domain = this.extractDomain(extracted.title);
    
    // Generate simple summary (first 200 chars)
    const summary = extracted.text.substring(0, 200).trim() + '...';
    
    // Extract body (rest of text)
    const body = extracted.text.substring(200);
    
    return {
      title: extracted.title,
      url: '',
      domain,
      summary,
      body,
      sources: [],
    };
  }

  /**
   * Extract domain from URL or title
   */
  private extractDomain(urlOrTitle: string): string {
    try {
      const url = new URL(urlOrTitle);
      return url.hostname;
    } catch {
      // Not a URL, return as-is or extract from title
      return urlOrTitle.split('/')[0] || 'unknown';
    }
  }
}

