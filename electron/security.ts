import { app, session, type Session } from 'electron';
import { createLogger } from './services/utils/logger';

const logger = createLogger('security');

const DEFAULT_IFRAME_ALLOWLIST = [
  'tradingview.com',
  'www.youtube.com',
  'youtube.com',
  'player.vimeo.com',
  'calendar.google.com',
  'open.spotify.com',
];

function parseAllowlist(): string[] {
  const fromEnv = (process.env.IFRAME_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const merged = new Set([...DEFAULT_IFRAME_ALLOWLIST.map((d) => d.toLowerCase()), ...fromEnv]);
  return Array.from(merged);
}

const iframeHostAllowlist = parseAllowlist();

function isAllowlistedFrame(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return iframeHostAllowlist.some((domain) => {
      if (hostname === domain) return true;
      return hostname.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

function sanitizeHeaders(headers: Record<string, string | string[]>, name: string) {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name.toLowerCase()) {
      delete headers[key];
    }
  }
}

function buildContentSecurityPolicy(isDev: boolean): string {
  if (isDev) {
    const devServer = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    return [
      `default-src 'self' ${devServer}`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${devServer}`,
      `style-src 'self' 'unsafe-inline' ${devServer} https://fonts.googleapis.com`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https: ${devServer}`,
      `media-src 'self' blob: https:`,
      `frame-src 'self' https:`,
      `connect-src 'self' https: http: ws: wss: ${devServer}`,
      `worker-src 'self' blob: ${devServer}`,
      `frame-ancestors 'self'`,
    ].join('; ');
  }

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "frame-src 'self' https:",
    "connect-src 'self' https: http: ws: wss:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
  ].join('; ');
}

const configuredSessions = new WeakSet<Session>();

function configureSessionSecurity(ses: Session) {
  if (configuredSessions.has(ses)) {
    return;
  }
  configuredSessions.add(ses);

  ses.webRequest.onHeadersReceived((details, callback) => {
    const isDev = process.env.NODE_ENV === 'development';
    const headers = { ...details.responseHeaders } as Record<string, string | string[]>;

    const resourceType = details.resourceType;

    // Apply CSP for application frames
    if (details.url.startsWith('file://')) {
      headers['Content-Security-Policy'] = [buildContentSecurityPolicy(isDev)];
      headers['Cross-Origin-Opener-Policy'] = ['same-origin'];
      headers['Cross-Origin-Embedder-Policy'] = ['require-corp'];
    }

    // Relax X-Frame-Options / CSP for allowlisted hosts to enable embedding via iframe proxy
    if (resourceType === 'subFrame' && isAllowlistedFrame(details.url)) {
      sanitizeHeaders(headers, 'x-frame-options');
      sanitizeHeaders(headers, 'content-security-policy');
      logger.info('Relaxed frame headers for allowlisted host', { url: details.url });
    }

    callback({ responseHeaders: headers });
  });
}

export function applySecurityPolicies() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (e) => {
      e.preventDefault();
    });

    // Permission policy: deny-by-default with optional allow-list
    const ALLOW_MEDIA_ON = new Set<string>([
      // e.g., 'https://meet.example.com'
    ]);

    contents.session.setPermissionRequestHandler((wc, permission, cb) => {
      try {
        const url = wc?.getURL?.() || '';
        if (permission === 'media') {
          const allowed = Array.from(ALLOW_MEDIA_ON).some((origin) => url.startsWith(origin));
          cb(allowed);
          return;
        }
        cb(false);
      } catch {
        cb(false);
      }
    });

    contents.session.setPermissionCheckHandler((wc, permission) => {
      try {
        const url = wc?.getURL?.() || '';
        if (permission === 'media') {
          return Array.from(ALLOW_MEDIA_ON).some((origin) => url.startsWith(origin));
        }
        return false;
      } catch {
        return false;
      }
    });
  });

  // Deny-by-default permissions for all new sessions
  app.on('session-created', (ses) => {
    try {
      ses.setPermissionCheckHandler((_wc, _permission) => {
        return false; // Explicit allow-list elsewhere if needed
      });
      ses.setPermissionRequestHandler((_wc, _permission, cb) => {
        cb(false);
      });
    } catch {}
    configureSessionSecurity(ses);
  });

  configureSessionSecurity(session.defaultSession);
}


