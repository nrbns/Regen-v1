/**
 * Task Extraction Service
 * Extracts tasks, dates, and actionable items from text
 */

import { aiEngine } from '../../core/ai';

export interface ExtractedTask {
  task: string;
  type: 'todo' | 'event' | 'deadline' | 'action' | 'note';
  date?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ExtractionResult {
  tasks: ExtractedTask[];
  dates: string[];
  emails: string[];
  phoneNumbers: string[];
  summary: string;
}

/**
 * Extract tasks and actionable items from text
 */
export async function extractTasks(text: string): Promise<ExtractionResult> {
  const prompt = `Extract actionable items, tasks, dates, contact information, and key information from the following text:

"${text}"

Format the response as JSON with the following structure:
{
  "tasks": [
    {
      "task": "task description",
      "type": "todo|event|deadline|action|note",
      "date": "date if found",
      "priority": "high|medium|low"
    }
  ],
  "dates": ["list of dates found"],
  "emails": ["list of email addresses"],
  "phoneNumbers": ["list of phone numbers"],
  "summary": "brief summary of extracted items"
}`;

  try {
    const result = await aiEngine.runTask({
      kind: 'chat',
      prompt,
      context: {
        task: 'extract-tasks',
      },
    });

    // Try to parse JSON response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tasks: parsed.tasks || [],
          dates: parsed.dates || [],
          emails: parsed.emails || [],
          phoneNumbers: parsed.phoneNumbers || [],
          summary: parsed.summary || '',
        };
      }
    } catch {
      // If JSON parsing fails, do simple extraction
    }

    // Fallback: simple extraction
    return simpleExtraction(text);
  } catch {
    // Fallback to simple extraction on error
    return simpleExtraction(text);
  }
}

/**
 * Simple extraction using regex patterns
 */
function simpleExtraction(text: string): ExtractionResult {
  const tasks: ExtractedTask[] = [];
  const dates: string[] = [];
  const emails: string[] = [];
  const phoneNumbers: string[] = [];

  // Extract emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = text.match(emailPattern);
  if (emailMatches) {
    emails.push(...emailMatches);
  }

  // Extract phone numbers
  const phonePattern = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = text.match(phonePattern);
  if (phoneMatches) {
    phoneNumbers.push(...phoneMatches);
  }

  // Extract dates
  const datePatterns = [
    /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s,]+?\d{1,2},?\s+\d{4}\b/gi,
  ];
  for (const pattern of datePatterns) {
    const dateMatches = text.match(pattern);
    if (dateMatches) {
      dates.push(...dateMatches);
    }
  }

  // Extract tasks (simple pattern matching)
  const taskPatterns = [
    /(?:need to|should|must|have to|will)\s+([^.]+)/gi,
    /(?:todo|task|action):\s*([^\n]+)/gi,
    /[-•*]\s*([^\n]+)/g,
  ];

  for (const pattern of taskPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 5) {
        tasks.push({
          task: match[1].trim(),
          type: 'todo',
        });
      }
    }
  }

  // If no tasks found, create one from first sentence
  if (tasks.length === 0 && text.length > 20) {
    tasks.push({
      task: text.substring(0, 100).trim(),
      type: 'note',
    });
  }

  return {
    tasks,
    dates: [...new Set(dates)],
    emails: [...new Set(emails)],
    phoneNumbers: [...new Set(phoneNumbers)],
    summary: `Found ${tasks.length} task(s), ${dates.length} date(s), ${emails.length} email(s), ${phoneNumbers.length} phone number(s)`,
  };
}

