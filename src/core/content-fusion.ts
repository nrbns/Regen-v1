/**
 * Content Fusion Engine
 * 
 * Fetches multiple sources, cross-verifies facts, synthesizes answers,
 * and flags contradictions. This is the core of the "AI-Native Content OS".
 */

export interface SourceContent {
  url: string;
  title: string;
  text: string;
  extractedAt: number;
  metadata?: {
    author?: string;
    publishedDate?: string;
    domain?: string;
  };
}

export interface FusedContent {
  synthesized: string;
  sources: SourceContent[];
  citations: Array<{
    index: number;
    url: string;
    title: string;
    snippet: string;
  }>;
  contradictions: Array<{
    fact: string;
    conflictingSources: string[];
    confidence: number;
  }>;
  verifiedFacts: Array<{
    fact: string;
    sources: string[];
    confidence: number;
  }>;
}

/**
 * Extract content from a URL
 * Uses existing research extraction service
 */
async function extractContentFromUrl(url: string): Promise<SourceContent | null> {
  try {
    // Use the search proxy's extraction or Redix extract endpoint
    const redixUrl = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';
    const response = await fetch(`${redixUrl}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    
    if (response?.ok) {
      const data = await response.json();
      return {
        url,
        title: data.title || url,
        text: data.content || data.text || '',
        extractedAt: Date.now(),
        metadata: {
          author: data.author,
          publishedDate: data.publishedDate,
          domain: new URL(url).hostname,
        },
      };
    }
    
    // Fallback: Try direct fetch (simplified)
    const htmlResponse = await fetch(url, {
      headers: { 'User-Agent': 'OmniBrowser/1.0' },
    }).catch(() => null);
    
    if (htmlResponse?.ok) {
      const html = await htmlResponse.text();
      // Simple text extraction (in production, use Readability)
      const textMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, ' ').trim() : '';
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;
      
      return {
        url,
        title,
        text: text.substring(0, 10000), // Limit text length
        extractedAt: Date.now(),
        metadata: {
          domain: new URL(url).hostname,
        },
      };
    }
    
    return null;
  } catch (error) {
    console.error(`[ContentFusion] Failed to extract content from ${url}:`, error);
    return null;
  }
}

/**
 * Cross-verify facts across multiple sources
 * Simple implementation - in production, use NLP/LLM for better fact-checking
 */
function crossVerifyFacts(contents: SourceContent[]): {
  verified: Array<{ fact: string; sources: string[]; confidence: number }>;
  contradictions: Array<{ fact: string; conflictingSources: string[]; confidence: number }>;
} {
  const verified: Array<{ fact: string; sources: string[]; confidence: number }> = [];
  const contradictions: Array<{ fact: string; conflictingSources: string[]; confidence: number }> = [];
  
  // Simple keyword-based fact extraction (in production, use NLP)
  const factMap = new Map<string, Set<string>>();
  
  contents.forEach((content) => {
    // Extract key sentences (simplified)
    const sentences = content.text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    sentences.slice(0, 20).forEach((sentence) => {
      const normalized = sentence.toLowerCase().trim();
      if (!factMap.has(normalized)) {
        factMap.set(normalized, new Set());
      }
      factMap.get(normalized)!.add(content.url);
    });
  });
  
  // Find facts mentioned in multiple sources (verified)
  factMap.forEach((sources, fact) => {
    if (sources.size >= 2) {
      verified.push({
        fact,
        sources: Array.from(sources),
        confidence: Math.min(0.9, 0.5 + (sources.size * 0.1)),
      });
    }
  });
  
  // For contradictions, we'd need more sophisticated NLP
  // This is a placeholder - in production, use LLM to detect contradictions
  
  return { verified, contradictions };
}

/**
 * Synthesize content from multiple sources
 * Uses LLM to create a coherent answer from multiple sources
 */
async function synthesizeContent(
  contents: SourceContent[],
  query: string
): Promise<string> {
  // Combine all source texts
  const combinedText = contents
    .map((c, idx) => `[Source ${idx + 1}: ${c.title}]\n${c.text.substring(0, 2000)}`)
    .join('\n\n---\n\n');
  
  // Use Redix /ask or local LLM to synthesize
  const redixUrl = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:8001';
  
  try {
    const response = await fetch(`${redixUrl}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Based on the following sources, provide a comprehensive answer to: "${query}"\n\nSources:\n${combinedText}\n\nAnswer:`,
        maxTokens: 1000,
        temperature: 0.7,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.response || data.text || 'Unable to synthesize answer.';
    }
  } catch (error) {
    console.error('[ContentFusion] Synthesis failed:', error);
  }
  
  // Fallback: Simple extraction
  return contents
    .map((c, idx) => `[${idx + 1}] ${c.title}: ${c.text.substring(0, 300)}...`)
    .join('\n\n');
}

/**
 * Fuse content from multiple sources
 * This is the core function that makes AI answers possible
 */
export async function fuseContent(
  query: string,
  sourceUrls: string[]
): Promise<FusedContent> {
  const startTime = Date.now();
  
  // 1. Extract content from all sources in parallel
  const extractionPromises = sourceUrls.map(url => extractContentFromUrl(url));
  const extractedContents = await Promise.all(extractionPromises);
  const validContents = extractedContents.filter((c): c is SourceContent => c !== null);
  
  if (validContents.length === 0) {
    return {
      synthesized: `No content could be extracted from the provided sources.`,
      sources: [],
      citations: [],
      contradictions: [],
      verifiedFacts: [],
    };
  }
  
  // 2. Cross-verify facts
  const { verified, contradictions } = crossVerifyFacts(validContents);
  
  // 3. Synthesize answer
  const synthesized = await synthesizeContent(validContents, query);
  
  // 4. Build citations
  const citations = validContents.map((content, idx) => ({
    index: idx + 1,
    url: content.url,
    title: content.title,
    snippet: content.text.substring(0, 200),
  }));
  
  console.log(`[ContentFusion] Fused ${validContents.length} sources in ${Date.now() - startTime}ms`);
  
  return {
    synthesized,
    sources: validContents,
    citations,
    contradictions,
    verifiedFacts: verified,
  };
}

/**
 * Quick fuse - Fetches sources from search, then fuses them
 */
export async function quickFuse(
  query: string,
  maxSources = 5
): Promise<FusedContent> {
  // 1. Search for sources
  const searchProxyUrl = import.meta.env.VITE_SEARCH_PROXY_URL || 'http://localhost:3001';
  
  try {
    const searchResponse = await fetch(`${searchProxyUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        sources: ['duckduckgo'],
        limit: maxSources,
      }),
    });
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const sourceUrls = searchData.results
        ?.slice(0, maxSources)
        .map((r: any) => r.url)
        .filter((url: string) => url && url.startsWith('http')) || [];
      
      if (sourceUrls.length > 0) {
        return await fuseContent(query, sourceUrls);
      }
    }
  } catch (error) {
    console.error('[ContentFusion] Quick fuse failed:', error);
  }
  
  // Fallback: Return empty result
  return {
    synthesized: `Unable to fetch and fuse sources for: "${query}"`,
    sources: [],
    citations: [],
    contradictions: [],
    verifiedFacts: [],
  };
}

