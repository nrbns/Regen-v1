/**
 * Citation Verifier - Research-grade citation coverage checker
 * Ensures every sentence in generated text has at least one citation token
 * 
 * AC: All sample queries show flagged uncited sentences
 * Metric: Citation coverage > 95% on internal benchmark
 */

export interface SentenceAnalysis {
  sentence: string;
  sentenceIndex: number;
  hasCitation: boolean;
  citationIndices: number[];
  startPos: number;
  endPos: number;
}

export interface VerificationResult {
  totalSentences: number;
  citedSentences: number;
  uncitedSentences: number;
  citationCoverage: number; // 0-1
  issues: Array<{
    type: 'uncited';
    sentenceIdx: number;
    sentence: string;
    detail: string;
  }>;
}

/**
 * Extract sentences from text (handles common punctuation)
 */
function extractSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  const sentenceEnders = /[.!?]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceEnders.exec(text)) !== null) {
    const endIndex = match.index + match[0].length;
    const sentenceText = text.slice(lastIndex, endIndex).trim();
    if (sentenceText.length > 0) {
      sentences.push({
        text: sentenceText,
        start: lastIndex,
        end: endIndex,
      });
    }
    lastIndex = endIndex;
    // Skip whitespace
    while (lastIndex < text.length && /\s/.test(text[lastIndex])) {
      lastIndex++;
    }
  }

  // Handle remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim();
    if (remaining.length > 0) {
      sentences.push({
        text: remaining,
        start: lastIndex,
        end: text.length,
      });
    }
  }

  return sentences;
}

/**
 * Find citation tokens in text (e.g., [1], [2], [1,2], [source-1])
 */
function findCitationTokens(text: string): Array<{ index: number; match: string; citationIndices: number[] }> {
  const citations: Array<{ index: number; match: string; citationIndices: number[] }> = [];
  
  // Match patterns like [1], [2], [1,2], [1-3], [source-1]
  const citationPattern = /\[([\d\s,\-]+|source-[\w-]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(text)) !== null) {
    const citationStr = match[1];
    const indices: number[] = [];
    
    // Parse numeric citations (e.g., "1", "1,2", "1-3")
    if (/^\d+([,\-]\d+)*$/.test(citationStr)) {
      const parts = citationStr.split(/[,\-]/);
      for (const part of parts) {
        const num = parseInt(part.trim(), 10);
        if (!isNaN(num)) {
          indices.push(num);
        }
      }
    } else {
      // Non-numeric citation (e.g., "source-1") - treat as valid citation
      indices.push(-1); // Use -1 as marker for non-numeric citations
    }

    citations.push({
      index: match.index,
      match: match[0],
      citationIndices: indices,
    });
  }

  return citations;
}

/**
 * Check if a sentence has a citation within or immediately after it
 */
function sentenceHasCitation(
  sentence: { text: string; start: number; end: number },
  citations: Array<{ index: number; match: string; citationIndices: number[] }>,
  _text: string
): { hasCitation: boolean; citationIndices: number[] } {
  const sentenceStart = sentence.start;
  const sentenceEnd = sentence.end;
  
  // Look for citations within the sentence or up to 10 chars after (for trailing citations)
  const searchEnd = sentenceEnd + 10;
  
  const relevantCitations = citations.filter(
    (cit) => cit.index >= sentenceStart && cit.index < searchEnd
  );

  if (relevantCitations.length === 0) {
    return { hasCitation: false, citationIndices: [] };
  }

  // Collect all citation indices
  const allIndices = new Set<number>();
  for (const cit of relevantCitations) {
    for (const idx of cit.citationIndices) {
      if (idx >= 0) {
        allIndices.add(idx);
      } else {
        // Non-numeric citation exists
        allIndices.add(-1);
      }
    }
  }

  return {
    hasCitation: allIndices.size > 0,
    citationIndices: Array.from(allIndices),
  };
}

/**
 * Verify citation coverage in research summary text
 * 
 * @param summary - The generated summary text
 * @param citations - Array of citation objects with index and sourceIndex
 * @returns Verification result with coverage metrics and uncited sentence issues
 */
export function verifyCitationCoverage(
  summary: string,
  _citations: Array<{ index: number; sourceIndex: number }>
): VerificationResult {
  if (!summary || summary.trim().length === 0) {
    return {
      totalSentences: 0,
      citedSentences: 0,
      uncitedSentences: 0,
      citationCoverage: 1.0,
      issues: [],
    };
  }

  const sentences = extractSentences(summary);
  const citationTokens = findCitationTokens(summary);
  
  const analyses: SentenceAnalysis[] = [];
  const issues: VerificationResult['issues'] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const { hasCitation, citationIndices } = sentenceHasCitation(sentence, citationTokens, summary);

    analyses.push({
      sentence: sentence.text,
      sentenceIndex: i,
      hasCitation,
      citationIndices,
      startPos: sentence.start,
      endPos: sentence.end,
    });

    if (!hasCitation) {
      issues.push({
        type: 'uncited',
        sentenceIdx: i,
        sentence: sentence.text,
        detail: 'Sentence has no supporting citation',
      });
    }
  }

  const totalSentences = analyses.length;
  const citedSentences = analyses.filter((a) => a.hasCitation).length;
  const uncitedSentences = totalSentences - citedSentences;
  const citationCoverage = totalSentences > 0 ? citedSentences / totalSentences : 1.0;

  return {
    totalSentences,
    citedSentences,
    uncitedSentences,
    citationCoverage,
    issues,
  };
}

/**
 * Enhanced verification that also checks citation validity
 * (whether cited sources actually exist)
 */
export function verifyCitationsWithSources(
  summary: string,
  citations: Array<{ index: number; sourceIndex: number }>,
  totalSources: number
): VerificationResult & { invalidCitations: number } {
  const base = verifyCitationCoverage(summary, citations);
  
  // Check for citations that reference non-existent sources
  // const validSourceIndices = new Set(citations.map((c) => c.sourceIndex)); // Reserved for future use
  const invalidCount = citations.filter((c) => c.sourceIndex < 0 || c.sourceIndex >= totalSources).length;

  return {
    ...base,
    invalidCitations: invalidCount,
  };
}

