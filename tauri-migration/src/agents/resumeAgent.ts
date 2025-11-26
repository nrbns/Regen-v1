/**
 * Resume Agent
 * AI-powered resume reformatting and optimization
 */

import type { ResumeData } from '../services/resumeService';

export interface ResumeReformatOptions {
  format?: 'ats-friendly' | 'creative' | 'academic';
  jobDescription?: string;
  targetLength?: number;
  includeKeywords?: string[];
  style?: 'professional' | 'modern' | 'traditional';
}

export interface ReformatResult {
  formattedText: string;
  changes: Array<{
    section: string;
    change: string;
    reason: string;
  }>;
  improvements: string[];
  keywordMatches: number;
}

const API_BASE = import.meta.env.VITE_REDIX_CORE_URL || 'http://localhost:4000';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

/**
 * Reformat resume using AI
 */
export async function reformatResume(
  resume: ResumeData,
  options: ResumeReformatOptions = {}
): Promise<ReformatResult> {
  try {
    // Build prompt for AI
    const prompt = buildReformatPrompt(resume, options);

    // Call AI service (Redix or OpenAI)
    const formattedText = await callAIForReformat(prompt, resume.text);

    // Analyze changes
    const changes = analyzeChanges(resume.text, formattedText, resume.sections);
    const improvements = generateImprovements(resume, formattedText, options);
    const keywordMatches = countKeywordMatches(formattedText, options);

    return {
      formattedText,
      changes,
      improvements,
      keywordMatches,
    };
  } catch (error) {
    console.error('[ResumeAgent] Reformat failed:', error);
    throw new Error(
      `Failed to reformat resume: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Match resume to job description
 */
export interface JobMatchResult {
  matchScore: number; // 0-100
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  tailoredResume?: string;
}

export async function matchToJobDescription(
  resume: ResumeData,
  jobDescription: string
): Promise<JobMatchResult> {
  try {
    // Extract keywords from job description
    const jobKeywords = extractKeywords(jobDescription);
    const resumeKeywords = extractKeywords(resume.text);

    // Find matches
    const matchedKeywords = jobKeywords.filter(keyword =>
      resumeKeywords.some(rk => rk.toLowerCase().includes(keyword.toLowerCase()))
    );
    const missingKeywords = jobKeywords.filter(
      keyword => !matchedKeywords.some(mk => mk.toLowerCase() === keyword.toLowerCase())
    );

    // Calculate match score
    const matchScore = Math.round((matchedKeywords.length / jobKeywords.length) * 100);

    // Generate suggestions
    const suggestions = generateTailoringSuggestions(resume, jobKeywords, missingKeywords);

    // Optionally generate tailored resume
    let tailoredResume: string | undefined;
    if (missingKeywords.length > 0) {
      tailoredResume = await tailorResumeToJob(resume.text, jobDescription, missingKeywords);
    }

    return {
      matchScore,
      matchedKeywords,
      missingKeywords,
      suggestions,
      tailoredResume,
    };
  } catch (error) {
    console.error('[ResumeAgent] Job matching failed:', error);
    throw new Error(
      `Failed to match resume: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build reformat prompt for AI
 */
function buildReformatPrompt(resume: ResumeData, options: ResumeReformatOptions): string {
  const format = options.format || 'ats-friendly';
  const style = options.style || 'professional';
  const targetLength = options.targetLength || 500;

  let prompt = `Reformat the following resume to be ${format} and ${style} style. Target length: ${targetLength} words.

Requirements:
- Use clear section headings
- Bullet points for achievements
- Quantify results where possible
- Professional tone
- ATS-friendly formatting (if ${format === 'ats-friendly'})
${options.jobDescription ? `- Tailor content to match this job: ${options.jobDescription.slice(0, 500)}` : ''}
${options.includeKeywords?.length ? `- Include these keywords: ${options.includeKeywords.join(', ')}` : ''}

Original Resume:
${resume.text.slice(0, 3000)}

Provide only the reformatted resume text, no explanations.`;

  return prompt;
}

/**
 * Call AI service for reformatting
 */
async function callAIForReformat(prompt: string, originalText: string): Promise<string> {
  try {
    // Try Redix first
    if (API_BASE) {
      const response = await fetch(`${API_BASE}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          useOllama: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.answer || data.text || originalText;
      }
    }

    // Fallback to OpenAI if available
    if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0]?.message?.content || originalText;
      }
    }

    // Fallback: return original with basic formatting
    return formatBasicResume(originalText);
  } catch (error) {
    console.error('[ResumeAgent] AI call failed:', error);
    return formatBasicResume(originalText);
  }
}

/**
 * Basic resume formatting fallback
 */
function formatBasicResume(text: string): string {
  // Simple formatting: ensure sections, clean up spacing
  let formatted = text
    .replace(/\s{3,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Ensure section headers are on their own line
  formatted = formatted.replace(/([A-Z][a-z]+(?: [A-Z][a-z]+)*)\n/g, '\n$1\n');

  return formatted;
}

/**
 * Analyze changes between original and formatted resume
 */
function analyzeChanges(
  original: string,
  formatted: string,
  sections: ResumeData['sections']
): ReformatResult['changes'] {
  const changes: ReformatResult['changes'] = [];

  // Simple change detection
  const originalLength = original.split(/\s+/).length;
  const formattedLength = formatted.split(/\s+/).length;

  if (Math.abs(originalLength - formattedLength) > 50) {
    changes.push({
      section: 'Overall',
      change: `${originalLength > formattedLength ? 'Reduced' : 'Increased'} word count by ${Math.abs(originalLength - formattedLength)} words`,
      reason: 'Optimized length for better readability',
    });
  }

  // Check for section improvements
  sections.forEach(section => {
    if (section.content.trim().length < 50) {
      changes.push({
        section: section.title,
        change: 'Expanded content',
        reason: 'Section was too brief',
      });
    }
  });

  return changes;
}

/**
 * Generate improvement suggestions
 */
function generateImprovements(
  resume: ResumeData,
  formatted: string,
  options: ResumeReformatOptions
): string[] {
  const improvements: string[] = [];

  const formattedWordCount = formatted.split(/\s+/).length;
  if (formattedWordCount >= 300 && formattedWordCount <= 700) {
    improvements.push('Resume length optimized for ATS systems');
  }

  if (options.format === 'ats-friendly') {
    improvements.push('Formatted for Applicant Tracking Systems');
  }

  if (options.jobDescription) {
    improvements.push('Content tailored to job description');
  }

  if (options.includeKeywords?.length) {
    improvements.push(`Included ${options.includeKeywords.length} relevant keywords`);
  }

  return improvements;
}

/**
 * Count keyword matches
 */
function countKeywordMatches(text: string, options: ResumeReformatOptions): number {
  if (!options.includeKeywords?.length) return 0;

  const lowerText = text.toLowerCase();
  return options.includeKeywords.filter(keyword => lowerText.includes(keyword.toLowerCase()))
    .length;
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction (can be enhanced)
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const stopWords = new Set([
    'that',
    'this',
    'with',
    'from',
    'have',
    'been',
    'will',
    'your',
    'their',
  ]);
  const keywords = words.filter(word => !stopWords.has(word) && word.length > 4);

  // Count frequencies and return most common
  const freq: Record<string, number> = {};
  keywords.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Generate tailoring suggestions
 */
function generateTailoringSuggestions(
  resume: ResumeData,
  jobKeywords: string[],
  missingKeywords: string[]
): string[] {
  const suggestions: string[] = [];

  if (missingKeywords.length > 0) {
    suggestions.push(`Add these keywords: ${missingKeywords.slice(0, 5).join(', ')}`);
  }

  const skillsSection = resume.sections.find(s => s.type === 'skills');
  if (!skillsSection && jobKeywords.some(k => k.toLowerCase().includes('skill'))) {
    suggestions.push('Add a dedicated skills section');
  }

  return suggestions;
}

/**
 * Tailor resume to job description
 */
async function tailorResumeToJob(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[]
): Promise<string> {
  const prompt = `Tailor this resume to match the job description. Add missing keywords naturally: ${missingKeywords.join(', ')}

Resume:
${resumeText.slice(0, 2000)}

Job Description:
${jobDescription.slice(0, 1000)}

Provide the tailored resume text only.`;

  return callAIForReformat(prompt, resumeText);
}
