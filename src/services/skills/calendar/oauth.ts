/**
 * Calendar OAuth Manager
 * Handles OAuth2 authentication with Google Calendar
 */

export class CalendarOAuthManager {
  private accessToken: string | null = null;
  private clientId: string = '';
  private clientSecret: string = '';
  private redirectUri: string = '';

  constructor(clientId: string = '', clientSecret: string = '', redirectUri: string = '') {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Start OAuth authorization flow
   */
  async authorize(): Promise<string> {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar');

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
   * Check if authorized
   */
  isAuthorized(): boolean {
    return this.accessToken !== null;
  }
}

let oauthManager: CalendarOAuthManager | null = null;

export function getCalendarOAuthManager(): CalendarOAuthManager {
  if (!oauthManager) {
    oauthManager = new CalendarOAuthManager();
  }
  return oauthManager;
}
