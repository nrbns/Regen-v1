/**
 * Gmail Templates
 * Email template management for Gmail skill
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'greeting',
    name: 'Simple Greeting',
    subject: 'Hello {{recipient}}',
    body: 'Hi {{recipient}},\n\nI hope this email finds you well.\n\nBest regards',
    category: 'General',
  },
  {
    id: 'meeting_request',
    name: 'Meeting Request',
    subject: 'Meeting Request - {{topic}}',
    body: 'Hi {{recipient}},\n\nI would like to schedule a meeting to discuss {{topic}}.\n\nPlease let me know your availability.\n\nThank you',
    category: 'Meetings',
  },
  {
    id: 'follow_up',
    name: 'Follow Up',
    subject: 'Follow Up - {{topic}}',
    body: 'Hi {{recipient}},\n\nJust following up on {{topic}}.\n\nPlease let me know if you have any updates.\n\nThank you',
    category: 'Follow-up',
  },
];

/**
 * Get all templates
 */
export function getAllTemplates(): EmailTemplate[] {
  return DEFAULT_TEMPLATES;
}

/**
 * Fill template with variables
 */
export function fillTemplate(template: EmailTemplate, variables: Record<string, string>): EmailTemplate {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    subject = subject.replace(`{{${key}}}`, value);
    body = body.replace(`{{${key}}}`, value);
  }

  return {
    ...template,
    subject,
    body,
  };
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.id === id);
}
