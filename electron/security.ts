import { app, session } from 'electron';

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
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = process.env.NODE_ENV === 'development';
    const vite = "http://localhost:5173";
    const csp = isDev
      ? `default-src 'self' ${vite}; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${vite}; style-src 'self' 'unsafe-inline' ${vite}; img-src 'self' data: blob: ${vite}; frame-src 'self' ${vite}; connect-src 'self' http: https: ws: wss: ${vite}`
      : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src 'self'; connect-src 'self' http: https: ws: wss:";

    const headers = {
      ...details.responseHeaders,
      'Content-Security-Policy': [csp]
    } as Record<string, string | string[]>;

    // COOP/COEP for local app assets (enables SAB/WASM when needed)
    try {
      const url = details.url || '';
      const isAppAsset = url.startsWith('file://');
      if (isAppAsset) {
        headers['Cross-Origin-Opener-Policy'] = ['same-origin'];
        headers['Cross-Origin-Embedder-Policy'] = ['require-corp'];
      }
    } catch {}

    callback({ responseHeaders: headers });
  });
}


