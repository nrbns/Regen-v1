/**
 * Gmail Connector
 * Handles OAuth, token refresh, and Gmail API calls
 * Production-grade with error handling and rate limiting
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import type { GmailThread, GmailMessage, GmailToken, EmailThread } from './types';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

/**
 * GmailConnector: OAuth + Gmail API wrapper
 */
export class GmailConnector {
  private oauth2Client: any;
  private gmail: any;
  private tokenStore: Map<string, GmailToken> = new Map();
  private tokenStorePath: string;
  private rateLimitDelay: number = 100; // ms between API calls

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenStorePath: string = './data/gmail-tokens.json'
  ) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    this.tokenStorePath = tokenStorePath;
    this.loadTokensFromDisk();
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(_userId: string): string {
     return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
     });
  }

  /**
   * Exchange auth code for tokens
   */
  async setCredentialsFromCode(userId: string, _code: string): Promise<GmailToken> {
      const { tokens } = await this.oauth2Client.getToken(_code);
      const gmailToken: GmailToken = {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || '',
        expiresAt: tokens.expiry_date || Date.now() + 3600000,
        scope: tokens.scope || SCOPES.join(' '),
      };

    this.tokenStore.set(userId, gmailToken);
    this.saveTokensToDisk();
    return gmailToken;
  }

  /**
   * Set credentials from stored token
   */
  async setCredentials(userId: string, token: GmailToken): Promise<boolean> {
    const stored = this.tokenStore.get(userId);
    if (!stored) {
      this.tokenStore.set(userId, token);
    }

    // Refresh if expired
    if (token.expiresAt < Date.now()) {
      return await this.refreshToken(userId);
    }

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiresAt,
    });

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    return true;
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<boolean> {
    const token = this.tokenStore.get(userId);
    if (!token || !token.refreshToken) {
      console.error(`[GmailConnector] No refresh token for user ${userId}`);
      return false;
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: token.refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const updated: GmailToken = {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || token.refreshToken,
        expiresAt: credentials.expiry_date || Date.now() + 3600000,
        scope: token.scope,
      };

      this.tokenStore.set(userId, updated);
      this.saveTokensToDisk();
      return true;
    } catch (error) {
      console.error(`[GmailConnector] Token refresh failed: ${error}`);
      return false;
    }
  }

  /**
   * Get unread thread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      await this.setCredentials(userId, this.tokenStore.get(userId)!);
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });
      return response.data.messagesUnread || 0;
    } catch (error) {
      console.error(`[GmailConnector] Failed to get unread count: ${error}`);
      return 0;
    }
  }

  /**
   * Get unread threads (limit 10)
   */
  async getUnreadThreads(userId: string, maxResults: number = 10): Promise<EmailThread[]> {
    try {
      await this.setCredentials(userId, this.tokenStore.get(userId)!);

      // Get thread IDs
      const listResponse = await this.gmail.users.threads.list({
        userId: 'me',
        q: 'is:unread',
        maxResults,
      });

      if (!listResponse.data.threads) {
        return [];
      }

      const threads: EmailThread[] = [];
      for (const threadRef of listResponse.data.threads) {
        await this.sleep(this.rateLimitDelay);
        const thread = await this.getThreadDetails(userId, threadRef.id);
        if (thread) threads.push(thread);
      }

      return threads;
    } catch (error) {
      console.error(`[GmailConnector] Failed to get unread threads: ${error}`);
      return [];
    }
  }

  /**
   * Get thread details
   */
  async getThreadDetails(userId: string, threadId: string): Promise<EmailThread | null> {
    try {
      await this.setCredentials(userId, this.tokenStore.get(userId)!);

      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      const gmailThread: GmailThread = response.data;
      const messages = gmailThread.messages || [];

      if (messages.length === 0) return null;

      const firstMsg = this.extractMessageData(messages[0]);
      const fullText = messages.map(m => this.extractMessageBody(m)).join('\n---\n');

      return {
        id: threadId,
        subject: firstMsg.subject,
        from: firstMsg.from,
        to: firstMsg.to,
        date: firstMsg.date,
        snippet: gmailThread.snippet || '',
        fullText,
        isUnread: gmailThread.messages?.some((m: GmailMessage) =>
          m.labelIds?.includes('UNREAD')
        ) || false,
      };
    } catch (error) {
      console.error(`[GmailConnector] Failed to get thread details: ${error}`);
      return null;
    }
  }

  /**
   * Send a reply to a thread
   */
  async sendReply(userId: string, threadId: string, body: string, subject?: string): Promise<boolean> {
    try {
      await this.setCredentials(userId, this.tokenStore.get(userId)!);

      const thread = await this.getThreadDetails(userId, threadId);
      if (!thread) {
        console.error(`[GmailConnector] Thread ${threadId} not found`);
        return false;
      }

      const message = `To: ${thread.from}\nSubject: Re: ${subject || thread.subject}\n\n${body}`;
      const encodedMessage = Buffer.from(message).toString('base64');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId,
        },
      });

      console.log(`[GmailConnector] Reply sent to ${threadId}`);
      return true;
    } catch (error) {
      console.error(`[GmailConnector] Failed to send reply: ${error}`);
      return false;
    }
  }

  /**
   * Extract message metadata
   */
  private extractMessageData(msg: GmailMessage) {
    const headers = msg.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';

    return {
      id: msg.id,
      subject: getHeader('Subject'),
      from: getHeader('From'),
      to: getHeader('To'),
      date: getHeader('Date'),
    };
  }

  /**
   * Extract message body (text or HTML)
   */
  private extractMessageBody(msg: GmailMessage): string {
    const payload = msg.payload;
    if (!payload) return '';

    // Simple body
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Multipart: find text/plain part
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Fall back to HTML
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }
    }

    return '';
  }

  /**
   * Load tokens from disk
   */
  private loadTokensFromDisk() {
    try {
      if (fs.existsSync(this.tokenStorePath)) {
        const data = fs.readFileSync(this.tokenStorePath, 'utf-8');
        const tokens = JSON.parse(data);
        this.tokenStore = new Map(Object.entries(tokens) as any);
      }
    } catch (error) {
      console.warn(`[GmailConnector] Could not load tokens from disk: ${error}`);
    }
  }

  /**
   * Save tokens to disk
   */
  private saveTokensToDisk() {
    try {
      const dir = path.dirname(this.tokenStorePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tokens = Object.fromEntries(this.tokenStore);
      fs.writeFileSync(this.tokenStorePath, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error(`[GmailConnector] Failed to save tokens: ${error}`);
    }
  }

  /**
   * Utility: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a Gmail connector with env vars
 */
export function createGmailConnector(): GmailConnector {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
  }

  return new GmailConnector(clientId, clientSecret, redirectUri);
}
