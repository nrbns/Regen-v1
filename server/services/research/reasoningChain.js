/* eslint-env node */
/**
 * Reasoning Chain & Citation System
 * Implements Perplexity-like reasoning with step-by-step trace and citations
 */

/**
 * Build prompt with chain-of-reasoning instructions
 */
export function buildReasoningPrompt(query, chunks, options = {}) {
  const { includeReasoning: _includeReasoning = true, maxChunks = 12 } = options;

  // Format chunks with IDs for citation
  const passagesText = chunks
    .slice(0, maxChunks)
    .map((chunk, idx) => {
      const id = idx + 1;
      return `[${id}] (url=${chunk.url}) "${chunk.content.slice(0, 500)}${chunk.content.length > 500 ? '...' : ''}"`;
    })
    .join('\n\n');

  const systemPrompt = `You are Regen Research Assistant, an honest and thorough researcher. Your job is to answer questions accurately using only the provided sources, cite your sources inline, and show your reasoning process.

Rules:
1. Answer concisely in 2-3 sentences with inline citations like [^1], [^2]
2. After your answer, provide a "Reasoning:" section with 3-6 numbered steps showing how you arrived at your answer
3. Each reasoning step must reference specific passage IDs [1], [2], etc.
4. List all sources used in a "Sources:" section with format: {id, url, title, relevance_score}
5. If you cannot find strong evidence for a claim, say "I couldn't find strong evidence" and list the best available sources
6. Never invent sources, URLs, or facts not present in the passages
7. If passages contradict each other, acknowledge the contradiction and cite both sides`;

  const userPrompt = `Context: The following passages are provided from web sources. Each passage has an id and url.

${passagesText}

Question: ${query}

Please provide:
1. A concise Answer (2-3 sentences) with inline citations [^1], [^2], etc.
2. A Reasoning section (3-6 numbered steps) showing your thought process
3. A Sources section listing all cited sources with their relevance scores`;

  return {
    system: systemPrompt,
    user: userPrompt,
    passages: chunks.slice(0, maxChunks),
  };
}

/**
 * Extract citations from LLM response
 * Finds [^n] patterns and maps them to passage IDs
 */
export function extractCitations(text, passages) {
  const citationPattern = /\[\^(\d+)\]/g;
  const citations = [];
  const matches = [...text.matchAll(citationPattern)];

  for (const match of matches) {
    const citationId = parseInt(match[1], 10);
    const passage = passages.find((_, idx) => idx + 1 === citationId);
    if (passage) {
      citations.push({
        id: citationId,
        passageId: citationId,
        url: passage.url,
        title: passage.title || passage.url,
        position: match.index,
        text: match[0],
      });
    }
  }

  return citations;
}

/**
 * Extract reasoning steps from LLM response
 */
export function extractReasoningSteps(text) {
  const reasoningMatch = text.match(/Reasoning:?\s*\n((?:\d+[.)]\s*[^\n]+\n?)+)/i);
  if (!reasoningMatch) {
    return [];
  }

  const stepsText = reasoningMatch[1];
  const stepPattern = /(\d+)[.)]\s*([^\n]+)/g;
  const steps = [];
  let match;

  while ((match = stepPattern.exec(stepsText)) !== null) {
    steps.push({
      step: parseInt(match[1], 10),
      text: match[2].trim(),
      citations: extractStepCitations(match[2]),
    });
  }

  return steps;
}

/**
 * Extract passage references from a reasoning step
 */
function extractStepCitations(stepText) {
  const refPattern = /\[(\d+)\]/g;
  const refs = [];
  let match;

  while ((match = refPattern.exec(stepText)) !== null) {
    refs.push(parseInt(match[1], 10));
  }

  return refs;
}

/**
 * Extract sources list from LLM response
 */
export function extractSourcesList(text, passages) {
  const sourcesMatch = text.match(/Sources:?\s*\n((?:.*\n?)+)/i);
  if (!sourcesMatch) {
    // Fallback: use all cited passages
    return [];
  }

  // Try to parse JSON array or structured list
  const sourcesText = sourcesMatch[1];

  // Try JSON first
  try {
    const jsonMatch = sourcesText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Not JSON, parse as list
  }

  // Parse as structured list
  const sourceItems = [];
  const lines = sourcesText.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const idMatch = line.match(/id[:\s]+(\d+)/i);
    const urlMatch = line.match(/url[:\s]+([^\s,]+)/i);
    const titleMatch = line.match(/title[:\s]+"([^"]+)"/i) || line.match(/title[:\s]+([^,]+)/i);
    const scoreMatch = line.match(/score[:\s]+([\d.]+)/i);

    if (idMatch) {
      const id = parseInt(idMatch[1], 10);
      const passage = passages.find((_, idx) => idx + 1 === id);
      if (passage) {
        sourceItems.push({
          id,
          url: urlMatch ? urlMatch[1] : passage.url,
          title: titleMatch ? titleMatch[1].trim() : passage.title || passage.url,
          score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.8,
        });
      }
    }
  }

  return sourceItems;
}

/**
 * Calculate citation coverage
 * Measures what fraction of factual claims have supporting citations
 */
export function calculateCitationCoverage(answer, citations, chunks) {
  if (!citations || citations.length === 0) {
    return 0;
  }

  // Extract factual claims (simple heuristic: sentences with numbers, dates, or specific entities)
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const factualPatterns = [
    /\d{4}/, // Years
    /\d+%/, // Percentages
    /\$\d+/, // Money
    /\d+\.\d+/, // Decimals
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)/i, // Months
  ];

  const factualSentences = sentences.filter(
    s => factualPatterns.some(p => p.test(s)) || s.split(' ').length > 15 // Longer sentences often contain facts
  );

  if (factualSentences.length === 0) {
    return 1.0; // No factual claims to verify
  }

  // Count sentences with citations
  const citedSentences = factualSentences.filter(s => {
    const citationIds = citations.map(c => c.passageId);
    return citationIds.some(id => {
      const passage = chunks.find((_, idx) => idx + 1 === id);
      if (!passage) return false;
      // Simple check: does the sentence mention something from the passage?
      const passageWords = passage.content.toLowerCase().split(/\s+/).slice(0, 20);
      const sentenceWords = s.toLowerCase().split(/\s+/);
      return passageWords.some(pw => sentenceWords.includes(pw));
    });
  });

  return citedSentences.length / factualSentences.length;
}

/**
 * Estimate hallucination risk
 * Checks if claims can be supported by provided passages
 */
export async function estimateHallucinationRisk(answer, citations, chunks) {
  if (!citations || citations.length === 0) {
    return {
      risk: 'high',
      score: 0.8,
      reasons: ['No citations found in answer'],
    };
  }

  const citationCoverage = calculateCitationCoverage(answer, citations, chunks);

  let risk = 'low';
  let score = 0.2;

  if (citationCoverage < 0.3) {
    risk = 'high';
    score = 0.8;
  } else if (citationCoverage < 0.5) {
    risk = 'medium';
    score = 0.5;
  }

  // Check for unsupported claims (sentences without nearby citations)
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const unsupported = sentences.filter(s => {
    // Check if sentence has a citation within 50 chars
    const sentenceStart = answer.indexOf(s);
    const nearbyCitations = citations.filter(c => Math.abs(c.position - sentenceStart) < 50);
    return nearbyCitations.length === 0;
  });

  if (unsupported.length > sentences.length * 0.4) {
    risk = 'medium';
    score = Math.max(score, 0.6);
  }

  return {
    risk,
    score,
    citationCoverage,
    unsupportedClaims: unsupported.length,
    totalClaims: sentences.length,
  };
}

/**
 * Extract evidence passages for a specific claim
 */
export function extractEvidenceForClaim(claimText, chunks, citations) {
  // Find chunks that are most relevant to the claim
  const claimWords = new Set(
    claimText
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  const relevantChunks = chunks
    .map((chunk, idx) => {
      const chunkWords = new Set(chunk.content.toLowerCase().split(/\s+/));
      const overlap = [...claimWords].filter(w => chunkWords.has(w)).length;
      const score = overlap / claimWords.size;

      return {
        chunk,
        index: idx + 1,
        score,
        isCited: citations.some(c => c.passageId === idx + 1),
      };
    })
    .filter(item => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return relevantChunks;
}
