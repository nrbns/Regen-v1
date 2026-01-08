/**
 * Sample Automation Templates
 * Pre-built automations for common tasks
 */

import type { AutomationPlaybook } from '../services/automationBridge';

// Re-export for convenience
export type { AutomationPlaybook };

export const AUTOMATION_TEMPLATES: AutomationPlaybook[] = [
  {
    id: 'template-research-btc',
    title: 'Research BTC Price',
    goal: 'Research current Bitcoin price and market analysis',
    steps: [
      {
        skill: 'search',
        args: {
          query: 'Bitcoin BTC current price market analysis',
          maxResults: 5,
        },
      },
      {
        skill: 'summarize',
        args: {
          sources: 'previous',
          format: 'markdown',
        },
      },
    ],
    output: {
      type: 'json',
      schema: {
        price: 'number',
        change: 'number',
        analysis: 'string',
      },
    },
  },
  {
    id: 'template-summarize-page',
    title: 'Summarize Current Page',
    goal: 'Extract and summarize content from the current page',
    steps: [
      {
        skill: 'extract',
        args: {
          source: 'current-tab',
          includeImages: false,
        },
      },
      {
        skill: 'summarize',
        args: {
          content: 'previous',
          maxLength: 500,
        },
      },
    ],
    output: {
      type: 'text',
    },
  },
  {
    id: 'template-screenshot',
    title: 'Take Screenshot',
    goal: 'Capture screenshot of current page',
    steps: [
      {
        skill: 'screenshot',
        args: {
          fullPage: true,
          format: 'png',
        },
      },
      {
        skill: 'save',
        args: {
          destination: 'downloads',
          filename: 'screenshot-{timestamp}.png',
        },
      },
    ],
    output: {
      type: 'file',
    },
  },
  {
    id: 'template-research-nifty',
    title: 'Research Nifty 50',
    goal: 'Get latest Nifty 50 index data and analysis',
    steps: [
      {
        skill: 'search',
        args: {
          query: 'Nifty 50 index current price India stock market',
          maxResults: 5,
        },
      },
      {
        skill: 'extract',
        args: {
          sources: 'previous',
          fields: ['price', 'change', 'volume'],
        },
      },
    ],
    output: {
      type: 'json',
      schema: {
        index: 'string',
        price: 'number',
        change: 'number',
        volume: 'number',
      },
    },
  },
  {
    id: 'template-translate-page',
    title: 'Translate Current Page',
    goal: 'Translate the current page to Hindi',
    steps: [
      {
        skill: 'extract',
        args: {
          source: 'current-tab',
        },
      },
      {
        skill: 'translate',
        args: {
          content: 'previous',
          targetLanguage: 'hi',
        },
      },
    ],
    output: {
      type: 'text',
    },
  },
];

/**
 * Load template by ID
 */
export function getTemplate(id: string): AutomationPlaybook | undefined {
  return AUTOMATION_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all templates
 */
export function getAllTemplates(): AutomationPlaybook[] {
  return AUTOMATION_TEMPLATES;
}
