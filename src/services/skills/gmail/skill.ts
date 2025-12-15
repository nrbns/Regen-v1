/**
 * Gmail Skill Implementation
 * Skill that enables Gmail integration for composing emails and creating drafts
 */

import { getSkillRegistry } from '../registry';
// Skill engine is accessed through registry
// import { getSkillEngine } from '../engine';
import { GmailOAuthManager } from './oauth';
import { GmailAPIClient, type ComposeEmailData } from './api';
import type { SkillManifest, SkillContext, SkillResult } from '../types';
import { extractPageContext } from './contextExtractor';

/**
 * Gmail Skill Manifest
 */
export const GMAIL_SKILL_MANIFEST: SkillManifest = {
  id: 'regen-gmail',
  name: 'Gmail Integration',
  version: '1.0.0',
  description: 'Compose emails and create drafts from page content using Gmail',
  author: 'Regen Browser',
  icon: '📧',
  permissions: [
    {
      type: 'access_gmail',
      description: 'Access Gmail API to compose emails and create drafts',
      required: true,
    },
    {
      type: 'read_page',
      description: 'Read page content to extract email context',
      required: false,
    },
  ],
  triggers: [
    {
      type: 'manual',
    },
    {
      type: 'text_selection',
    },
  ],
  actions: [
    {
      type: 'compose_email',
      name: 'Compose Email',
      description: 'Open Gmail compose with context from current page',
      parameters: {
        to: 'string',
        subject: 'string',
        body: 'string',
      },
      handler: 'composeEmail',
    },
    {
      type: 'compose_email',
      name: 'Create Draft',
      description: 'Create a Gmail draft from page content',
      parameters: {
        to: 'string',
        subject: 'string',
        body: 'string',
      },
      handler: 'createDraft',
    },
  ],
  settings: {
    autoExtractContext: {
      type: 'boolean',
      default: true,
      description: 'Automatically extract context from page when composing',
    },
  },
};

/**
 * Gmail Skill Implementation
 */
export class GmailSkill {
  private oauthManager: GmailOAuthManager | null = null;
  private apiClient: GmailAPIClient | null = null;

  /**
   * Initialize Gmail skill
   */
  async initialize(config: { clientId: string; redirectUri: string }): Promise<void> {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    this.oauthManager = new GmailOAuthManager({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes,
    });

    // Check if already authorized
    const isAuthorized = await this.oauthManager.isAuthorized();
    if (isAuthorized) {
      this.apiClient = new GmailAPIClient(this.oauthManager);
    }
  }

  /**
   * Authorize Gmail access
   */
  async authorize(): Promise<void> {
    if (!this.oauthManager) {
      throw new Error('Gmail skill not initialized');
    }

    await this.oauthManager.authorize();
    this.apiClient = new GmailAPIClient(this.oauthManager);
  }

  /**
   * Check if authorized
   */
  async isAuthorized(): Promise<boolean> {
    if (!this.oauthManager) return false;
    return this.oauthManager.isAuthorized();
  }

  /**
   * Compose email action
   */
  async composeEmail(context: SkillContext, data: Partial<ComposeEmailData>): Promise<SkillResult> {
    if (!this.apiClient) {
      return {
        success: false,
        error: 'Gmail not authorized. Please authorize first.',
      };
    }

    try {
      // Extract context from page if auto-extract is enabled
      const skill = getSkillRegistry().get('regen-gmail');
      const autoExtract = skill?.settings?.autoExtractContext ?? true;

      let emailData: ComposeEmailData = {
        to: data.to || '',
        subject: data.subject || '',
        body: data.body || '',
        ...data,
      };

      if (autoExtract && context.pageUrl) {
        const pageContext = await extractPageContext(context);
        emailData = {
          ...emailData,
          subject: emailData.subject || pageContext.suggestedSubject,
          body: emailData.body || pageContext.suggestedBody,
        };
      }

      // Open Gmail compose in new tab (fallback if API fails)
      const composeUrl = this.buildComposeUrl(emailData);
      window.open(composeUrl, '_blank');

      return {
        success: true,
        message: 'Gmail compose opened',
        data: { composeUrl },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to compose email',
      };
    }
  }

  /**
   * Create draft action
   */
  async createDraft(context: SkillContext, data: Partial<ComposeEmailData>): Promise<SkillResult> {
    if (!this.apiClient) {
      return {
        success: false,
        error: 'Gmail not authorized. Please authorize first.',
      };
    }

    try {
      // Extract context from page
      const skill = getSkillRegistry().get('regen-gmail');
      const autoExtract = skill?.settings?.autoExtractContext ?? true;

      let emailData: ComposeEmailData = {
        to: data.to || '',
        subject: data.subject || '',
        body: data.body || '',
        ...data,
      };

      if (autoExtract && context.pageUrl) {
        const pageContext = await extractPageContext(context);
        emailData = {
          ...emailData,
          subject: emailData.subject || pageContext.suggestedSubject,
          body: emailData.body || pageContext.suggestedBody,
        };
      }

      // Validate required fields
      if (!emailData.to || !emailData.subject) {
        return {
          success: false,
          error: 'To and subject are required',
        };
      }

      const draft = await this.apiClient.createDraft(emailData);

      return {
        success: true,
        message: 'Draft created successfully',
        data: { draftId: draft.id },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create draft',
      };
    }
  }

  /**
   * Build Gmail compose URL
   */
  private buildComposeUrl(data: Partial<ComposeEmailData>): string {
    const params = new URLSearchParams();

    if (data.to) {
      params.append('to', Array.isArray(data.to) ? data.to.join(',') : data.to);
    }
    if (data.cc) {
      params.append('cc', Array.isArray(data.cc) ? data.cc.join(',') : data.cc);
    }
    if (data.bcc) {
      params.append('bcc', Array.isArray(data.bcc) ? data.bcc.join(',') : data.bcc);
    }
    if (data.subject) {
      params.append('subject', data.subject);
    }
    if (data.body) {
      params.append('body', data.body);
    }

    return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
  }

  /**
   * Revoke Gmail access
   */
  async revoke(): Promise<void> {
    if (this.oauthManager) {
      await this.oauthManager.revoke();
      this.apiClient = null;
    }
  }
}

// Singleton instance
let gmailSkillInstance: GmailSkill | null = null;

export function getGmailSkill(): GmailSkill {
  if (!gmailSkillInstance) {
    gmailSkillInstance = new GmailSkill();
  }
  return gmailSkillInstance;
}
