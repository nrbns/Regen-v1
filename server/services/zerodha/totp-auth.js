/**
 * Zerodha TOTP 2FA Automation
 * Auto-generates TOTP codes using stored secret
 * Runs daily at 5:45 AM to refresh access token
 */

import { createHmac } from 'crypto';

/**
 * Generate TOTP code from secret (RFC 6238)
 * @param {string} secret - Base32 encoded TOTP secret
 * @returns {string} 6-digit TOTP code
 */
export function generateTOTP(secret) {
  // Decode base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32Chars.indexOf(secret[i].toUpperCase());
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }

  // Convert to buffer
  const secretBytes = Buffer.alloc(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i += 8) {
    secretBytes[i / 8] = parseInt(bits.substr(i, 8), 2);
  }

  // Get current time step (30 seconds)
  const timeStep = Math.floor(Date.now() / 1000 / 30);

  // Create HMAC-SHA1
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(timeStep, 4);

  const hmac = createHmac('sha1', secretBytes);
  hmac.update(timeBuffer);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Return 6-digit code
  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Login to Zerodha and get access token
 * @param {string} userId - Zerodha user ID
 * @param {string} password - Zerodha password
 * @param {string} totpSecret - Base32 TOTP secret
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresAt: number}>}
 */
export async function loginZerodha(userId, password, totpSecret) {
  const totp = generateTOTP(totpSecret);

  // Step 1: Request login session
  const sessionResponse = await fetch('https://kite.zerodha.com/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      user_id: userId,
      password: password,
    }),
  });

  if (!sessionResponse.ok) {
    throw new Error(`Login session failed: ${sessionResponse.statusText}`);
  }

  const sessionData = await sessionResponse.json();
  const requestId = sessionData.data?.request_id;

  if (!requestId) {
    throw new Error('Failed to get request_id from login session');
  }

  // Step 2: Validate TOTP
  const totpResponse = await fetch('https://kite.zerodha.com/api/twofa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      request_id: requestId,
      twofa_value: totp,
      user_id: userId,
    }),
  });

  if (!totpResponse.ok) {
    throw new Error(`TOTP validation failed: ${totpResponse.statusText}`);
  }

  const tokenData = await totpResponse.json();

  if (!tokenData.data?.access_token) {
    throw new Error('Failed to get access token');
  }

  // Calculate expiration (typically 24 hours)
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  return {
    accessToken: tokenData.data.access_token,
    refreshToken: tokenData.data.refresh_token || null,
    expiresAt,
    requestId,
  };
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token from login
 * @returns {Promise<{accessToken: string, expiresAt: number}>}
 */
export async function refreshZerodhaToken(refreshToken) {
  const response = await fetch('https://kite.zerodha.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.data?.access_token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

/**
 * Daily token refresh cron job
 * Runs at 5:45 AM every day
 */
export function setupDailyTokenRefresh(storeTokenCallback) {
  const scheduleRefresh = () => {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(5, 45, 0, 0); // 5:45 AM

    // If already past 5:45 AM today, schedule for tomorrow
    if (now > targetTime) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const msUntilRefresh = targetTime.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        // Get stored credentials
        const { ZERODHA_USER_ID, ZERODHA_PASSWORD, ZERODHA_TOTP_SECRET, ZERODHA_REFRESH_TOKEN } =
          process.env;

        if (ZERODHA_REFRESH_TOKEN) {
          // Try refresh token first
          const refreshed = await refreshZerodhaToken(ZERODHA_REFRESH_TOKEN);
          await storeTokenCallback(
            refreshed.accessToken,
            ZERODHA_REFRESH_TOKEN,
            refreshed.expiresAt
          );
          console.log('[Zerodha] Token refreshed successfully at', new Date().toISOString());
        } else if (ZERODHA_USER_ID && ZERODHA_PASSWORD && ZERODHA_TOTP_SECRET) {
          // Full login with TOTP
          const tokens = await loginZerodha(ZERODHA_USER_ID, ZERODHA_PASSWORD, ZERODHA_TOTP_SECRET);
          await storeTokenCallback(tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
          console.log('[Zerodha] Full login completed at', new Date().toISOString());
        } else {
          console.warn('[Zerodha] Missing credentials for daily refresh');
        }
      } catch (error) {
        console.error('[Zerodha] Daily token refresh failed:', error);
        // Retry in 1 hour if failed
        setTimeout(scheduleRefresh, 60 * 60 * 1000);
        return;
      }

      // Schedule next refresh (24 hours later)
      scheduleRefresh();
    }, msUntilRefresh);

    console.log(`[Zerodha] Daily refresh scheduled for ${targetTime.toISOString()}`);
  };

  // Start scheduling
  scheduleRefresh();
}
