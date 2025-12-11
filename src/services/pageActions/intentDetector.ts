/**
 * AI-Based Intent Detection
 * Detects user intent from page content and context
 */

import type { PageAnalysis } from './analyzer';

export interface DetectedIntent {
  intent: IntentType;
  confidence: number;
  context: Record<string, any>;
  suggestedActions: string[];
}

export type IntentType =
  | 'read_article'
  | 'purchase_product'
  | 'fill_form'
  | 'schedule_meeting'
  | 'contact_person'
  | 'save_content'
  | 'share_content'
  | 'translate'
  | 'research'
  | 'other';

/**
 * Detect user intent from page analysis
 */
export async function detectIntent(analysis: PageAnalysis, userContext?: {
  selectedText?: string;
  cursorPosition?: { x: number; y: number };
  mouseOverElement?: string;
}): Promise<DetectedIntent> {
  // Analyze based on content type and structure
  const intents: Array<{ intent: IntentType; confidence: number; context: Record<string, any> }> = [];

  // Content type based intents
  switch (analysis.contentType) {
    case 'article':
      intents.push({
        intent: 'read_article',
        confidence: 0.8,
        context: {
          hasSummary: !!analysis.description,
          wordCount: estimateWordCount(analysis),
        },
      });
      
      if (analysis.structure.forms.length > 0) {
        intents.push({
          intent: 'fill_form',
          confidence: 0.6,
          context: {
            formCount: analysis.structure.forms.length,
          },
        });
      }
      break;

    case 'product':
      intents.push({
        intent: 'purchase_product',
        confidence: 0.7,
        context: {
          hasPrice: analysis.keywords.some(k => k.includes('price') || k.includes('₹') || k.includes('$')),
        },
      });
      break;

    case 'form':
      intents.push({
        intent: 'fill_form',
        confidence: 0.9,
        context: {
          formCount: analysis.structure.forms.length,
          totalFields: analysis.structure.forms.reduce((sum, f) => sum + f.fields, 0),
        },
      });
      break;
  }

  // Entity-based intents
  const hasDates = analysis.entities.some(e => e.type === 'date');
  if (hasDates) {
    intents.push({
      intent: 'schedule_meeting',
      confidence: 0.7,
      context: {
        dateCount: analysis.entities.filter(e => e.type === 'date').length,
      },
    });
  }

  const hasEmails = analysis.entities.some(e => e.type === 'person' && e.value.includes('@'));
  if (hasEmails) {
    intents.push({
      intent: 'contact_person',
      confidence: 0.6,
      context: {
        emailCount: analysis.entities.filter(e => e.value.includes('@')).length,
      },
    });
  }

  // Selected text context
  if (userContext?.selectedText) {
    const selectedText = userContext.selectedText.trim();
    
    if (selectedText.length > 20) {
      // Long selection - likely wants to summarize or share
      intents.push({
        intent: 'share_content',
        confidence: 0.7,
        context: {
          selectedLength: selectedText.length,
        },
      });
    }

    // Check if selected text contains date/time
    if (/\d{1,2}[-\/]\d{1,2}/.test(selectedText) || /(?:today|tomorrow|meeting|event)/i.test(selectedText)) {
      intents.push({
        intent: 'schedule_meeting',
        confidence: 0.8,
        context: {
          hasDateInSelection: true,
        },
      });
    }
  }

  // Select highest confidence intent
  const primaryIntent = intents.sort((a, b) => b.confidence - a.confidence)[0] || {
    intent: 'other' as IntentType,
    confidence: 0.5,
    context: {},
  };

  // Generate suggested actions based on intent
  const suggestedActions = generateActionsForIntent(primaryIntent.intent, analysis);

  return {
    intent: primaryIntent.intent,
    confidence: primaryIntent.confidence,
    context: primaryIntent.context,
    suggestedActions,
  };
}

/**
 * Estimate word count from analysis
 */
function estimateWordCount(analysis: PageAnalysis): number {
  // Rough estimate based on headings and description
  const text = `${analysis.title} ${analysis.description || ''} ${analysis.structure.headings.map(h => h.text).join(' ')}`;
  return text.split(/\s+/).length;
}

/**
 * Generate suggested actions for intent
 */
function generateActionsForIntent(intent: IntentType, _analysis: PageAnalysis): string[] {
  const actions: string[] = [];

  switch (intent) {
    case 'read_article':
      actions.push('summarize', 'translate', 'compose_email', 'save');
      break;

    case 'purchase_product':
      actions.push('summarize', 'share', 'save');
      break;

    case 'fill_form':
      actions.push('autofill', 'summarize');
      break;

    case 'schedule_meeting':
      actions.push('create_calendar', 'compose_email');
      break;

    case 'contact_person':
      actions.push('compose_email', 'create_calendar');
      break;

    case 'share_content':
      actions.push('compose_email', 'save', 'extract');
      break;

    case 'translate':
      actions.push('translate', 'summarize');
      break;

    case 'save_content':
      actions.push('save', 'extract', 'compose_email');
      break;

    default:
      actions.push('summarize', 'translate', 'extract');
  }

  return actions;
}

