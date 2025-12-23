/**
 * Page Action Suggestion Engine
 * Combines analysis and intent detection to suggest actions
 */

import { analyzePage, type PageAnalysis, type SuggestedAction } from './analyzer';
import { detectIntent, type DetectedIntent } from './intentDetector';
import { getSkillRegistry } from '../skills/registry';
import { getSkillEngine } from '../skills/engine';
import type { SkillContext } from '../skills/types';

export interface ActionSuggestion {
  id: string;
  action: SuggestedAction;
  intent: DetectedIntent['intent'];
  confidence: number;
  skillId?: string;
  actionId?: string;
  execute: () => Promise<any>;
}

/**
 * Get suggested actions for current page
 */
export async function getSuggestedActions(context?: {
  selectedText?: string;
  cursorPosition?: { x: number; y: number };
}): Promise<ActionSuggestion[]> {
  // Analyze page
  const analysis = await analyzePage();

  // Detect intent
  const intent = await detectIntent(analysis, context);

  // Get available skills
  const registry = getSkillRegistry();
  const enabledSkills = registry.getEnabled();

  // Combine analysis actions with intent-based actions
  const suggestions: ActionSuggestion[] = [];

  // Add actions from page analysis
  for (const action of analysis.actions) {
    // Check if skill is available and enabled
    if (action.skillId) {
      const skill = enabledSkills.find(s => s.id === action.skillId);
      if (!skill) continue; // Skip if skill not enabled
    }

    suggestions.push({
      id: action.id,
      action,
      intent: intent.intent,
      confidence: calculateConfidence(action, intent),
      skillId: action.skillId,
      actionId: action.actionId,
      execute: () => executeAction(action, analysis),
    });
  }

  // Add intent-based actions
  const intentActions = generateActionsFromIntent(intent, analysis, enabledSkills);
  suggestions.push(...intentActions);

  // Remove duplicates and sort by confidence
  const unique = removeDuplicates(suggestions);
  return unique.sort((a, b) => b.confidence - a.confidence).slice(0, 8); // Top 8 suggestions
}

/**
 * Calculate confidence for an action
 */
function calculateConfidence(action: SuggestedAction, intent: DetectedIntent): number {
  let confidence = action.priority / 10; // Normalize priority to 0-1

  // Boost confidence if action matches intent
  const intentActionMap: Record<string, string[]> = {
    fill_form: ['autofill'],
    schedule_meeting: ['create_calendar', 'create_calendar_event'],
    contact_person: ['compose_email'],
    share_content: ['compose_email', 'save'],
    read_article: ['summarize', 'translate'],
  };

  const matchingActions = intentActionMap[intent.intent] || [];
  if (matchingActions.includes(action.type)) {
    confidence += 0.3;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Generate actions from detected intent
 */
function generateActionsFromIntent(
  intent: DetectedIntent,
  analysis: PageAnalysis,
  enabledSkills: any[]
): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];

  for (const actionType of intent.suggestedActions) {
    // Skip if already in analysis.actions
    if (analysis.actions.some(a => a.type === actionType)) {
      continue;
    }

    const action = createActionFromType(actionType, analysis);
    if (action) {
      // Check if skill is enabled
      if (action.skillId) {
        const skill = enabledSkills.find(s => s.id === action.skillId);
        if (!skill) continue;
      }

      suggestions.push({
        id: `${actionType}-${Date.now()}`,
        action,
        intent: intent.intent,
        confidence: intent.confidence * 0.8, // Slightly lower than direct matches
        skillId: action.skillId,
        actionId: action.actionId,
        execute: () => executeAction(action, analysis),
      });
    }
  }

  return suggestions;
}

/**
 * Create action from type
 */
function createActionFromType(actionType: string, _analysis: PageAnalysis): SuggestedAction | null {
  const actionMap: Record<string, () => SuggestedAction> = {
    summarize: () => ({
      id: 'summarize',
      type: 'summarize',
      title: 'Summarize Page',
      description: 'Generate a summary of this page',
      priority: 5,
    }),
    translate: () => ({
      id: 'translate',
      type: 'translate',
      title: 'Translate Page',
      description: 'Translate page to another language',
      priority: 4,
    }),
    compose_email: () => ({
      id: 'compose-email',
      type: 'compose_email',
      title: 'Compose Email',
      description: 'Compose email with page content',
      priority: 6,
      skillId: 'regen-gmail',
      actionId: 'composeEmail',
    }),
    create_calendar: () => ({
      id: 'create-calendar',
      type: 'create_calendar',
      title: 'Create Calendar Event',
      description: 'Schedule event from page',
      priority: 7,
      skillId: 'regen-calendar',
      actionId: 'createEvent',
    }),
    autofill: () => ({
      id: 'autofill',
      type: 'autofill',
      title: 'Autofill Form',
      description: 'Fill form automatically',
      priority: 8,
      skillId: 'regen-autofill',
      actionId: 'autofillForm',
    }),
    save: () => ({
      id: 'save',
      type: 'save',
      title: 'Save Page',
      description: 'Save this page for later',
      priority: 3,
    }),
    extract: () => ({
      id: 'extract',
      type: 'extract',
      title: 'Extract Data',
      description: 'Extract structured data from page',
      priority: 4,
    }),
  };

  const creator = actionMap[actionType];
  return creator ? creator() : null;
}

/**
 * Execute an action
 */
async function executeAction(action: SuggestedAction, analysis: PageAnalysis): Promise<any> {
  const registry = getSkillRegistry();
  const engine = getSkillEngine();

  const context: SkillContext = {
    skillId: action.skillId || '',
    pageUrl: analysis.url,
    pageTitle: analysis.title,
    pageContent: document.body.innerText,
    permissions: [],
  };

  // If action has skill, execute through skill engine
  if (action.skillId && action.actionId) {
    const skill = registry.get(action.skillId);
    if (skill && skill.enabled && skill.manifest.actions) {
      return engine.execute(action.skillId, {
        ...context,
        action: skill.manifest.actions.find(a => a.handler === action.actionId),
      });
    }
  }

  // Handle built-in actions
  switch (action.type) {
    case 'summarize':
      // Trigger summarize action (would integrate with AI engine)
      return { success: true, message: 'Summarize action triggered' };

    case 'translate':
      // Trigger translate action
      return { success: true, message: 'Translate action triggered' };

    case 'save':
      // Save page (would integrate with bookmarks/save functionality)
      return { success: true, message: 'Save action triggered' };

    case 'extract':
      // Extract data
      return { success: true, message: 'Extract action triggered', data: analysis.entities };

    default:
      return { success: false, error: 'Unknown action type' };
  }
}

/**
 * Remove duplicate suggestions
 */
function removeDuplicates(suggestions: ActionSuggestion[]): ActionSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.action.type}-${s.action.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
