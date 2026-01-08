/**
 * Auto-Editor Service
 * Phase 2, Day 1: Auto-Editing for Word/PDF/Excel
 * Provides AI-powered editing suggestions and preview
 */

import { aiEngine } from '../ai';
import { parsePdfFile } from '../../modes/docs/parsers/pdf';
import { parseDocxFile } from '../../modes/docs/parsers/docx';

export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'txt';

export interface EditSuggestion {
  id: string;
  type: 'grammar' | 'style' | 'clarity' | 'fact-check' | 'formatting' | 'structure';
  severity: 'low' | 'medium' | 'high';
  originalText: string;
  suggestedText: string;
  reason: string;
  confidence: number; // 0-1
  position: {
    start: number;
    end: number;
    page?: number; // For PDFs
    line?: number; // For text files
  };
  metadata?: {
    rule?: string; // Grammar rule, style guide reference, etc.
    category?: string; // e.g., "passive voice", "wordiness", "punctuation"
  };
}

export interface DocumentEdit {
  id: string;
  documentId: string;
  documentType: DocumentType;
  originalContent: string;
  editedContent: string;
  suggestions: EditSuggestion[];
  appliedEdits: string[]; // IDs of applied suggestions
  createdAt: number;
  updatedAt: number;
}

export interface EditPreview {
  original: string;
  edited: string;
  changes: Array<{
    type: 'insert' | 'delete' | 'replace';
    original?: string;
    edited?: string;
    suggestionId: string;
  }>;
}

/**
 * Phase 2, Day 1: Generate AI-powered editing suggestions
 */
export async function generateEditSuggestions(
  content: string,
  documentType: DocumentType,
  options?: {
    focusAreas?: EditSuggestion['type'][];
    strictness?: 'loose' | 'normal' | 'strict';
    language?: string;
  }
): Promise<EditSuggestion[]> {
  const focusAreas = options?.focusAreas || ['grammar', 'style', 'clarity'];
  const strictness = options?.strictness || 'normal';
  const language = options?.language || 'en';

  try {
    // Phase 2, Day 1: Use AI to analyze and suggest edits
    const prompt = `Analyze the following ${documentType.toUpperCase()} document content and provide editing suggestions.

Focus areas: ${focusAreas.join(', ')}
Strictness level: ${strictness}
Language: ${language}

Content:
${content.substring(0, 8000)} ${content.length > 8000 ? '... (truncated)' : ''}

Provide suggestions in JSON format:
[
  {
    "type": "grammar|style|clarity|fact-check|formatting|structure",
    "severity": "low|medium|high",
    "originalText": "exact text to replace",
    "suggestedText": "suggested replacement",
    "reason": "brief explanation",
    "confidence": 0.0-1.0,
    "position": {
      "start": character_index,
      "end": character_index
    },
    "metadata": {
      "rule": "grammar/style rule name",
      "category": "category name"
    }
  }
]

Return only valid JSON array, no markdown formatting.`;

    // SECURITY: Use runTask instead of complete (which doesn't exist)
    const result = await aiEngine.runTask({
      kind: 'agent',
      prompt,
      llm: {
        maxTokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent suggestions
      },
    });

    // Parse AI response
    let suggestions: EditSuggestion[] = [];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.map((s: any, idx: number) => ({
          id: `suggestion-${Date.now()}-${idx}`,
          type: s.type || 'grammar',
          severity: s.severity || 'medium',
          originalText: s.originalText || '',
          suggestedText: s.suggestedText || '',
          reason: s.reason || 'Improvement suggested',
          confidence: Math.max(0, Math.min(1, s.confidence || 0.7)),
          position: {
            start: s.position?.start || 0,
            end: s.position?.end || 0,
            page: s.position?.page,
            line: s.position?.line,
          },
          metadata: s.metadata || {},
        }));
      }
    } catch (parseError) {
      console.error('[AutoEditor] Failed to parse AI suggestions:', parseError);
      // Fallback: Generate basic suggestions using heuristics
      suggestions = generateHeuristicSuggestions(content, focusAreas);
    }

    // Filter and validate suggestions
    return suggestions.filter(s => {
      // Validate position
      if (s.position.start < 0 || s.position.end > content.length) return false;
      if (s.position.start >= s.position.end) return false;

      // Validate text matches
      const actualText = content.substring(s.position.start, s.position.end);
      if (actualText.trim() !== s.originalText.trim()) {
        // Try to find the text nearby
        const foundIndex = content.indexOf(s.originalText, Math.max(0, s.position.start - 50));
        if (foundIndex !== -1) {
          s.position.start = foundIndex;
          s.position.end = foundIndex + s.originalText.length;
          return true;
        }
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('[AutoEditor] Failed to generate suggestions:', error);
    // Fallback to heuristic suggestions
    return generateHeuristicSuggestions(content, focusAreas);
  }
}

/**
 * Phase 2, Day 1: Generate heuristic-based suggestions (fallback)
 */
function generateHeuristicSuggestions(
  content: string,
  focusAreas: EditSuggestion['type'][]
): EditSuggestion[] {
  const suggestions: EditSuggestion[] = [];
  const sentences = content.split(/[.!?]+\s+/);

  sentences.forEach((sentence, idx) => {
    const trimmed = sentence.trim();
    if (!trimmed || trimmed.length < 10) return;

    const startIndex = content.indexOf(trimmed);
    if (startIndex === -1) return;
    const endIndex = startIndex + trimmed.length;

    // Check for common issues
    if (focusAreas.includes('grammar')) {
      // Passive voice detection
      if (/was|were|is|are|been\s+\w+ed\b/i.test(trimmed)) {
        suggestions.push({
          id: `heuristic-${idx}-passive`,
          type: 'style',
          severity: 'low',
          originalText: trimmed,
          suggestedText: trimmed, // Would need AI to rewrite
          reason: 'Consider using active voice for clarity',
          confidence: 0.6,
          position: { start: startIndex, end: endIndex },
          metadata: { category: 'passive voice' },
        });
      }

      // Wordiness detection
      if (
        /\b(very|really|quite|rather|pretty)\s+\w+/i.test(trimmed) &&
        trimmed.split(/\s+/).length > 15
      ) {
        suggestions.push({
          id: `heuristic-${idx}-wordy`,
          type: 'clarity',
          severity: 'medium',
          originalText: trimmed,
          suggestedText: trimmed.replace(/\b(very|really|quite|rather|pretty)\s+/gi, ''),
          reason: 'Remove unnecessary intensifiers for conciseness',
          confidence: 0.7,
          position: { start: startIndex, end: endIndex },
          metadata: { category: 'wordiness' },
        });
      }
    }
  });

  return suggestions.slice(0, 20); // Limit to 20 suggestions
}

/**
 * Phase 2, Day 1: Apply suggestions to content
 */
export function applySuggestions(
  content: string,
  suggestions: EditSuggestion[],
  suggestionIds: string[]
): string {
  // Sort suggestions by position (reverse order to avoid index shifting)
  const toApply = suggestions
    .filter(s => suggestionIds.includes(s.id))
    .sort((a, b) => b.position.start - a.position.start);

  let editedContent = content;

  for (const suggestion of toApply) {
    const before = editedContent.substring(0, suggestion.position.start);
    const after = editedContent.substring(suggestion.position.end);
    editedContent = before + suggestion.suggestedText + after;
  }

  return editedContent;
}

/**
 * Phase 2, Day 1: Generate preview of changes
 */
export function generateEditPreview(
  original: string,
  edited: string,
  suggestions: EditSuggestion[],
  appliedIds: string[]
): EditPreview {
  const changes: EditPreview['changes'] = [];
  const applied = suggestions.filter(s => appliedIds.includes(s.id));

  // Sort by position
  applied.sort((a, b) => a.position.start - b.position.start);

  let lastIndex = 0;
  for (const suggestion of applied) {
    if (suggestion.position.start > lastIndex) {
      // Add unchanged text
      const unchanged = original.substring(lastIndex, suggestion.position.start);
      if (unchanged) {
        // No change entry needed for unchanged text
      }
    }

    changes.push({
      type: 'replace',
      original: suggestion.originalText,
      edited: suggestion.suggestedText,
      suggestionId: suggestion.id,
    });

    lastIndex = suggestion.position.end;
  }

  return {
    original,
    edited,
    changes,
  };
}

/**
 * Phase 2, Day 1: Parse document file and extract text
 */
export async function parseDocument(file: File): Promise<{ content: string; type: DocumentType }> {
  const fileName = file.name.toLowerCase();
  let content = '';
  let type: DocumentType = 'txt';

  if (fileName.endsWith('.pdf')) {
    type = 'pdf';
    content = await parsePdfFile(file);
  } else if (fileName.endsWith('.docx')) {
    type = 'docx';
    content = await parseDocxFile(file);
  } else if (fileName.endsWith('.xlsx')) {
    type = 'xlsx';
    // Excel parsing would require a library like xlsx
    // For now, return placeholder
    content = '[Excel file - parsing not yet implemented]';
  } else {
    type = 'txt';
    content = await file.text();
  }

  return { content, type };
}
