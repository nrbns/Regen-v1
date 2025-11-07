/**
 * Research Verifier Service
 * Second-pass verification to check citations, flag ungrounded text, detect hallucinations
 */

import { ResearchResult, ResearchSource } from './research-enhanced';

export interface VerificationResult {
  verified: boolean;
  claimDensity: number; // Claims per 100 words
  citationCoverage: number; // Percentage of claims with citations
  ungroundedClaims: Array<{
    text: string;
    position: number; // Character position in summary
    severity: 'low' | 'medium' | 'high';
  }>;
  hallucinationRisk: number; // 0-1 score
  suggestions: string[];
}

/**
 * Extract claims from text (simplified - would use NLP in production)
 */
function extractClaims(text: string): Array<{ claim: string; position: number }> {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
  const claims: Array<{ claim: string; position: number }> = [];
  
  let position = 0;
  for (const sentence of sentences) {
    // Simple heuristic: claims are statements that aren't questions or exclamations
    if (!sentence.trim().endsWith('?') && !sentence.trim().endsWith('!')) {
      // Check if sentence contains factual assertions (has verbs, not just questions)
      const hasFactualWords = /\b(is|are|was|were|has|have|did|does|can|could|will|would|should|must)\b/i.test(sentence);
      if (hasFactualWords || sentence.length > 30) {
        claims.push({
          claim: sentence.trim(),
          position,
        });
      }
    }
    position += sentence.length + 1;
  }
  
  return claims;
}

/**
 * Check if a claim has a citation near it
 */
function hasCitationNearby(
  claim: { claim: string; position: number },
  citations: ResearchResult['citations'],
  summaryLength: number
): boolean {
  // Check if there's a citation within reasonable distance of the claim
  const citationPositions = citations.map(c => {
    // Estimate citation position based on citation index and summary structure
    // This is simplified - in production, track actual positions
    return (c.index / citations.length) * summaryLength;
  });
  
  // Check if any citation is within 200 characters of the claim
  return citationPositions.some(pos => Math.abs(pos - claim.position) < 200);
}

/**
 * Check if a claim is grounded in sources
 */
function isClaimGrounded(
  claim: string,
  sources: ResearchSource[]
): { grounded: boolean; supportingSources: number[] } {
  const claimLower = claim.toLowerCase();
  const keyTerms = claimLower
    .split(/\s+/)
    .filter(term => term.length > 3 && !['the', 'and', 'for', 'are', 'was', 'were'].includes(term))
    .slice(0, 5); // Top 5 key terms
  
  const supportingSources: number[] = [];
  
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const sourceText = source.text.toLowerCase();
    
    // Check if source contains key terms from claim
    const termMatches = keyTerms.filter(term => sourceText.includes(term)).length;
    
    // If at least 2 key terms match, consider it supporting
    if (termMatches >= Math.min(2, keyTerms.length)) {
      supportingSources.push(i);
    }
  }
  
  return {
    grounded: supportingSources.length > 0,
    supportingSources,
  };
}

/**
 * Calculate claim density (claims per 100 words)
 */
function calculateClaimDensity(summary: string, claims: Array<{ claim: string }>): number {
  const wordCount = summary.split(/\s+/).length;
  return wordCount > 0 ? (claims.length / wordCount) * 100 : 0;
}

/**
 * Calculate citation coverage (percentage of claims with citations)
 */
function calculateCitationCoverage(
  claims: Array<{ claim: string; position: number }>,
  citations: ResearchResult['citations'],
  summaryLength: number
): number {
  if (claims.length === 0) return 100; // No claims = 100% coverage
  
  const claimsWithCitations = claims.filter(claim => hasCitationNearby(claim, citations, summaryLength)).length;
  return (claimsWithCitations / claims.length) * 100;
}

/**
 * Detect potential hallucinations
 */
function detectHallucinations(
  ungroundedClaims: VerificationResult['ungroundedClaims'],
  claimDensity: number,
  citationCoverage: number
): number {
  // Hallucination risk increases with:
  // 1. High claim density
  // 2. Low citation coverage
  // 3. Many ungrounded claims
  
  let risk = 0;
  
  // Risk from ungrounded claims
  const highSeverityUngrounded = ungroundedClaims.filter(c => c.severity === 'high').length;
  risk += Math.min(0.4, highSeverityUngrounded * 0.1);
  
  // Risk from low citation coverage
  if (citationCoverage < 50) {
    risk += 0.3;
  } else if (citationCoverage < 70) {
    risk += 0.15;
  }
  
  // Risk from high claim density without citations
  if (claimDensity > 10 && citationCoverage < 60) {
    risk += 0.2;
  }
  
  return Math.min(1.0, risk);
}

/**
 * Generate verification suggestions
 */
function generateSuggestions(verification: VerificationResult): string[] {
  const suggestions: string[] = [];
  
  if (verification.citationCoverage < 70) {
    suggestions.push(`Add more citations. Current coverage: ${verification.citationCoverage.toFixed(1)}%`);
  }
  
  if (verification.claimDensity > 15) {
    suggestions.push(`High claim density (${verification.claimDensity.toFixed(1)} per 100 words). Consider breaking into smaller claims.`);
  }
  
  if (verification.ungroundedClaims.length > 0) {
    const highSeverity = verification.ungroundedClaims.filter(c => c.severity === 'high').length;
    if (highSeverity > 0) {
      suggestions.push(`${highSeverity} high-severity ungrounded claim(s) detected. Add sources or remove unsupported claims.`);
    }
  }
  
  if (verification.hallucinationRisk > 0.5) {
    suggestions.push(`High hallucination risk detected (${(verification.hallucinationRisk * 100).toFixed(1)}%). Review ungrounded claims carefully.`);
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Verification passed. All claims appear to be well-supported.');
  }
  
  return suggestions;
}

/**
 * Verify research result
 */
export function verifyResearchResult(result: ResearchResult): VerificationResult {
  // Extract claims from summary
  const claims = extractClaims(result.summary);
  
  // Calculate metrics
  const claimDensity = calculateClaimDensity(result.summary, claims);
  const citationCoverage = calculateCitationCoverage(claims, result.citations, result.summary.length);
  
  // Find ungrounded claims
  const ungroundedClaims: VerificationResult['ungroundedClaims'] = [];
  
  for (const claim of claims) {
    // Check if claim has citation nearby
    const hasCitation = hasCitationNearby(claim, result.citations, result.summary.length);
    
    if (!hasCitation) {
      // Check if claim is grounded in sources
      const { grounded, supportingSources } = isClaimGrounded(claim.claim, result.sources);
      
      if (!grounded) {
        // Determine severity based on claim characteristics
        let severity: 'low' | 'medium' | 'high' = 'medium';
        
        // High severity: claims with numbers, dates, specific facts
        if (/\d+/.test(claim.claim) || /\b(always|never|all|none|every|never)\b/i.test(claim.claim)) {
          severity = 'high';
        }
        
        // Low severity: vague or opinion statements
        if (/\b(may|might|could|possibly|perhaps|maybe)\b/i.test(claim.claim)) {
          severity = 'low';
        }
        
        ungroundedClaims.push({
          text: claim.claim,
          position: claim.position,
          severity,
        });
      }
    }
  }
  
  // Calculate hallucination risk
  const hallucinationRisk = detectHallucinations(ungroundedClaims, claimDensity, citationCoverage);
  
  // Generate suggestions
  const suggestions = generateSuggestions({
    verified: hallucinationRisk < 0.3 && citationCoverage >= 70,
    claimDensity,
    citationCoverage,
    ungroundedClaims,
    hallucinationRisk,
    suggestions: [],
  });
  
  return {
    verified: hallucinationRisk < 0.3 && citationCoverage >= 70,
    claimDensity,
    citationCoverage,
    ungroundedClaims,
    hallucinationRisk,
    suggestions,
  };
}

