/**
 * Gmail Skill Integration
 * Integrates Gmail skill with skills engine
 */

import { getSkillRegistry } from '../registry';
import { getSkillEngine } from '../engine';
import { getGmailSkill, GMAIL_SKILL_MANIFEST } from './skill';
import type { SkillContext, SkillResult } from '../types';

/**
 * Initialize Gmail skill and register with engine
 */
export async function initializeGmailSkill(config?: {
  clientId: string;
  redirectUri: string;
}): Promise<void> {
  const registry = getSkillRegistry();
  const engine = getSkillEngine();

  // Check if skill is already installed
  let skill = registry.get(GMAIL_SKILL_MANIFEST.id);

  if (!skill) {
    // Install skill
    skill = await registry.install(GMAIL_SKILL_MANIFEST);
  }

  // Initialize Gmail skill if config provided
  if (config) {
    const gmailSkill = getGmailSkill();
    await gmailSkill.initialize(config);
  }

  // Register action handlers
  const gmailSkill = getGmailSkill();

  engine.registerHandler('composeEmail', async (ctx: any) => {
    const context: SkillContext = {
      skillId: GMAIL_SKILL_MANIFEST.id,
      pageUrl: ctx.page?.url || window.location.href,
      pageTitle: ctx.page?.title || document.title,
      pageContent: ctx.page?.content,
      selectedText: ctx.page?.selectedText,
      permissions: [],
    };

    return gmailSkill.composeEmail(context, ctx.data || {});
  });

  engine.registerHandler('createDraft', async (ctx: any) => {
    const context: SkillContext = {
      skillId: GMAIL_SKILL_MANIFEST.id,
      pageUrl: ctx.page?.url || window.location.href,
      pageTitle: ctx.page?.title || document.title,
      pageContent: ctx.page?.content,
      selectedText: ctx.page?.selectedText,
      permissions: [],
    };

    return gmailSkill.createDraft(context, ctx.data || {});
  });
}

/**
 * Execute Gmail compose action
 */
export async function composeEmail(_data: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  body?: string;
}): Promise<SkillResult> {
  const engine = getSkillEngine();
  const context: SkillContext = {
    skillId: GMAIL_SKILL_MANIFEST.id,
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageContent: document.body.innerText,
    permissions: [],
  };

  return engine.execute(GMAIL_SKILL_MANIFEST.id, {
    ...context,
    action: {
      type: 'compose_email',
      name: 'Compose Email',
      description: 'Compose email',
      handler: 'composeEmail',
    },
  });
}

/**
 * Execute Gmail create draft action
 */
export async function createDraft(_data: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  body?: string;
}): Promise<SkillResult> {
  const engine = getSkillEngine();
  const context: SkillContext = {
    skillId: GMAIL_SKILL_MANIFEST.id,
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageContent: document.body.innerText,
    permissions: [],
  };

  return engine.execute(GMAIL_SKILL_MANIFEST.id, {
    ...context,
    action: {
      type: 'compose_email',
      name: 'Create Draft',
      description: 'Create draft',
      handler: 'createDraft',
    },
  });
}
