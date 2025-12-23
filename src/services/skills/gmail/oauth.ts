/**
 * Gmail OAuth Manager
 * Handles OAuth2 authentication with Google for Gmail access
 */

export class GmailOAuthManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private clientId: string = '';
  private clientSecret: string = '';
  private redirectUri: string = '';
  private scopes: string[] = [];

  constructor(config?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    scopes?: string[];
  }) {
    this.clientId = config?.clientId || '';
    this.clientSecret = config?.clientSecret || '';
    this.redirectUri = config?.redirectUri || '';
    this.scopes = config?.scopes || [];
  }

  /**
   * Start OAuth authorization flow
   */
  async authorize(): Promise<string> {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append(
      'scope',
      'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify'
    );
    authUrl.searchParams.append('access_type', 'offline');

    window.location.href = authUrl.toString();
    return '';
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Set access token
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Check if authorized
   */
  isAuthorized(): boolean {
    return !!this.accessToken;
  }

  /**
   * Revoke authorization
   */
  async revoke(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  /**
   * Clear tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Singleton instance
let oauthManager: GmailOAuthManager | null = null;

export function getGmailOAuthManager(): GmailOAuthManager {
  if (!oauthManager) {
    oauthManager = new GmailOAuthManager();
  }
  return oauthManager;
}
