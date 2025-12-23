/**
 * Gmail Skill Index
 * Centralized export for Gmail skill
 */

export { getGmailSkill, GMAIL_SKILL_MANIFEST } from './skill';
export { getGmailOAuthManager } from './oauth';
export { getGmailAPIClient } from './api';
export { extractPageContext, extractEmails, extractLinks } from './contextExtractor';
export { getAllTemplates, fillTemplate } from './templates';
