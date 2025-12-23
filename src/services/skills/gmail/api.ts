/**
 * Gmail API Client
 * Handles Gmail API interactions for composing and managing emails
 */

import { getGmailOAuthManager } from './oauth';

export interface ComposeEmailData {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  isDraft?: boolean;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string | string[];
  body: string;
  date: Date;
}

export class GmailAPIClient {
  private oauthManager: ReturnType<typeof getGmailOAuthManager>;
  private baseUrl = 'https://www.googleapis.com/gmail/v1/users/me';

  constructor(oauthManager?: ReturnType<typeof getGmailOAuthManager>) {
    this.oauthManager = oauthManager || getGmailOAuthManager();
  }

  /**
   * Compose and send an email
   */
  async composeEmail(data: ComposeEmailData): Promise<EmailMessage> {
    const token = this.oauthManager.getAccessToken();
    if (!token) {
      throw new Error('Not authorized');
    }

    const headers = new Headers({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    const endpoint = data.isDraft ? `${this.baseUrl}/drafts` : `${this.baseUrl}/messages/send`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        raw: this.encodeEmail(data),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to compose email: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      id: result.id || '',
      threadId: result.threadId || '',
      subject: data.subject,
      from: 'user@gmail.com',
      to: data.to,
      body: data.body,
      date: new Date(),
    };
  }

  /**
   * Create draft email
   */
  async createDraft(data: ComposeEmailData): Promise<EmailMessage> {
    return this.composeEmail({ ...data, isDraft: true });
  }

  /**
   * Get email messages
   */
  async getMessages(maxResults: number = 10): Promise<EmailMessage[]> {
    const token = this.oauthManager.getAccessToken();
    if (!token) {
      throw new Error('Not authorized');
    }

    const headers = new Headers({
      Authorization: `Bearer ${token}`,
    });

    const response = await fetch(`${this.baseUrl}/messages?maxResults=${maxResults}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    const data = await response.json();
    return (
      data.messages?.map((msg: any) => ({
        id: msg.id,
        threadId: msg.threadId,
        subject: 'Email',
        from: 'sender@gmail.com',
        to: 'user@gmail.com',
        body: '',
        date: new Date(),
      })) || []
    );
  }

  /**
   * Encode email to base64
   */
  private encodeEmail(data: ComposeEmailData): string {
    const toStr = Array.isArray(data.to) ? data.to.join(',') : data.to;
    const ccStr = data.cc ? (Array.isArray(data.cc) ? data.cc.join(',') : data.cc) : '';
    const bccStr = data.bcc ? (Array.isArray(data.bcc) ? data.bcc.join(',') : data.bcc) : '';

    const email = [
      `To: ${toStr}`,
      ccStr ? `Cc: ${ccStr}` : '',
      bccStr ? `Bcc: ${bccStr}` : '',
      `Subject: ${data.subject}`,
      '',
      data.body,
    ]
      .filter(Boolean)
      .join('\r\n');

    return btoa(email).replace(/\+/g, '-').replace(/\//g, '_');
  }
}

// Singleton instance
let apiClient: GmailAPIClient | null = null;

export function getGmailAPIClient(): GmailAPIClient {
  if (!apiClient) {
    apiClient = new GmailAPIClient();
  }
  return apiClient;
}
