import { app, session } from 'electron';

export function applySecurityPolicies() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (e) => {
      e.preventDefault();
    });

    // Set up permission handlers for all sessions
    contents.session.setPermissionRequestHandler((_wc, perm, cb) => {
      // Allow media permissions for video playback
      if (perm === 'media' || perm === 'display-capture' || perm === 'notifications') {
        cb(true);
        return;
      }
      cb(false);
    });
    
    // Allow permission checks for media
    contents.session.setPermissionCheckHandler((_wc, permission, _origin) => {
      if (permission === 'media') {
        return true;
      }
      return false;
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

    callback({ responseHeaders: headers });
  });
}


